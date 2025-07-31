import { WebSocketServer, WebSocket } from 'ws';
import { GameEngine } from './game/engine.ts';
import type { GameMessage, PlayerInput } from './types/game.ts';

class GameServer {
  private wss: WebSocketServer;
  private gameEngine: GameEngine;
  private clients: Map<string, WebSocket> = new Map();
  private gameLoop: Timer | null = null;
  private readonly tickRate = 60; // 60 FPS

  constructor(port: number = 8080) {
    this.gameEngine = new GameEngine();
    
    this.wss = new WebSocketServer({ 
      port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          threshold: 1024,
          concurrencyLimit: 10,
        },
        threshold: 1024,
      }
    });

    this.setupWebSocketServer();
    this.startGameLoop();
    
    console.log(`🏐 gball server running on ws://localhost:${port}`);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const playerId = this.generatePlayerId();
      const clientAddress = req.socket.remoteAddress;
      
      console.log(`🔗 Player ${playerId} connected from ${clientAddress}`);
      
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

      ws.on('message', (data: Buffer) => {
        try {
          const message: GameMessage = JSON.parse(data.toString());
          this.handleMessage(playerId, message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });

      ws.on('close', () => {
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
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for player ${playerId}:`, error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  private handleMessage(playerId: string, message: GameMessage): void {
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
    if (client && client.readyState === WebSocket.OPEN) {
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
      if (client.readyState === WebSocket.OPEN) {
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
      if (playerId !== excludePlayerId && client.readyState === WebSocket.OPEN) {
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
    
    this.wss.close();
    console.log('🛑 Game server stopped');
  }
}

// Start the server
const server = new GameServer(process.env.PORT ? parseInt(process.env.PORT) : 8090);

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