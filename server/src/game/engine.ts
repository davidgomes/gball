import type { 
  GameState, 
  Player, 
  Ball, 
  PlayerInput, 
  Vector2, 
  Stadium 
} from '../types/game.ts';
import { Physics } from '../utils/physics.ts';
import { StadiumConfig } from './stadium.ts';

export class GameEngine {
  private gameState: GameState;
  private stadium: Stadium;
  private lastUpdateTime: number;
  private readonly tickRate = 60; // 60 FPS
  private readonly deltaTime = 1000 / this.tickRate;

  constructor() {
    this.stadium = StadiumConfig.createClassicStadium();
    this.lastUpdateTime = Date.now();
    this.gameState = {
      players: new Map(),
      ball: this.createBall(),
      score: { red: 0, blue: 0 },
      gameTime: 0,
      matchDuration: 3 * 60 * 1000, // 3 minutes in milliseconds
      isMatchActive: false
    };
  }

  private createBall(): Ball {
    const spawnPos = StadiumConfig.getBallSpawnPosition();
    return {
      id: 'ball',
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: 18,
      friction: 0.985, // Reduced friction for better ball movement
      bounciness: 0.8
    };
  }

  addPlayer(playerId: string): Player {
    // All human players join red team
    const team = 'red';
    const teamCount = Array.from(this.gameState.players.values())
      .filter(p => p.team === team && !p.playerId.startsWith('ai_')).length;
    
    const spawnPos = StadiumConfig.getPlayerSpawnPosition(team, teamCount);
    
    const player: Player = {
      id: playerId,
      playerId,
      team,
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: 24, // Player radius
      maxSpeed: 450, // Updated as requested
      acceleration: 2000, // (remains at 40% higher)
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        kick: false
      }
    };

    this.gameState.players.set(playerId, player);
    
    // Balance AI team
    this.balanceAITeam();
    
    // Start match if we have at least 1 red player (AI will be added automatically)
    if (this.getRedPlayerCount() >= 1 && !this.gameState.isMatchActive) {
      this.startMatch();
    }

