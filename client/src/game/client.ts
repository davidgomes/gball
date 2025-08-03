import type { 
  GameMessage, 
  GameState, 
  PlayerInput, 
  Player, 
  Stadium,
  SoundEvent
} from '../types/game.ts';

export class GameClient {
  private ws: WebSocket | null = null;
  private currentGameState: GameState | null = null;
  private currentPlayer: Player | null = null;
  private currentStadium: Stadium | null = null;
  private currentInput: PlayerInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    kick: false
  };
  
  private onGameStateUpdate?: (gameState: GameState) => void;
  private onPlayerJoin?: (player: Player) => void;
  private onConnectionEstablished?: (player: Player, gameState: GameState, stadium: Stadium) => void;
  private onConnectionLost?: () => void;
  private onSoundEvent?: (event: SoundEvent) => void;

  constructor() {
    this.setupInputHandlers();
  }

  connect(serverUrl: string): void {
    try {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        console.log('🔗 Connected to game server');
      };

      this.ws.onmessage = (event) => {
        try {
          const message: GameMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing server message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from game server');
        this.onConnectionLost?.();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to server:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(message: GameMessage): void {
    switch (message.type) {
      case 'join':
        if (message.playerId && message.data) {
          if (message.data.gameState && message.data.stadium) {
            // This is our initial connection
            this.currentPlayer = message.data.player;
            this.currentGameState = this.deserializeGameState(message.data.gameState);
            this.currentStadium = message.data.stadium;
            this.onConnectionEstablished?.(
              this.currentPlayer, 
              this.currentGameState, 
              this.currentStadium
            );
          } else {
            // Another player joined
            this.onPlayerJoin?.(message.data.player);
          }
        }
        break;

      case 'gameState':
        if (message.data) {
          this.currentGameState = this.deserializeGameState(message.data);
          this.onGameStateUpdate?.(this.currentGameState);
        }
        break;

      case 'leave':
        // Handle player leaving if needed
        break;

      case 'soundEvent':
        if (message.data) {
          this.onSoundEvent?.(message.data as SoundEvent);
        }
        break;

      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
        break;
    }
  }

  private deserializeGameState(data: any): GameState {
    // Convert players object to Map
    const players = new Map<string, Player>();
    if (data.players) {
      if (data.players instanceof Map) {
        data.players.forEach((player: Player, id: string) => {
          players.set(id, player);
        });
      } else {
        // Handle if server sends players as object
        Object.entries(data.players).forEach(([id, player]) => {
          players.set(id, player as Player);
        });
      }
    }

    return {
      ...data,
      players
    };
  }

  private setupInputHandlers(): void {
    const keys: { [key: string]: boolean } = {};

    window.addEventListener('keydown', (event) => {
      keys[event.code] = true;
      // Debug log for space bar
      if (event.code === 'Space') {
        console.log('🔽 Space key pressed');
      }
      this.updateInputFromKeys(keys);
      event.preventDefault();
    });

    window.addEventListener('keyup', (event) => {
      keys[event.code] = false;
      // Debug log for space bar
      if (event.code === 'Space') {
        console.log('🔼 Space key released');
      }
      this.updateInputFromKeys(keys);
      event.preventDefault();
    });

    // Prevent context menu on right click
    window.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }

  private updateInputFromKeys(keys: { [key: string]: boolean }): void {
    const newInput: PlayerInput = {
      up: keys['ArrowUp'] || keys['KeyW'] || false,
      down: keys['ArrowDown'] || keys['KeyS'] || false,
      left: keys['ArrowLeft'] || keys['KeyA'] || false,
      right: keys['ArrowRight'] || keys['KeyD'] || false,
      kick: keys['Space'] || false
    };

    // Only send input if it changed
    if (this.inputChanged(newInput)) {
      this.currentInput = { ...newInput };
      this.sendInput();
    }
  }

  private inputChanged(newInput: PlayerInput): boolean {
    return (
      newInput.up !== this.currentInput.up ||
      newInput.down !== this.currentInput.down ||
      newInput.left !== this.currentInput.left ||
      newInput.right !== this.currentInput.right ||
      newInput.kick !== this.currentInput.kick
    );
  }

  private sendInput(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: GameMessage = {
        type: 'input',
        data: this.currentInput,
        timestamp: Date.now()
      };

      // Debug log for kick input
      if (this.currentInput.kick) {
        console.log('🦶 Sending kick input to server');
      }

      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Error sending input:', error);
      }
    }
  }

  // Event handlers
  onGameState(callback: (gameState: GameState) => void): void {
    this.onGameStateUpdate = callback;
  }

  onConnection(callback: (player: Player, gameState: GameState, stadium: Stadium) => void): void {
    this.onConnectionEstablished = callback;
  }

  onDisconnection(callback: () => void): void {
    this.onConnectionLost = callback;
  }

  onSoundEvents(callback: (event: SoundEvent) => void): void {
    this.onSoundEvent = callback;
  }

  getCurrentPlayer(): Player | null {
    return this.currentPlayer;
  }

  getCurrentGameState(): GameState | null {
    return this.currentGameState;
  }

  getCurrentStadium(): Stadium | null {
    return this.currentStadium;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}