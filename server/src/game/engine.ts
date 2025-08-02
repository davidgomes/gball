import type {
  GameState,
  Player,
  Ball,
  PlayerInput,
  Vector2,
  Stadium,
} from "../types/game.ts";
import { Physics } from "../utils/physics.ts";
import { StadiumConfig } from "./stadium.ts";
import {
  PLAYER_PHYSICS,
  BALL_PHYSICS,
  GAME_PHYSICS,
} from "../config/player.ts";

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
      isMatchActive: false,
    };
  }

  private createBall(): Ball {
    const spawnPos = StadiumConfig.getBallSpawnPosition();
    return {
      id: "ball",
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: BALL_PHYSICS.radius,
      friction: BALL_PHYSICS.friction,
      bounciness: BALL_PHYSICS.bounciness,
    };
  }

  addPlayer(playerId: string): Player {
    // All human players join red team
    const team = "red";
    const teamCount = Array.from(this.gameState.players.values()).filter(
      (p) => p.team === team && !p.playerId.startsWith("ai_")
    ).length;

    const spawnPos = StadiumConfig.getPlayerSpawnPosition(team, teamCount);

    const player: Player = {
      id: playerId,
      playerId,
      team,
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: PLAYER_PHYSICS.radius,
      maxSpeed: PLAYER_PHYSICS.maxSpeed,
      acceleration: PLAYER_PHYSICS.acceleration,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        kick: false,
      },
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
    if (!playerId.startsWith("ai_")) {
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
      if (player.team === "blue" && player.playerId.startsWith("ai_")) {
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
    player.velocity = Physics.applyFriction(
      player.velocity,
      PLAYER_PHYSICS.friction,
      deltaTime
    );

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
    const velocityDelta = Physics.multiply(
      this.gameState.ball.velocity,
      deltaTime
    );
    this.gameState.ball.position = Physics.add(
      this.gameState.ball.position,
      velocityDelta
    );
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
    const goalScored = StadiumConfig.isInGoal(
      this.gameState.ball.position,
      this.stadium
    );

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
    const distance = Physics.distance(
      player.position,
      this.gameState.ball.position
    );
    return (
      distance <=
      player.radius + this.gameState.ball.radius + GAME_PHYSICS.kickRange
    );
  }

  private performKick(player: Player): void {
    Physics.applyKick(player, this.gameState.ball, GAME_PHYSICS.kickPower);
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
    const redPlayers = players.filter((p) => p.team === "red");
    const bluePlayers = players.filter((p) => p.team === "blue");

    redPlayers.forEach((player, index) => {
      player.position = StadiumConfig.getPlayerSpawnPosition("red", index);
      player.velocity = { x: 0, y: 0 };
    });

    bluePlayers.forEach((player, index) => {
      player.position = StadiumConfig.getPlayerSpawnPosition("blue", index);
      player.velocity = { x: 0, y: 0 };
    });
  }

  // AI Team Management
  private getRedPlayerCount(): number {
    return Array.from(this.gameState.players.values()).filter(
      (p) => p.team === "red" && !p.playerId.startsWith("ai_")
    ).length;
  }

  private getBluePlayerCount(): number {
    return Array.from(this.gameState.players.values()).filter(
      (p) => p.team === "blue" && p.playerId.startsWith("ai_")
    ).length;
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
        .filter((p) => p.team === "blue" && p.playerId.startsWith("ai_"))
        .slice(redCount);

      bluePlayersToRemove.forEach((player) => {
        this.gameState.players.delete(player.playerId);
      });
    }
  }

  private addAIPlayer(index: number): void {
    const aiId = `ai_blue_${Date.now()}_${index}`;
    const spawnPos = StadiumConfig.getPlayerSpawnPosition("blue", index);

    // Assign roles based on player index - ALL ATTACKING ROLES
    const roles: ("midfielder" | "attacker")[] = [
      "attacker",
      "midfielder",
      "attacker",
      "attacker",
    ];
    const role = roles[index % roles.length];

    const aiPlayer: Player = {
      id: aiId,
      playerId: aiId,
      team: "blue",
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: PLAYER_PHYSICS.radius,
      maxSpeed: PLAYER_PHYSICS.maxSpeed,
      acceleration: PLAYER_PHYSICS.acceleration,
      aiRole: role,
      aiCooldowns: {
        kick: 0,
        decision: 0,
      },
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        kick: false,
      },
    };

    this.gameState.players.set(aiId, aiPlayer);
    console.log(
      `🤖 AI ${role.charAt(0).toUpperCase() + role.slice(1)} #${
        index + 1
      } joined blue team (Speed: ${aiPlayer.maxSpeed})`
    );
  }

  private updateAIPlayer(aiPlayer: Player, deltaTime: number): void {
    if (!aiPlayer.aiCooldowns) {
      aiPlayer.aiCooldowns = { kick: 0, decision: 0 };
    }

    // Update cooldowns
    aiPlayer.aiCooldowns.kick = Math.max(
      0,
      aiPlayer.aiCooldowns.kick - deltaTime
    );

    // Reset all inputs
    aiPlayer.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      kick: false,
    };

    const ball = this.gameState.ball;
    const distanceToBall = Physics.distance(aiPlayer.position, ball.position);

    // Make decisions immediately - no cooldown for responsiveness
    this.makeAggressiveAIDecision(aiPlayer, ball, distanceToBall);
  }

  private makeAggressiveAIDecision(
    aiPlayer: Player,
    ball: Ball,
    distanceToBall: number
  ): void {
    const role = aiPlayer.aiRole || "midfielder";
    const redGoal = { x: -this.stadium.width / 2, y: 0 };

    // Get all players for context
    const allPlayers = Array.from(this.gameState.players.values());
    const bluePlayers = allPlayers.filter((p) => p.team === "blue");
    const redPlayers = allPlayers.filter((p) => p.team === "red");

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
      .map((ai) => ({ ai, dist: Physics.distance(ai.position, ball.position) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2) // Top 2 closest
      .some((entry) => entry.ai.playerId === aiPlayer.playerId);

    if (isCloseEnoughToBall || isInTopTwoClosest) {
      // SWARM THE BALL
      // GO FOR THE BALL AGGRESSIVELY
      if (isMovingBall) {
        // Intercept moving ball
        const timeToReach = distanceToBall / (aiPlayer.maxSpeed * 1.2);
        const predictedPos = Physics.add(
          ball.position,
          Physics.multiply(ball.velocity, timeToReach)
        );
        targetPosition = this.clampToBounds(predictedPos);
      } else {
        // Ball is stationary - charge at it
        targetPosition = ball.position;
      }

      // More aggressive kick range, especially in good scoring positions
      const baseKickRange =
        aiPlayer.radius + ball.radius + GAME_PHYSICS.kickRange;
      const extendedKickRange = this.isGoodScoringPosition(ball.position)
        ? baseKickRange + 20
        : baseKickRange + 10;
      shouldKick = distanceToBall <= extendedKickRange;
    } else {
      // Strategy 2: Cut off humans and pressure them
      const humanToBallDistance = Physics.distance(
        closestHumanToBall.position,
        ball.position
      );

      if (humanToBallDistance < 150) {
        // Larger pressure zone
        // Human is close to ball - PRESSURE AND CUT OFF AGGRESSIVELY
        targetPosition = this.getInterceptionPosition(
          aiPlayer,
          closestHumanToBall,
          ball
        );
      } else {
        // Strategy 3: Aggressive positioning to control space
        targetPosition = this.getAggressivePositioning(
          aiPlayer,
          ball,
          bluePlayers,
          role
        );
      }
    }

    // AGGRESSIVE MOVEMENT - always attacking
    this.moveAggressivelyToTarget(aiPlayer, targetPosition);

    // SMART KICKS - prioritize shooting when in good position
    if (shouldKick && aiPlayer.aiCooldowns && aiPlayer.aiCooldowns.kick <= 0) {
      const kickDirection = this.getAgressiveKickDirection(aiPlayer, ball);
      if (kickDirection) {
        // Check if this is a good scoring opportunity
        const isGoodScoringPosition = this.isGoodScoringPosition(ball.position);

        aiPlayer.input.kick = true;
        // Faster kicks for scoring opportunities, slightly slower for general play
        aiPlayer.aiCooldowns.kick = isGoodScoringPosition ? 0.1 : 0.15;
      }
    }
  }

  private getInterceptionPosition(
    aiPlayer: Player,
    targetHuman: Player,
    ball: Ball
  ): Vector2 {
    // Predict where human is going and cut them off
    const humanVelocity = targetHuman.velocity;
    const humanSpeed = Physics.magnitude(humanVelocity);

    let interceptPoint: Vector2;

    if (humanSpeed > 20) {
      // Human is moving - predict their path and cut them off
      const timeToIntercept =
        Physics.distance(aiPlayer.position, targetHuman.position) /
        aiPlayer.maxSpeed;
      const humanFuturePos = Physics.add(
        targetHuman.position,
        Physics.multiply(humanVelocity, timeToIntercept)
      );

      // Position between human's future position and ball
      interceptPoint = {
        x: (humanFuturePos.x + ball.position.x) * 0.6 + humanFuturePos.x * 0.4,
        y: (humanFuturePos.y + ball.position.y) * 0.6 + humanFuturePos.y * 0.4,
      };
    } else {
      // Human is stationary - get between them and ball
      const humanToBall = Physics.subtract(ball.position, targetHuman.position);
      const interceptDistance = Math.min(
        60,
        Physics.magnitude(humanToBall) * 0.7
      );
      const interceptDirection = Physics.normalize(humanToBall);

      interceptPoint = Physics.add(
        targetHuman.position,
        Physics.multiply(interceptDirection, interceptDistance)
      );
    }

    return this.clampToBounds(interceptPoint);
  }

  private getAggressivePositioning(
    aiPlayer: Player,
    ball: Ball,
    bluePlayers: Player[],
    role: string
  ): Vector2 {
    const redGoal = { x: -this.stadium.width / 2, y: 0 };

    // Count how many AI are very close to ball
    const aiVeryCloseToBall = bluePlayers.filter(
      (ai) => Physics.distance(ai.position, ball.position) < 60
    ).length;

    // Strategic positioning based on field situation
    const ballToGoal = Physics.subtract(redGoal, ball.position);
    const distanceBallToGoal = Physics.magnitude(ballToGoal);

    // If ball is in good scoring position, prioritize getting to ball
    if (this.isGoodScoringPosition(ball.position)) {
      // In scoring position - swarm the ball more aggressively
      const directToBall = Physics.normalize(
        Physics.subtract(ball.position, aiPlayer.position)
      );
      return Physics.add(aiPlayer.position, Physics.multiply(directToBall, 40));
    }

    // Spread positioning only when 3+ AI are swarming and we're not in scoring position
    if (
      aiVeryCloseToBall >= 3 &&
      Physics.distance(aiPlayer.position, ball.position) > 80
    ) {
      // Position to support attack - create passing lanes and pressure points
      const playerIndex = bluePlayers.indexOf(aiPlayer);
      const totalAI = bluePlayers.length;

      if (role === "attacker" || playerIndex === 0) {
        // Primary attacker - position to receive pass or pressure goal area
        const attackingSpot = {
          x: ball.position.x - 60, // Stay ahead of ball towards goal
          y: ball.position.y + (playerIndex % 2 === 0 ? -40 : 40), // Spread vertically
        };
        return this.clampToBounds(attackingSpot);
      } else {
        // Supporting players - create triangle formation around ball
        const supportAngle =
          (playerIndex / totalAI) * Math.PI * 1.2 + Math.PI / 4;
        const supportDistance = 70;

        const supportX =
          ball.position.x + Math.cos(supportAngle) * supportDistance;
        const supportY =
          ball.position.y + Math.sin(supportAngle) * supportDistance;

        // Bias towards goal direction
        const biasedX = supportX * 0.6 + (redGoal.x + 100) * 0.4;

        return this.clampToBounds({ x: biasedX, y: supportY });
      }
    }

    // Default aggressive positioning - go for ball with slight role-based variance
    let targetOffset = 30;
    let directionToTarget = Physics.normalize(
      Physics.subtract(ball.position, aiPlayer.position)
    );

    if (role === "attacker") {
      // Attackers get closer and more direct
      targetOffset = 25;
    } else if (role === "midfielder") {
      // Midfielders position slightly behind for second chance
      targetOffset = 35;
      // Add slight bias towards center for better field coverage
      directionToTarget.y *= 0.8;
      directionToTarget = Physics.normalize(directionToTarget);
    }

    return Physics.add(
      aiPlayer.position,
      Physics.multiply(directionToTarget, targetOffset)
    );
  }

  private moveAggressivelyToTarget(
    aiPlayer: Player,
    targetPosition: Vector2
  ): void {
    const direction = Physics.subtract(targetPosition, aiPlayer.position);
    const distance = Physics.magnitude(direction);

    // Always move unless extremely close (no stopping!)
    if (distance < 3) return;

    const normalizedDirection = Physics.normalize(direction);

    // Minimal obstacle avoidance - be more direct
    const avoidanceForce = this.getMinimalAvoidanceForce(aiPlayer);
    const finalDirection = Physics.normalize(
      Physics.add(
        Physics.multiply(normalizedDirection, 0.9), // More direct
        Physics.multiply(avoidanceForce, 0.1) // Less avoidance
      )
    );

    // Convert to input with lower threshold for more responsive movement
    const threshold = 0.1;
    if (finalDirection.x < -threshold) aiPlayer.input.left = true;
    if (finalDirection.x > threshold) aiPlayer.input.right = true;
    if (finalDirection.y < -threshold) aiPlayer.input.up = true;
    if (finalDirection.y > threshold) aiPlayer.input.down = true;

    // Add small random movement if stuck (no clear direction)
    if (
      Math.abs(finalDirection.x) < threshold &&
      Math.abs(finalDirection.y) < threshold &&
      distance > 10
    ) {
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

      const distance = Physics.distance(
        aiPlayer.position,
        otherPlayer.position
      );
      const avoidDistance = 25; // Smaller avoidance distance - be more aggressive

      if (distance < avoidDistance && distance > 0) {
        const repulsion = Physics.normalize(
          Physics.subtract(aiPlayer.position, otherPlayer.position)
        );
        const strength = ((avoidDistance - distance) / avoidDistance) * 0.5; // Weaker avoidance
        avoidanceForce.x += repulsion.x * strength;
        avoidanceForce.y += repulsion.y * strength;
      }
    }

    return avoidanceForce;
  }

  private clampToBounds(position: Vector2): Vector2 {
    return {
      x: Math.max(
        -this.stadium.width / 2 + 30,
        Math.min(this.stadium.width / 2 - 30, position.x)
      ),
      y: Math.max(
        -this.stadium.height / 2 + 30,
        Math.min(this.stadium.height / 2 - 30, position.y)
      ),
    };
  }

  private getAgressiveKickDirection(
    aiPlayer: Player,
    ball: Ball
  ): Vector2 | null {
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    const goalWidth = this.stadium.goalWidth;

    // Define goal target area (slightly inside the goal posts for better accuracy)
    const goalTop = { x: redGoal.x, y: -goalWidth / 2 + 20 };
    const goalBottom = { x: redGoal.x, y: goalWidth / 2 - 20 };
    const goalCenter = redGoal;

    // 1. Try direct shot to goal first
    const directShotTargets = [goalCenter, goalTop, goalBottom];
    for (const target of directShotTargets) {
      const direction = Physics.normalize(
        Physics.subtract(target, ball.position)
      );
      if (this.isValidKickDirection(ball.position, direction, 400)) {
        // Bias towards goal center for better scoring chances
        if (target === goalCenter) {
          return direction;
        }
        // Add small randomness to corner shots for unpredictability
        const randomOffset = (Math.random() - 0.5) * 0.2;
        return Physics.normalize({
          x: direction.x + randomOffset * 0.3,
          y: direction.y + randomOffset,
        });
      }
    }

    // 2. Try wall bounce shots to goal
    const bounceShot = this.calculateWallBounceToGoal(ball.position, redGoal);
    if (
      bounceShot &&
      this.isValidKickDirection(ball.position, bounceShot, 350)
    ) {
      return bounceShot;
    }

    // 3. Progressive towards goal - move ball closer to goal even if can't score directly
    let progressDirection = Physics.normalize(
      Physics.subtract(redGoal, ball.position)
    );

    // If direct progress is blocked, try angled progress
    if (!this.isValidKickDirection(ball.position, progressDirection, 200)) {
      // Try angled approaches - up and down relative to direct path
      const angle = Math.atan2(progressDirection.y, progressDirection.x);
      const angleOffsets = [
        Math.PI / 6,
        -Math.PI / 6,
        Math.PI / 4,
        -Math.PI / 4,
      ]; // 30°, 45° angles

      for (const offset of angleOffsets) {
        const newAngle = angle + offset;
        const angledDirection = {
          x: Math.cos(newAngle),
          y: Math.sin(newAngle),
        };
        if (this.isValidKickDirection(ball.position, angledDirection, 200)) {
          return angledDirection;
        }
      }
    }

    // 4. If still no good direction, try to move away from own goal at least
    if (ball.position.x > 0) {
      // Ball is on blue team's side
      progressDirection = { x: -1, y: 0 }; // Always kick towards red goal side
      if (this.isValidKickDirection(ball.position, progressDirection, 150)) {
        return progressDirection;
      }
    }

    // 5. Last resort - any forward direction that doesn't go backwards
    const forwardDirections = [
      { x: -0.8, y: -0.6 }, // Forward-up
      { x: -0.8, y: 0.6 }, // Forward-down
      { x: -1, y: 0 }, // Straight forward
      { x: -0.6, y: -0.8 }, // Diagonal up
      { x: -0.6, y: 0.8 }, // Diagonal down
    ];

    for (const direction of forwardDirections) {
      const normalized = Physics.normalize(direction);
      if (this.isValidKickDirection(ball.position, normalized, 100)) {
        return normalized;
      }
    }

    // Final fallback - towards center field
    return Physics.normalize({
      x: -ball.position.x,
      y: -ball.position.y * 0.5,
    });
  }

  private isValidKickDirection(
    ballPos: Vector2,
    direction: Vector2,
    maxDistance: number
  ): boolean {
    const testDistance = Math.min(maxDistance, 300);
    const predictedPos = Physics.add(
      ballPos,
      Physics.multiply(direction, testDistance)
    );

    // Check if ball would go out of bounds
    const margin = 30;
    const wouldGoOutOfBounds =
      predictedPos.x < -this.stadium.width / 2 - margin ||
      predictedPos.x > this.stadium.width / 2 + margin ||
      predictedPos.y < -this.stadium.height / 2 - margin ||
      predictedPos.y > this.stadium.height / 2 + margin;

    if (wouldGoOutOfBounds) return false;

    // Check if direction goes backwards (towards blue goal)
    // Blue team should always kick towards negative X (red goal)
    return direction.x < 0.2; // Allow slight backwards angle but heavily penalize it
  }

  private calculateWallBounceToGoal(
    ballPos: Vector2,
    goal: Vector2
  ): Vector2 | null {
    const walls = this.stadium.walls.filter((wall) => {
      // Only consider top and bottom walls for bounces
      return Math.abs(wall.normal.y) > 0.5;
    });

    for (const wall of walls) {
      // Calculate bounce point on wall
      const wallMidpoint = {
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2,
      };

      // Try different points along the wall
      for (let t = 0.2; t <= 0.8; t += 0.2) {
        const bouncePoint = {
          x: wall.start.x + (wall.end.x - wall.start.x) * t,
          y: wall.start.y + (wall.end.y - wall.start.y) * t,
        };

        // Vector from ball to bounce point
        const toBounce = Physics.subtract(bouncePoint, ballPos);
        const toBounceDir = Physics.normalize(toBounce);

        // Calculate reflected direction after bounce
        const reflectedDir = this.reflectVector(toBounceDir, wall.normal);

        // Check if reflected path goes towards goal
        const bounceToGoal = Physics.subtract(goal, bouncePoint);
        const bounceToGoalDir = Physics.normalize(bounceToGoal);

        // Check if reflected direction is similar to direction toward goal
        const similarity = Physics.dot(reflectedDir, bounceToGoalDir);

        if (
          similarity > 0.6 && // Good alignment with goal direction
          this.isValidKickDirection(
            ballPos,
            toBounceDir,
            Physics.magnitude(toBounce)
          )
        ) {
          return toBounceDir;
        }
      }
    }

    return null;
  }

  private reflectVector(vector: Vector2, normal: Vector2): Vector2 {
    const dotProduct = Physics.dot(vector, normal);
    return Physics.subtract(vector, Physics.multiply(normal, 2 * dotProduct));
  }

  private isGoodScoringPosition(ballPos: Vector2): boolean {
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    const distanceToGoal = Physics.distance(ballPos, redGoal);

    // Consider it a good scoring position if:
    // 1. Ball is relatively close to goal (within scoring range)
    // 2. Ball has a decent angle to goal
    // 3. Ball is in the attacking half

    const isInAttackingHalf = ballPos.x < this.stadium.width / 4;
    const isInScoringRange = distanceToGoal < this.stadium.width * 0.6; // Within 60% of field width
    const isInGoodAngle = Math.abs(ballPos.y) < this.stadium.goalWidth * 1.5; // Not too far from goal vertically

    return isInAttackingHalf && isInScoringRange && isInGoodAngle;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getStadium(): Stadium {
    return this.stadium;
  }
}