    return player;
  }

  removePlayer(playerId: string): void {
    this.gameState.players.delete(playerId);
    
    // If it was a human player, rebalance AI team
    if (!playerId.startsWith('ai_')) {
      this.balanceAITeam();
    }
    
    // Stop match if no red players left
    if (this.getRedPlayerCount() === 0) {
      this.gameState.isMatchActive = false;
    }
  }

  updatePlayerInput(playerId: string, input: PlayerInput): void {
    const player = this.gameState.players.get(playerId);
    if (player) {
      player.input = { ...input };
    }
  }

  update(): GameState {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;

    if (this.gameState.isMatchActive) {
      this.gameState.gameTime += deltaTime * 1000;
      
      // Check if match time is up
      if (this.gameState.gameTime >= this.gameState.matchDuration) {
        this.endMatch();
      }
    }

    // Update players
    for (const player of this.gameState.players.values()) {
      // Update AI behavior for blue team players
      if (player.team === 'blue' && player.playerId.startsWith('ai_')) {
        this.updateAIPlayer(player, deltaTime);
      }
      this.updatePlayer(player, deltaTime);
    }

    // Update ball
    this.updateBall(deltaTime);

    // Handle collisions
    this.handleCollisions();

    // Check for goals
    this.checkGoals();

    return { ...this.gameState };
  }

  private updatePlayer(player: Player, deltaTime: number): void {
    // Apply input acceleration
    const acceleration = { x: 0, y: 0 };
    
    if (player.input.left) acceleration.x -= player.acceleration;
    if (player.input.right) acceleration.x += player.acceleration;
    if (player.input.up) acceleration.y -= player.acceleration;
    if (player.input.down) acceleration.y += player.acceleration;

    // Apply acceleration to velocity
    const accelerationDelta = Physics.multiply(acceleration, deltaTime);
    player.velocity = Physics.add(player.velocity, accelerationDelta);

    // Limit max speed
    player.velocity = Physics.limit(player.velocity, player.maxSpeed);

    // Apply friction
    player.velocity = Physics.applyFriction(player.velocity, 0.1, deltaTime); // Fixed friction so players actually slow down

    // Update position
    const velocityDelta = Physics.multiply(player.velocity, deltaTime);
    player.position = Physics.add(player.position, velocityDelta);

    // Handle kicking
    if (player.input.kick && this.canPlayerKickBall(player)) {
      this.performKick(player);
    }
  }

  private updateBall(deltaTime: number): void {
    // Apply friction
    this.gameState.ball.velocity = Physics.applyFriction(
      this.gameState.ball.velocity, 
      this.gameState.ball.friction, 
      deltaTime
    );

    // Update position
    const velocityDelta = Physics.multiply(this.gameState.ball.velocity, deltaTime);
    this.gameState.ball.position = Physics.add(this.gameState.ball.position, velocityDelta);
  }

  private handleCollisions(): void {
    // Player-wall collisions
    for (const player of this.gameState.players.values()) {
      for (const wall of this.stadium.walls) {
        if (Physics.checkWallCollision(player, wall)) {
          Physics.resolveWallCollision(player, wall);
        }
      }
    }

    // Ball-wall collisions
    for (const wall of this.stadium.walls) {
      if (Physics.checkWallCollision(this.gameState.ball, wall)) {
        Physics.resolveWallCollision(this.gameState.ball, wall);
      }
    }

    // Player-ball collisions
    for (const player of this.gameState.players.values()) {
      if (Physics.checkCircleCollision(player, this.gameState.ball)) {
        Physics.resolveCircleCollision(player, this.gameState.ball);
      }
    }

    // Player-player collisions
    const players = Array.from(this.gameState.players.values());
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        if (Physics.checkCircleCollision(players[i], players[j])) {
          Physics.resolveCircleCollision(players[i], players[j]);
        }
      }
    }
  }

  private checkGoals(): void {
    const goalScored = StadiumConfig.isInGoal(this.gameState.ball.position, this.stadium);
    
    if (goalScored) {
      this.gameState.score[goalScored]++;
      this.resetBallAndPlayers();
      
      // Check for match end (first to 3 goals wins)
      if (this.gameState.score.red >= 3 || this.gameState.score.blue >= 3) {
        this.endMatch();
      }
    }
  }

  private canPlayerKickBall(player: Player): boolean {
    const distance = Physics.distance(player.position, this.gameState.ball.position);
    return distance <= (player.radius + this.gameState.ball.radius + 15); // Increased kick range for better control
  }

  private performKick(player: Player): void {
    const kickPower = 250; // Reduced for better control
    Physics.applyKick(player, this.gameState.ball, kickPower);
    console.log(`🦶 Player ${player.playerId.slice(-4)} kicked the ball!`);
  }



  private startMatch(): void {
    this.gameState.isMatchActive = true;
    this.gameState.gameTime = 0;
    this.gameState.score = { red: 0, blue: 0 };
    this.resetBallAndPlayers();
  }

  private endMatch(): void {
    this.gameState.isMatchActive = false;
  }

  private resetBallAndPlayers(): void {
    // Reset ball to center
    this.gameState.ball.position = StadiumConfig.getBallSpawnPosition();
    this.gameState.ball.velocity = { x: 0, y: 0 };

    // Reset players to spawn positions
    const players = Array.from(this.gameState.players.values());
    const redPlayers = players.filter(p => p.team === 'red');
    const bluePlayers = players.filter(p => p.team === 'blue');

    redPlayers.forEach((player, index) => {
      player.position = StadiumConfig.getPlayerSpawnPosition('red', index);
      player.velocity = { x: 0, y: 0 };
    });

    bluePlayers.forEach((player, index) => {
      player.position = StadiumConfig.getPlayerSpawnPosition('blue', index);
      player.velocity = { x: 0, y: 0 };
    });
  }

  // AI Team Management
  private getRedPlayerCount(): number {
    return Array.from(this.gameState.players.values())
      .filter(p => p.team === 'red' && !p.playerId.startsWith('ai_')).length;
  }

  private getBluePlayerCount(): number {
    return Array.from(this.gameState.players.values())
      .filter(p => p.team === 'blue' && p.playerId.startsWith('ai_')).length;
  }

  private balanceAITeam(): void {
    const redCount = this.getRedPlayerCount();
    const blueCount = this.getBluePlayerCount();

    if (redCount > blueCount) {
      // Add AI players to blue team
      for (let i = blueCount; i < redCount; i++) {
        this.addAIPlayer(i);
      }
    } else if (blueCount > redCount) {
      // Remove excess AI players
      const bluePlayersToRemove = Array.from(this.gameState.players.values())
        .filter(p => p.team === 'blue' && p.playerId.startsWith('ai_'))
        .slice(redCount);
      
      bluePlayersToRemove.forEach(player => {
        this.gameState.players.delete(player.playerId);
      });
    }
  }

  private addAIPlayer(index: number): void {
    const aiId = `ai_blue_${Date.now()}_${index}`;
    const spawnPos = StadiumConfig.getPlayerSpawnPosition('blue', index);
    
    // Assign roles based on player index - ALL ATTACKING ROLES
    const roles: ('midfielder' | 'attacker')[] = ['attacker', 'midfielder', 'attacker', 'attacker'];
    const role = roles[index % roles.length];
    
    const aiPlayer: Player = {
      id: aiId,
      playerId: aiId,
      team: 'blue',
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: 24,
      maxSpeed: 450,
      acceleration: 2000, // Higher acceleration for more responsive AI
      aiRole: role,
      aiCooldowns: {
        kick: 0,
        decision: 0
      },
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        kick: false
      }
    };

    this.gameState.players.set(aiId, aiPlayer);
    console.log(`🤖 AI ${role.charAt(0).toUpperCase() + role.slice(1)} #${index + 1} joined blue team (Speed: ${aiPlayer.maxSpeed})`);
  }

  private updateAIPlayer(aiPlayer: Player, deltaTime: number): void {
    if (!aiPlayer.aiCooldowns) {
      aiPlayer.aiCooldowns = { kick: 0, decision: 0 };
    }

    // Update cooldowns
    aiPlayer.aiCooldowns.kick = Math.max(0, aiPlayer.aiCooldowns.kick - deltaTime);

    // Reset all inputs
    aiPlayer.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      kick: false
    };

    const ball = this.gameState.ball;
    const distanceToBall = Physics.distance(aiPlayer.position, ball.position);
    
    // Make decisions immediately - no cooldown for responsiveness
    this.makeAggressiveAIDecision(aiPlayer, ball, distanceToBall);
  }

  private makeAggressiveAIDecision(aiPlayer: Player, ball: Ball, distanceToBall: number): void {
    const role = aiPlayer.aiRole || 'midfielder';
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    
    // Get all players for context
    const allPlayers = Array.from(this.gameState.players.values());
    const bluePlayers = allPlayers.filter(p => p.team === 'blue');
    const redPlayers = allPlayers.filter(p => p.team === 'red');
    
    // ALWAYS BE ATTACKING - no defensive play ever!
    const ballSpeed = Physics.magnitude(ball.velocity);
    const isMovingBall = ballSpeed > 30;
    
    // Find closest human to ball for interception
    const closestHumanToBall = redPlayers.reduce((closest, player) => {
      const dist = Physics.distance(player.position, ball.position);
      const closestDist = Physics.distance(closest.position, ball.position);
      return dist < closestDist ? player : closest;
    });
    
    // Determine AI's attack strategy
    let targetPosition: Vector2;
    let shouldKick = false;
    
    // Strategy 1: Direct ball pursuit - MULTIPLE AI CAN SWARM
    const isCloseEnoughToBall = distanceToBall < 200; // Allow multiple AI to pursue
    const isInTopTwoClosest = bluePlayers
      .map(ai => ({ ai, dist: Physics.distance(ai.position, ball.position) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2) // Top 2 closest
      .some(entry => entry.ai.playerId === aiPlayer.playerId);
    
    if (isCloseEnoughToBall || isInTopTwoClosest) { // SWARM THE BALL
      // GO FOR THE BALL AGGRESSIVELY
      if (isMovingBall) {
        // Intercept moving ball
        const timeToReach = distanceToBall / (aiPlayer.maxSpeed * 1.2);
        const predictedPos = Physics.add(ball.position, Physics.multiply(ball.velocity, timeToReach));
        targetPosition = this.clampToBounds(predictedPos);
      } else {
        // Ball is stationary - charge at it
        targetPosition = ball.position;
      }
      
      shouldKick = distanceToBall <= (aiPlayer.radius + ball.radius + 35);
      
    } else {
      // Strategy 2: Cut off humans and pressure them
      const humanToBallDistance = Physics.distance(closestHumanToBall.position, ball.position);
      
      if (humanToBallDistance < 150) { // Larger pressure zone
        // Human is close to ball - PRESSURE AND CUT OFF AGGRESSIVELY
        targetPosition = this.getInterceptionPosition(aiPlayer, closestHumanToBall, ball);
      } else {
        // Strategy 3: Aggressive positioning to control space
        targetPosition = this.getAggressivePositioning(aiPlayer, ball, bluePlayers, role);
      }
    }
    
    // AGGRESSIVE MOVEMENT - always attacking
    this.moveAggressivelyToTarget(aiPlayer, targetPosition);
    
    // QUICK KICKS when in range
    if (shouldKick && aiPlayer.aiCooldowns && aiPlayer.aiCooldowns.kick <= 0) {
      const kickDirection = this.getAgressiveKickDirection(aiPlayer, ball);
      if (kickDirection) {
        aiPlayer.input.kick = true;
        aiPlayer.aiCooldowns.kick = 0.15; // Very quick kicks
      }
    }
  }

  private getInterceptionPosition(aiPlayer: Player, targetHuman: Player, ball: Ball): Vector2 {
    // Predict where human is going and cut them off
    const humanVelocity = targetHuman.velocity;
    const humanSpeed = Physics.magnitude(humanVelocity);
    
    let interceptPoint: Vector2;
    
    if (humanSpeed > 20) {
      // Human is moving - predict their path and cut them off
      const timeToIntercept = Physics.distance(aiPlayer.position, targetHuman.position) / aiPlayer.maxSpeed;
      const humanFuturePos = Physics.add(targetHuman.position, Physics.multiply(humanVelocity, timeToIntercept));
      
      // Position between human's future position and ball
      interceptPoint = {
        x: (humanFuturePos.x + ball.position.x) * 0.6 + humanFuturePos.x * 0.4,
        y: (humanFuturePos.y + ball.position.y) * 0.6 + humanFuturePos.y * 0.4
      };
    } else {
      // Human is stationary - get between them and ball
      const humanToBall = Physics.subtract(ball.position, targetHuman.position);
      const interceptDistance = Math.min(60, Physics.magnitude(humanToBall) * 0.7);
      const interceptDirection = Physics.normalize(humanToBall);
      
      interceptPoint = Physics.add(targetHuman.position, Physics.multiply(interceptDirection, interceptDistance));
    }
    
    return this.clampToBounds(interceptPoint);
  }

  private getAggressivePositioning(aiPlayer: Player, ball: Ball, bluePlayers: Player[], role: string): Vector2 {
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    
    // Count how many AI are very close to ball
    const aiVeryCloseToBall = bluePlayers.filter(ai => 
      Physics.distance(ai.position, ball.position) < 60
    ).length;
    
    // Only spread if there are 3+ AI very close to ball (less spreading, more swarming)
    if (aiVeryCloseToBall >= 3 && Physics.distance(aiPlayer.position, ball.position) > 80) {
      const spreadAngle = (bluePlayers.indexOf(aiPlayer) / bluePlayers.length) * Math.PI * 1.5; // Smaller spread
      const spreadDistance = 50; // Closer spread
      
      const spreadX = ball.position.x + Math.cos(spreadAngle) * spreadDistance;
      const spreadY = ball.position.y + Math.sin(spreadAngle) * spreadDistance;
      
      // Strong bias toward attacking direction
      const biasedX = spreadX * 0.4 + (redGoal.x + 80) * 0.6;
      
      return this.clampToBounds({ x: biasedX, y: spreadY });
    }
    
    // Default: ALWAYS MOVE TOWARD BALL - no backing off
    const ballDirection = Physics.normalize(Physics.subtract(ball.position, aiPlayer.position));
    const aggressiveDistance = 30; // Always get very close
    
    return Physics.add(aiPlayer.position, Physics.multiply(ballDirection, aggressiveDistance));
  }



  private moveAggressivelyToTarget(aiPlayer: Player, targetPosition: Vector2): void {
    const direction = Physics.subtract(targetPosition, aiPlayer.position);
    const distance = Physics.magnitude(direction);
    
    // Always move unless extremely close (no stopping!)
    if (distance < 3) return;
    
    const normalizedDirection = Physics.normalize(direction);
    
    // Minimal obstacle avoidance - be more direct
    const avoidanceForce = this.getMinimalAvoidanceForce(aiPlayer);
    const finalDirection = Physics.normalize(Physics.add(
      Physics.multiply(normalizedDirection, 0.9), // More direct
      Physics.multiply(avoidanceForce, 0.1)       // Less avoidance
    ));
    
    // Convert to input with lower threshold for more responsive movement
    const threshold = 0.1;
    if (finalDirection.x < -threshold) aiPlayer.input.left = true;
    if (finalDirection.x > threshold) aiPlayer.input.right = true;
    if (finalDirection.y < -threshold) aiPlayer.input.up = true;
    if (finalDirection.y > threshold) aiPlayer.input.down = true;
    
    // Add small random movement if stuck (no clear direction)
    if (Math.abs(finalDirection.x) < threshold && Math.abs(finalDirection.y) < threshold && distance > 10) {
      const randomDirection = Math.random() * Math.PI * 2;
      const randomX = Math.cos(randomDirection);
      const randomY = Math.sin(randomDirection);
      
      if (Math.abs(randomX) > 0.5) {
        if (randomX > 0) aiPlayer.input.right = true;
        else aiPlayer.input.left = true;
      }
      if (Math.abs(randomY) > 0.5) {
        if (randomY > 0) aiPlayer.input.down = true;
        else aiPlayer.input.up = true;
      }
    }
  }

  private getMinimalAvoidanceForce(aiPlayer: Player): Vector2 {
    const avoidanceForce = { x: 0, y: 0 };
    const allPlayers = Array.from(this.gameState.players.values());
    
    for (const otherPlayer of allPlayers) {
      if (otherPlayer.playerId === aiPlayer.playerId) continue;
      
      const distance = Physics.distance(aiPlayer.position, otherPlayer.position);
      const avoidDistance = 25; // Smaller avoidance distance - be more aggressive
      
      if (distance < avoidDistance && distance > 0) {
        const repulsion = Physics.normalize(Physics.subtract(aiPlayer.position, otherPlayer.position));
        const strength = (avoidDistance - distance) / avoidDistance * 0.5; // Weaker avoidance
        avoidanceForce.x += repulsion.x * strength;
        avoidanceForce.y += repulsion.y * strength;
      }
    }
    
    return avoidanceForce;
  }

  private clampToBounds(position: Vector2): Vector2 {
    return {
      x: Math.max(-this.stadium.width / 2 + 30, Math.min(this.stadium.width / 2 - 30, position.x)),
      y: Math.max(-this.stadium.height / 2 + 30, Math.min(this.stadium.height / 2 - 30, position.y))
    };
  }



  private getAgressiveKickDirection(aiPlayer: Player, ball: Ball): Vector2 | null {
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    const role = aiPlayer.aiRole || 'midfielder';
    
    // Primary target is always toward the goal
    let targetDirection = Physics.normalize(Physics.subtract(redGoal, ball.position));
    
    // Role-based kick adjustments
    if (role === 'attacker') {
      // Attackers aim directly for goal with slight randomness for unpredictability
      const randomOffset = (Math.random() - 0.5) * 0.3;
      targetDirection.y += randomOffset;
      targetDirection = Physics.normalize(targetDirection);
    } else if (role === 'defender') {
      // Defenders clear more toward center field if too close to own goal
      if (aiPlayer.position.x > this.stadium.width / 4) {
        const centerClear = { x: -this.stadium.width / 4, y: ball.position.y * 0.5 };
        targetDirection = Physics.normalize(Physics.subtract(centerClear, ball.position));
      }
    }
    
    // Quick boundary check - but be less conservative
    const kickDistance = 300; // How far the ball might travel
    const predictedPos = Physics.add(ball.position, Physics.multiply(targetDirection, kickDistance));
    
    const margin = 40; // Smaller margin - be more aggressive
    const isOutOfBounds = 
      predictedPos.x < -this.stadium.width / 2 - margin ||
      predictedPos.x > this.stadium.width / 2 + margin ||
      predictedPos.y < -this.stadium.height / 2 - margin ||
      predictedPos.y > this.stadium.height / 2 + margin;
    
    if (isOutOfBounds) {
      // Simple fallback - kick toward center
      const centerDirection = Physics.normalize({ 
        x: -ball.position.x * 0.5, 
        y: -ball.position.y * 0.7 
      });
      return centerDirection;
    }
    
    return targetDirection;
  }



  getGameState(): GameState {
    return { ...this.gameState };
  }

  getStadium(): Stadium {
    return this.stadium;
  }
}