import { GameEngine } from './game/engine.ts';
import type { GameMessage, PlayerInput, SoundEvent } from './types/game.ts';
import { ServerWebSocket } from 'bun';
import { join } from 'path';

class GameServer {
  private gameEngine: GameEngine;
  private clients: Map<string, ServerWebSocket<{ playerId: string }>> = new Map();
  private gameLoop: Timer | null = null;
  private readonly tickRate = 60; // 60 FPS
  private server: any;

  constructor(port: number = 8080) {
    this.gameEngine = new GameEngine();
    
    // Set up sound event callback to broadcast to all clients
    this.gameEngine.setSoundEventCallback((event: SoundEvent) => {
      this.broadcast({
        type: 'soundEvent',
        data: event,
        timestamp: Date.now()
      });
    });
    
    // Determine public directory path
    // First check if we have a 'public' directory (production build)
    const productionDir = join(process.cwd(), 'public');
    const developmentDir = join(process.cwd(), 'client', 'dist');
    
    let publicDir = productionDir;
    
    // Check which directory exists using Bun.file
    const checkDir = (dir: string) => {
      try {
        // Check if index.html exists in the directory
        const indexPath = join(dir, 'index.html');
        return Bun.file(indexPath).size > 0;
      } catch {
        return false;
      }
    };
    
    if (checkDir(productionDir)) {
      publicDir = productionDir;
      console.log(`✅ Using production directory: ${productionDir}`);
    } else if (checkDir(developmentDir)) {
      publicDir = developmentDir;
      console.log(`✅ Using development directory: ${developmentDir}`);
    } else {
      console.error(`❌ Neither ${productionDir} nor ${developmentDir} contain index.html!`);
      console.log(`📁 Current working directory: ${process.cwd()}`);
    }
    
    console.log(`🗂️  Serving static files from: ${publicDir}`);
    console.log(`🌍 Environment: NODE_ENV=${process.env.NODE_ENV}`);
    

    
    // Create Bun HTTP/WebSocket server
    this.server = Bun.serve({
      port,
      
      // Handle HTTP requests
      async fetch(req, server) {
        const url = new URL(req.url);
        
        // WebSocket upgrade
        if (url.pathname === '/ws') {
          const success = server.upgrade(req, {
            data: { playerId: '' }
          });
          return success 
            ? undefined 
            : new Response('WebSocket upgrade failed', { status: 400 });
        }
        
        // Serve static files
        let pathname = url.pathname;
        if (pathname === '/') pathname = '/index.html';
        
        const filePath = join(publicDir, pathname);
        const file = Bun.file(filePath);
        const exists = await file.exists();
        
        if (exists) {
          return new Response(file);
        }
        
        // Fallback to index.html for client-side routing
        const indexPath = join(publicDir, 'index.html');
        const indexFile = Bun.file(indexPath);
        const indexExists = await indexFile.exists();
        
        if (!indexExists) {
          console.error(`❌ index.html not found at: ${indexPath}`);
          return new Response(`index.html not found at: ${indexPath}`, { status: 404 });
        }
        
        return new Response(indexFile);
      },
      
      // WebSocket handlers
      websocket: {
        open: (ws) => this.handleConnection(ws),
        message: (ws, message) => this.handleMessage(ws.data.playerId, message),
        close: (ws) => this.handleDisconnection(ws),
        error: (ws, error) => console.error(`❌ WebSocket error for player ${ws.data.playerId}:`, error),
      },
    });

    this.startGameLoop();
    console.log(`🏐 gball server running on http://localhost:${port}`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/ws`);
  }

  private handleConnection(ws: ServerWebSocket<{ playerId: string }>): void {
    const playerId = this.generatePlayerId();
    ws.data.playerId = playerId;
    
    console.log(`🔗 Player ${playerId} connected`);
    
    this.clients.set(playerId, ws);
    
    // Add player to game
    const player = this.gameEngine.addPlayer(playerId);
    
    // Send initial game state to the new player
    const initialGameState = this.gameEngine.getGameState();
    const serializedInitialGameState = {
      ...initialGameState,
      players: Object.fromEntries(initialGameState.players)
    };
    
    this.sendToClient(playerId, {
      type: 'join',
      playerId,
      data: {
        player,
        gameState: serializedInitialGameState,
        stadium: this.gameEngine.getStadium()
      },
      timestamp: Date.now()
    });

    // Notify other players
    this.broadcastToOthers(playerId, {
      type: 'join',
      playerId,
      data: { player },
      timestamp: Date.now()
    });
  }

  private handleDisconnection(ws: ServerWebSocket<{ playerId: string }>): void {
    const playerId = ws.data.playerId;
    console.log(`🔌 Player ${playerId} disconnected`);
    this.clients.delete(playerId);
    this.gameEngine.removePlayer(playerId);
    
    // Notify other players
    this.broadcastToOthers(playerId, {
      type: 'leave',
      playerId,
      data: null,
      timestamp: Date.now()
    });
  }

  private handleMessage(playerId: string, data: string | Buffer): void {
    try {
      const message: GameMessage = JSON.parse(data.toString());
      this.processMessage(playerId, message);
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  }

  private processMessage(playerId: string, message: GameMessage): void {
    switch (message.type) {
      case 'input':
        if (message.data && this.isValidInput(message.data)) {
          this.gameEngine.updatePlayerInput(playerId, message.data as PlayerInput);
        }
        break;
      
      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
        break;
    }
  }

  private isValidInput(input: any): boolean {
    return (
      typeof input === 'object' &&
      typeof input.up === 'boolean' &&
      typeof input.down === 'boolean' &&
      typeof input.left === 'boolean' &&
      typeof input.right === 'boolean' &&
      typeof input.kick === 'boolean'
    );
  }

  private startGameLoop(): void {
    this.gameLoop = setInterval(() => {
      // Update game state
      const gameState = this.gameEngine.update();
      
      // Convert Map to object for JSON serialization
      const serializedGameState = {
        ...gameState,
        players: Object.fromEntries(gameState.players)
      };
      
      // Broadcast game state to all clients
      const message: GameMessage = {
        type: 'gameState',
        data: serializedGameState,
        timestamp: Date.now()
      };

      this.broadcast(message);
    }, 1000 / this.tickRate);
  }

  private sendToClient(playerId: string, message: GameMessage): void {
    const client = this.clients.get(playerId);
    if (client && client.readyState === 1) { // 1 = OPEN
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Error sending message to ${playerId}:`, error);
      }
    }
  }

  private broadcast(message: GameMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const [playerId, client] of this.clients) {
      if (client.readyState === 1) { // 1 = OPEN
        try {
          client.send(messageStr);
        } catch (error) {
          console.error(`❌ Error broadcasting to ${playerId}:`, error);
        }
      }
    }
  }

  private broadcastToOthers(excludePlayerId: string, message: GameMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const [playerId, client] of this.clients) {
      if (playerId !== excludePlayerId && client.readyState === 1) { // 1 = OPEN
        try {
          client.send(messageStr);
        } catch (error) {
          console.error(`❌ Error broadcasting to ${playerId}:`, error);
        }
      }
    }
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  stop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    
    this.server.stop();
    console.log('🛑 Game server stopped');
  }
}

// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const server = new GameServer(port);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.stop();
  process.exit(0);
});