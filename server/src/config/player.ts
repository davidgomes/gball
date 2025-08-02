export interface PlayerPhysicsConfig {
  radius: number;
  maxSpeed: number;
  acceleration: number;
  friction: number;
}

export const PLAYER_PHYSICS: PlayerPhysicsConfig = {
  radius: 24,
  maxSpeed: 450,
  acceleration: 2000,
  friction: 0.1, // Player friction for slowing down
};

export const BALL_PHYSICS = {
  radius: 18,
  friction: 0.5, // Ball friction - higher than players
  bounciness: 0.8,
};

export const GAME_PHYSICS = {
  kickPower: 250,
  kickRange: 15, // Additional range beyond player + ball radius
};
