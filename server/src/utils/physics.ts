import type { Vector2, GameEntity, Wall } from '../types/game.ts';

export class Physics {
  static add(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static subtract(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static multiply(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
  }

  static magnitude(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  static normalize(v: Vector2): Vector2 {
    const mag = this.magnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  }

  static distance(a: Vector2, b: Vector2): number {
    return this.magnitude(this.subtract(a, b));
  }

  static limit(v: Vector2, max: number): Vector2 {
    const mag = this.magnitude(v);
    if (mag > max) {
      return this.multiply(this.normalize(v), max);
    }
    return v;
  }

  static applyFriction(velocity: Vector2, friction: number, deltaTime: number): Vector2 {
    const frictionForce = Math.pow(friction, deltaTime);
    return this.multiply(velocity, frictionForce);
  }

  // Check collision between two circular entities
  static checkCircleCollision(a: GameEntity, b: GameEntity): boolean {
    const distance = this.distance(a.position, b.position);
    return distance < (a.radius + b.radius);
  }

  // Resolve collision between two circular entities
  static resolveCircleCollision(a: GameEntity, b: GameEntity): void {
    const distance = this.distance(a.position, b.position);
    const minDistance = a.radius + b.radius;
    
    if (distance < minDistance) {
      const overlap = minDistance - distance;
      const direction = this.normalize(this.subtract(b.position, a.position));
      
      if (distance === 0) {
        // Handle edge case where entities are at exact same position
        direction.x = 1;
        direction.y = 0;
      }

      // Separate entities
      const separation = this.multiply(direction, overlap * 0.5);
      a.position = this.subtract(a.position, separation);
      b.position = this.add(b.position, separation);

      // Exchange velocities along collision normal
      const relativeVelocity = this.subtract(b.velocity, a.velocity);
      const velocityAlongNormal = this.dot(relativeVelocity, direction);

      if (velocityAlongNormal > 0) return; // Objects separating

      const restitution = 0.8; // Bounciness
      const impulse = -(1 + restitution) * velocityAlongNormal;
      const impulseVector = this.multiply(direction, impulse);

      a.velocity = this.subtract(a.velocity, this.multiply(impulseVector, 0.5));
      b.velocity = this.add(b.velocity, this.multiply(impulseVector, 0.5));
    }
  }

  // Check collision with wall
  static checkWallCollision(entity: GameEntity, wall: Wall): boolean {
    const closestPoint = this.getClosestPointOnWall(entity.position, wall);
    const distance = this.distance(entity.position, closestPoint);
    return distance < entity.radius;
  }

  // Resolve collision with wall
  static resolveWallCollision(entity: GameEntity, wall: Wall): void {
    const closestPoint = this.getClosestPointOnWall(entity.position, wall);
    const distance = this.distance(entity.position, closestPoint);
    
    if (distance < entity.radius) {
      const overlap = entity.radius - distance;
      const direction = this.normalize(this.subtract(entity.position, closestPoint));
      
      // Move entity out of wall
      entity.position = this.add(entity.position, this.multiply(direction, overlap));
      
      // Reflect velocity
      const velocityAlongNormal = this.dot(entity.velocity, wall.normal);
      if (velocityAlongNormal < 0) {
        const reflection = this.multiply(wall.normal, velocityAlongNormal * 2);
        entity.velocity = this.subtract(entity.velocity, reflection);
        entity.velocity = this.multiply(entity.velocity, 0.8); // Some energy loss
      }
    }
  }

  private static getClosestPointOnWall(point: Vector2, wall: Wall): Vector2 {
    const wallVector = this.subtract(wall.end, wall.start);
    const pointVector = this.subtract(point, wall.start);
    
    const wallLength = this.magnitude(wallVector);
    if (wallLength === 0) return wall.start;
    
    const normalizedWall = this.normalize(wallVector);
    const projection = this.dot(pointVector, normalizedWall);
    
    const t = Math.max(0, Math.min(wallLength, projection));
    return this.add(wall.start, this.multiply(normalizedWall, t));
  }

  // Apply kick to ball from player
  static applyKick(player: GameEntity, ball: GameEntity, kickPower: number): void {
    const direction = this.normalize(this.subtract(ball.position, player.position));
    const kickForce = this.multiply(direction, kickPower);
    ball.velocity = this.add(ball.velocity, kickForce);
  }
}