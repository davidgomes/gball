import { GameEngine } from './game/engine.ts';
import type { GameMessage, PlayerInput } from './types/game.ts';
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
    
    // Determine public directory path
    const publicDir = process.env.NODE_ENV === 'production' 
      ? join(process.cwd(), 'public')
      : join(process.cwd(), 'client', 'dist');
    
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
        
        const file = Bun.file(join(publicDir, pathname));
        const exists = await file.exists();
        
        if (exists) {
          return new Response(file);
        }
        
        // Fallback to index.html for client-side routing
        const indexFile = Bun.file(join(publicDir, 'index.html'));
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