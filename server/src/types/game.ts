export interface Vector2 {
  x: number;
  y: number;
}

export interface GameEntity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
}

export interface Player extends GameEntity {
  playerId: string;
  team: 'red' | 'blue';
  input: PlayerInput;
  maxSpeed: number;
  acceleration: number;
  aiRole?: 'midfielder' | 'attacker';
  aiCooldowns?: {
    kick: number;
    decision: number;
  };
}

export interface Ball extends GameEntity {
  friction: number;
  bounciness: number;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  kick: boolean;
}

export interface GameState {
  players: Map<string, Player>;
  ball: Ball;
  score: {
    red: number;
    blue: number;
  };
  gameTime: number;
  matchDuration: number;
  isMatchActive: boolean;
}

export interface Stadium {
  width: number;
  height: number;
  goalWidth: number;
  goalDepth: number;
  walls: Wall[];
}

export interface Wall {
  start: Vector2;
  end: Vector2;
  normal: Vector2;
}

export type MessageType = 
  | 'join'
  | 'leave'
  | 'input'
  | 'gameState'
  | 'goal'
  | 'matchEnd';

export interface GameMessage {
  type: MessageType;
  playerId?: string;
  data?: any;
  timestamp: number;
}