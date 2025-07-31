var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// ../node_modules/ws/browser.js
var require_browser = __commonJS((exports, module) => {
  module.exports = function() {
    throw new Error("ws does not work in the browser. Browser clients must use the native " + "WebSocket object");
  };
});

// src/index.ts
var import_ws = __toESM(require_browser(), 1);

// src/utils/physics.ts
class Physics {
  static add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }
  static subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }
  static multiply(v, scalar) {
    return { x: v.x * scalar, y: v.y * scalar };
  }
  static dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }
  static magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }
  static normalize(v) {
    const mag = this.magnitude(v);
    if (mag === 0)
      return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  }
  static distance(a, b) {
    return this.magnitude(this.subtract(a, b));
  }
  static limit(v, max) {
    const mag = this.magnitude(v);
    if (mag > max) {
      return this.multiply(this.normalize(v), max);
    }
    return v;
  }
  static applyFriction(velocity, friction, deltaTime) {
    const frictionForce = Math.pow(friction, deltaTime);
    return this.multiply(velocity, frictionForce);
  }
  static checkCircleCollision(a, b) {
    const distance = this.distance(a.position, b.position);
    return distance < a.radius + b.radius;
  }
  static resolveCircleCollision(a, b) {
    const distance = this.distance(a.position, b.position);
    const minDistance = a.radius + b.radius;
    if (distance < minDistance) {
      const overlap = minDistance - distance;
      const direction = this.normalize(this.subtract(b.position, a.position));
      if (distance === 0) {
        direction.x = 1;
        direction.y = 0;
      }
      const separation = this.multiply(direction, overlap * 0.5);
      a.position = this.subtract(a.position, separation);
      b.position = this.add(b.position, separation);
      const relativeVelocity = this.subtract(b.velocity, a.velocity);
      const velocityAlongNormal = this.dot(relativeVelocity, direction);
      if (velocityAlongNormal > 0)
        return;
      const restitution = 0.8;
      const impulse = -(1 + restitution) * velocityAlongNormal;
      const impulseVector = this.multiply(direction, impulse);
      a.velocity = this.subtract(a.velocity, this.multiply(impulseVector, 0.5));
      b.velocity = this.add(b.velocity, this.multiply(impulseVector, 0.5));
    }
  }
  static checkWallCollision(entity, wall) {
    const closestPoint = this.getClosestPointOnWall(entity.position, wall);
    const distance = this.distance(entity.position, closestPoint);
    return distance < entity.radius;
  }
  static resolveWallCollision(entity, wall) {
    const closestPoint = this.getClosestPointOnWall(entity.position, wall);
    const distance = this.distance(entity.position, closestPoint);
    if (distance < entity.radius) {
      const overlap = entity.radius - distance;
      const direction = this.normalize(this.subtract(entity.position, closestPoint));
      entity.position = this.add(entity.position, this.multiply(direction, overlap));
      const velocityAlongNormal = this.dot(entity.velocity, wall.normal);
      if (velocityAlongNormal < 0) {
        const reflection = this.multiply(wall.normal, velocityAlongNormal * 2);
        entity.velocity = this.subtract(entity.velocity, reflection);
        entity.velocity = this.multiply(entity.velocity, 0.8);
      }
    }
  }
  static getClosestPointOnWall(point, wall) {
    const wallVector = this.subtract(wall.end, wall.start);
    const pointVector = this.subtract(point, wall.start);
    const wallLength = this.magnitude(wallVector);
    if (wallLength === 0)
      return wall.start;
    const normalizedWall = this.normalize(wallVector);
    const projection = this.dot(pointVector, normalizedWall);
    const t = Math.max(0, Math.min(wallLength, projection));
    return this.add(wall.start, this.multiply(normalizedWall, t));
  }
  static applyKick(player, ball, kickPower) {
    const direction = this.normalize(this.subtract(ball.position, player.position));
    const kickForce = this.multiply(direction, kickPower);
    ball.velocity = this.add(ball.velocity, kickForce);
  }
}

// src/game/stadium.ts
class StadiumConfig {
  static createClassicStadium() {
    const width = 1260;
    const height = 600;
    const goalWidth = 192;
    const goalDepth = 45;
    const walls = [];
    walls.push({
      start: { x: -width / 2, y: -height / 2 },
      end: { x: width / 2, y: -height / 2 },
      normal: { x: 0, y: 1 }
    });
    walls.push({
      start: { x: -width / 2, y: height / 2 },
      end: { x: width / 2, y: height / 2 },
      normal: { x: 0, y: -1 }
    });
    walls.push({
      start: { x: -width / 2, y: -height / 2 },
      end: { x: -width / 2, y: -goalWidth / 2 },
      normal: { x: 1, y: 0 }
    });
    walls.push({
      start: { x: -width / 2, y: goalWidth / 2 },
      end: { x: -width / 2, y: height / 2 },
      normal: { x: 1, y: 0 }
    });
    walls.push({
      start: { x: width / 2, y: -height / 2 },
      end: { x: width / 2, y: -goalWidth / 2 },
      normal: { x: -1, y: 0 }
    });
    walls.push({
      start: { x: width / 2, y: goalWidth / 2 },
      end: { x: width / 2, y: height / 2 },
      normal: { x: -1, y: 0 }
    });
    walls.push({
      start: { x: -width / 2, y: -goalWidth / 2 },
      end: { x: -width / 2 - goalDepth, y: -goalWidth / 2 },
      normal: { x: 0, y: 1 }
    });
    walls.push({
      start: { x: -width / 2, y: goalWidth / 2 },
      end: { x: -width / 2 - goalDepth, y: goalWidth / 2 },
      normal: { x: 0, y: -1 }
    });
    walls.push({
      start: { x: -width / 2 - goalDepth, y: -goalWidth / 2 },
      end: { x: -width / 2 - goalDepth, y: goalWidth / 2 },
      normal: { x: 1, y: 0 }
    });
    walls.push({
      start: { x: width / 2, y: -goalWidth / 2 },
      end: { x: width / 2 + goalDepth, y: -goalWidth / 2 },
      normal: { x: 0, y: 1 }
    });
    walls.push({
      start: { x: width / 2, y: goalWidth / 2 },
      end: { x: width / 2 + goalDepth, y: goalWidth / 2 },
      normal: { x: 0, y: -1 }
    });
    walls.push({
      start: { x: width / 2 + goalDepth, y: -goalWidth / 2 },
      end: { x: width / 2 + goalDepth, y: goalWidth / 2 },
      normal: { x: -1, y: 0 }
    });
    return {
      width,
      height,
      goalWidth,
      goalDepth,
      walls
    };
  }
  static isInGoal(position, stadium) {
    const { width, height, goalWidth, goalDepth } = stadium;
    if (position.y >= -goalWidth / 2 && position.y <= goalWidth / 2 && position.x <= -width / 2 && position.x >= -width / 2 - goalDepth) {
      return "blue";
    }
    if (position.y >= -goalWidth / 2 && position.y <= goalWidth / 2 && position.x >= width / 2 && position.x <= width / 2 + goalDepth) {
      return "red";
    }
    return null;
  }
  static getPlayerSpawnPosition(team, playerIndex) {
    const formations = {
      red: [
        { x: -150, y: 0 },
        { x: -240, y: -90 },
        { x: -240, y: 90 },
        { x: -360, y: 0 }
      ],
      blue: [
        { x: 150, y: 0 },
        { x: 240, y: -90 },
        { x: 240, y: 90 },
        { x: 360, y: 0 }
      ]
    };
    const positions = formations[team];
    return positions[playerIndex % positions.length];
  }
  static getBallSpawnPosition() {
    return { x: 0, y: 0 };
  }
}

// src/game/engine.ts
class GameEngine {
  gameState;
  stadium;
  lastUpdateTime;
  tickRate = 60;
  deltaTime = 1000 / this.tickRate;
  constructor() {
    this.stadium = StadiumConfig.createClassicStadium();
    this.lastUpdateTime = Date.now();
    this.gameState = {
      players: new Map,
      ball: this.createBall(),
      score: { red: 0, blue: 0 },
      gameTime: 0,
      matchDuration: 3 * 60 * 1000,
      isMatchActive: false
    };
  }
  createBall() {
    const spawnPos = StadiumConfig.getBallSpawnPosition();
    return {
      id: "ball",
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: 11,
      friction: 0.985,
      bounciness: 0.8
    };
  }
  addPlayer(playerId) {
    const team = "red";
    const teamCount = Array.from(this.gameState.players.values()).filter((p) => p.team === team && !p.playerId.startsWith("ai_")).length;
    const spawnPos = StadiumConfig.getPlayerSpawnPosition(team, teamCount);
    const player = {
      id: playerId,
      playerId,
      team,
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: 15,
      maxSpeed: 240,
      acceleration: 600,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        kick: false
      }
    };
    this.gameState.players.set(playerId, player);
    this.balanceAITeam();
    if (this.getRedPlayerCount() >= 1 && !this.gameState.isMatchActive) {
      this.startMatch();
    }
    return player;
  }
  removePlayer(playerId) {
    this.gameState.players.delete(playerId);
    if (!playerId.startsWith("ai_")) {
      this.balanceAITeam();
    }
    if (this.getRedPlayerCount() === 0) {
      this.gameState.isMatchActive = false;
    }
  }
  updatePlayerInput(playerId, input) {
    const player = this.gameState.players.get(playerId);
    if (player) {
      player.input = { ...input };
    }
  }
  update() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;
    if (this.gameState.isMatchActive) {
      this.gameState.gameTime += deltaTime * 1000;
      if (this.gameState.gameTime >= this.gameState.matchDuration) {
        this.endMatch();
      }
    }
    for (const player of this.gameState.players.values()) {
      if (player.team === "blue" && player.playerId.startsWith("ai_")) {
        this.updateAIPlayer(player, deltaTime);
      }
      this.updatePlayer(player, deltaTime);
    }
    this.updateBall(deltaTime);
    this.handleCollisions();
    this.checkGoals();
    return { ...this.gameState };
  }
  updatePlayer(player, deltaTime) {
    const acceleration = { x: 0, y: 0 };
    if (player.input.left)
      acceleration.x -= player.acceleration;
    if (player.input.right)
      acceleration.x += player.acceleration;
    if (player.input.up)
      acceleration.y -= player.acceleration;
    if (player.input.down)
      acceleration.y += player.acceleration;
    const accelerationDelta = Physics.multiply(acceleration, deltaTime);
    player.velocity = Physics.add(player.velocity, accelerationDelta);
    player.velocity = Physics.limit(player.velocity, player.maxSpeed);
    player.velocity = Physics.applyFriction(player.velocity, 0.95, deltaTime);
    const velocityDelta = Physics.multiply(player.velocity, deltaTime);
    player.position = Physics.add(player.position, velocityDelta);
    if (player.input.kick && this.canPlayerKickBall(player)) {
      this.performKick(player);
    }
  }
  updateBall(deltaTime) {
    this.gameState.ball.velocity = Physics.applyFriction(this.gameState.ball.velocity, this.gameState.ball.friction, deltaTime);
    const velocityDelta = Physics.multiply(this.gameState.ball.velocity, deltaTime);
    this.gameState.ball.position = Physics.add(this.gameState.ball.position, velocityDelta);
  }
  handleCollisions() {
    for (const player of this.gameState.players.values()) {
      for (const wall of this.stadium.walls) {
        if (Physics.checkWallCollision(player, wall)) {
          Physics.resolveWallCollision(player, wall);
        }
      }
    }
    for (const wall of this.stadium.walls) {
      if (Physics.checkWallCollision(this.gameState.ball, wall)) {
        Physics.resolveWallCollision(this.gameState.ball, wall);
      }
    }
    for (const player of this.gameState.players.values()) {
      if (Physics.checkCircleCollision(player, this.gameState.ball)) {
        Physics.resolveCircleCollision(player, this.gameState.ball);
      }
    }
    const players = Array.from(this.gameState.players.values());
    for (let i = 0;i < players.length; i++) {
      for (let j = i + 1;j < players.length; j++) {
        if (Physics.checkCircleCollision(players[i], players[j])) {
          Physics.resolveCircleCollision(players[i], players[j]);
        }
      }
    }
  }
  checkGoals() {
    const goalScored = StadiumConfig.isInGoal(this.gameState.ball.position, this.stadium);
    if (goalScored) {
      this.gameState.score[goalScored]++;
      this.resetBallAndPlayers();
      if (this.gameState.score.red >= 3 || this.gameState.score.blue >= 3) {
        this.endMatch();
      }
    }
  }
  canPlayerKickBall(player) {
    const distance = Physics.distance(player.position, this.gameState.ball.position);
    return distance <= player.radius + this.gameState.ball.radius + 15;
  }
  performKick(player) {
    const kickPower = 250;
    Physics.applyKick(player, this.gameState.ball, kickPower);
    console.log(`\uD83E\uDDB6 Player ${player.playerId.slice(-4)} kicked the ball!`);
  }
  startMatch() {
    this.gameState.isMatchActive = true;
    this.gameState.gameTime = 0;
    this.gameState.score = { red: 0, blue: 0 };
    this.resetBallAndPlayers();
  }
  endMatch() {
    this.gameState.isMatchActive = false;
  }
  resetBallAndPlayers() {
    this.gameState.ball.position = StadiumConfig.getBallSpawnPosition();
    this.gameState.ball.velocity = { x: 0, y: 0 };
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
  getRedPlayerCount() {
    return Array.from(this.gameState.players.values()).filter((p) => p.team === "red" && !p.playerId.startsWith("ai_")).length;
  }
  getBluePlayerCount() {
    return Array.from(this.gameState.players.values()).filter((p) => p.team === "blue" && p.playerId.startsWith("ai_")).length;
  }
  balanceAITeam() {
    const redCount = this.getRedPlayerCount();
    const blueCount = this.getBluePlayerCount();
    if (redCount > blueCount) {
      for (let i = blueCount;i < redCount; i++) {
        this.addAIPlayer(i);
      }
    } else if (blueCount > redCount) {
      const bluePlayersToRemove = Array.from(this.gameState.players.values()).filter((p) => p.team === "blue" && p.playerId.startsWith("ai_")).slice(redCount);
      bluePlayersToRemove.forEach((player) => {
        this.gameState.players.delete(player.playerId);
      });
    }
  }
  addAIPlayer(index) {
    const aiId = `ai_blue_${Date.now()}_${index}`;
    const spawnPos = StadiumConfig.getPlayerSpawnPosition("blue", index);
    const roles = ["attacker", "midfielder", "attacker", "attacker"];
    const role = roles[index % roles.length];
    const aiPlayer = {
      id: aiId,
      playerId: aiId,
      team: "blue",
      position: { ...spawnPos },
      velocity: { x: 0, y: 0 },
      radius: 15,
      maxSpeed: role === "attacker" ? 290 : 280,
      acceleration: 700,
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
    console.log(`\uD83E\uDD16 AI ${role.charAt(0).toUpperCase() + role.slice(1)} #${index + 1} joined blue team (Speed: ${aiPlayer.maxSpeed})`);
  }
  updateAIPlayer(aiPlayer, deltaTime) {
    if (!aiPlayer.aiCooldowns) {
      aiPlayer.aiCooldowns = { kick: 0, decision: 0 };
    }
    aiPlayer.aiCooldowns.kick = Math.max(0, aiPlayer.aiCooldowns.kick - deltaTime);
    aiPlayer.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      kick: false
    };
    const ball = this.gameState.ball;
    const distanceToBall = Physics.distance(aiPlayer.position, ball.position);
    this.makeAggressiveAIDecision(aiPlayer, ball, distanceToBall);
  }
  makeAggressiveAIDecision(aiPlayer, ball, distanceToBall) {
    const role = aiPlayer.aiRole || "midfielder";
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    const allPlayers = Array.from(this.gameState.players.values());
    const bluePlayers = allPlayers.filter((p) => p.team === "blue");
    const redPlayers = allPlayers.filter((p) => p.team === "red");
    const ballSpeed = Physics.magnitude(ball.velocity);
    const isMovingBall = ballSpeed > 30;
    const closestHumanToBall = redPlayers.reduce((closest, player) => {
      const dist = Physics.distance(player.position, ball.position);
      const closestDist = Physics.distance(closest.position, ball.position);
      return dist < closestDist ? player : closest;
    });
    let targetPosition;
    let shouldKick = false;
    const isCloseEnoughToBall = distanceToBall < 200;
    const isInTopTwoClosest = bluePlayers.map((ai) => ({ ai, dist: Physics.distance(ai.position, ball.position) })).sort((a, b) => a.dist - b.dist).slice(0, 2).some((entry) => entry.ai.playerId === aiPlayer.playerId);
    if (isCloseEnoughToBall || isInTopTwoClosest) {
      if (isMovingBall) {
        const timeToReach = distanceToBall / (aiPlayer.maxSpeed * 1.2);
        const predictedPos = Physics.add(ball.position, Physics.multiply(ball.velocity, timeToReach));
        targetPosition = this.clampToBounds(predictedPos);
      } else {
        targetPosition = ball.position;
      }
      shouldKick = distanceToBall <= aiPlayer.radius + ball.radius + 35;
    } else {
      const humanToBallDistance = Physics.distance(closestHumanToBall.position, ball.position);
      if (humanToBallDistance < 150) {
        targetPosition = this.getInterceptionPosition(aiPlayer, closestHumanToBall, ball);
      } else {
        targetPosition = this.getAggressivePositioning(aiPlayer, ball, bluePlayers, role);
      }
    }
    this.moveAggressivelyToTarget(aiPlayer, targetPosition);
    if (shouldKick && aiPlayer.aiCooldowns && aiPlayer.aiCooldowns.kick <= 0) {
      const kickDirection = this.getAgressiveKickDirection(aiPlayer, ball);
      if (kickDirection) {
        aiPlayer.input.kick = true;
        aiPlayer.aiCooldowns.kick = 0.15;
      }
    }
  }
  getInterceptionPosition(aiPlayer, targetHuman, ball) {
    const humanVelocity = targetHuman.velocity;
    const humanSpeed = Physics.magnitude(humanVelocity);
    let interceptPoint;
    if (humanSpeed > 20) {
      const timeToIntercept = Physics.distance(aiPlayer.position, targetHuman.position) / aiPlayer.maxSpeed;
      const humanFuturePos = Physics.add(targetHuman.position, Physics.multiply(humanVelocity, timeToIntercept));
      interceptPoint = {
        x: (humanFuturePos.x + ball.position.x) * 0.6 + humanFuturePos.x * 0.4,
        y: (humanFuturePos.y + ball.position.y) * 0.6 + humanFuturePos.y * 0.4
      };
    } else {
      const humanToBall = Physics.subtract(ball.position, targetHuman.position);
      const interceptDistance = Math.min(60, Physics.magnitude(humanToBall) * 0.7);
      const interceptDirection = Physics.normalize(humanToBall);
      interceptPoint = Physics.add(targetHuman.position, Physics.multiply(interceptDirection, interceptDistance));
    }
    return this.clampToBounds(interceptPoint);
  }
  getAggressivePositioning(aiPlayer, ball, bluePlayers, role) {
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    const aiVeryCloseToBall = bluePlayers.filter((ai) => Physics.distance(ai.position, ball.position) < 60).length;
    if (aiVeryCloseToBall >= 3 && Physics.distance(aiPlayer.position, ball.position) > 80) {
      const spreadAngle = bluePlayers.indexOf(aiPlayer) / bluePlayers.length * Math.PI * 1.5;
      const spreadDistance = 50;
      const spreadX = ball.position.x + Math.cos(spreadAngle) * spreadDistance;
      const spreadY = ball.position.y + Math.sin(spreadAngle) * spreadDistance;
      const biasedX = spreadX * 0.4 + (redGoal.x + 80) * 0.6;
      return this.clampToBounds({ x: biasedX, y: spreadY });
    }
    const ballDirection = Physics.normalize(Physics.subtract(ball.position, aiPlayer.position));
    const aggressiveDistance = 30;
    return Physics.add(aiPlayer.position, Physics.multiply(ballDirection, aggressiveDistance));
  }
  moveAggressivelyToTarget(aiPlayer, targetPosition) {
    const direction = Physics.subtract(targetPosition, aiPlayer.position);
    const distance = Physics.magnitude(direction);
    if (distance < 3)
      return;
    const normalizedDirection = Physics.normalize(direction);
    const avoidanceForce = this.getMinimalAvoidanceForce(aiPlayer);
    const finalDirection = Physics.normalize(Physics.add(Physics.multiply(normalizedDirection, 0.9), Physics.multiply(avoidanceForce, 0.1)));
    const threshold = 0.1;
    if (finalDirection.x < -threshold)
      aiPlayer.input.left = true;
    if (finalDirection.x > threshold)
      aiPlayer.input.right = true;
    if (finalDirection.y < -threshold)
      aiPlayer.input.up = true;
    if (finalDirection.y > threshold)
      aiPlayer.input.down = true;
    if (Math.abs(finalDirection.x) < threshold && Math.abs(finalDirection.y) < threshold && distance > 10) {
      const randomDirection = Math.random() * Math.PI * 2;
      const randomX = Math.cos(randomDirection);
      const randomY = Math.sin(randomDirection);
      if (Math.abs(randomX) > 0.5) {
        if (randomX > 0)
          aiPlayer.input.right = true;
        else
          aiPlayer.input.left = true;
      }
      if (Math.abs(randomY) > 0.5) {
        if (randomY > 0)
          aiPlayer.input.down = true;
        else
          aiPlayer.input.up = true;
      }
    }
  }
  getMinimalAvoidanceForce(aiPlayer) {
    const avoidanceForce = { x: 0, y: 0 };
    const allPlayers = Array.from(this.gameState.players.values());
    for (const otherPlayer of allPlayers) {
      if (otherPlayer.playerId === aiPlayer.playerId)
        continue;
      const distance = Physics.distance(aiPlayer.position, otherPlayer.position);
      const avoidDistance = 25;
      if (distance < avoidDistance && distance > 0) {
        const repulsion = Physics.normalize(Physics.subtract(aiPlayer.position, otherPlayer.position));
        const strength = (avoidDistance - distance) / avoidDistance * 0.5;
        avoidanceForce.x += repulsion.x * strength;
        avoidanceForce.y += repulsion.y * strength;
      }
    }
    return avoidanceForce;
  }
  clampToBounds(position) {
    return {
      x: Math.max(-this.stadium.width / 2 + 30, Math.min(this.stadium.width / 2 - 30, position.x)),
      y: Math.max(-this.stadium.height / 2 + 30, Math.min(this.stadium.height / 2 - 30, position.y))
    };
  }
  getAgressiveKickDirection(aiPlayer, ball) {
    const redGoal = { x: -this.stadium.width / 2, y: 0 };
    const role = aiPlayer.aiRole || "midfielder";
    let targetDirection = Physics.normalize(Physics.subtract(redGoal, ball.position));
    if (role === "attacker") {
      const randomOffset = (Math.random() - 0.5) * 0.3;
      targetDirection.y += randomOffset;
      targetDirection = Physics.normalize(targetDirection);
    } else if (role === "defender") {
      if (aiPlayer.position.x > this.stadium.width / 4) {
        const centerClear = { x: -this.stadium.width / 4, y: ball.position.y * 0.5 };
        targetDirection = Physics.normalize(Physics.subtract(centerClear, ball.position));
      }
    }
    const kickDistance = 300;
    const predictedPos = Physics.add(ball.position, Physics.multiply(targetDirection, kickDistance));
    const margin = 40;
    const isOutOfBounds = predictedPos.x < -this.stadium.width / 2 - margin || predictedPos.x > this.stadium.width / 2 + margin || predictedPos.y < -this.stadium.height / 2 - margin || predictedPos.y > this.stadium.height / 2 + margin;
    if (isOutOfBounds) {
      const centerDirection = Physics.normalize({
        x: -ball.position.x * 0.5,
        y: -ball.position.y * 0.7
      });
      return centerDirection;
    }
    return targetDirection;
  }
  getGameState() {
    return { ...this.gameState };
  }
  getStadium() {
    return this.stadium;
  }
}

// src/index.ts
class GameServer {
  wss;
  gameEngine;
  clients = new Map;
  gameLoop = null;
  tickRate = 60;
  constructor(port = 8080) {
    this.gameEngine = new GameEngine;
    this.wss = new import_ws.WebSocketServer({
      port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          threshold: 1024,
          concurrencyLimit: 10
        },
        threshold: 1024
      }
    });
    this.setupWebSocketServer();
    this.startGameLoop();
    console.log(`\uD83C\uDFD0 gball server running on ws://localhost:${port}`);
  }
  setupWebSocketServer() {
    this.wss.on("connection", (ws, req) => {
      const playerId = this.generatePlayerId();
      const clientAddress = req.socket.remoteAddress;
      console.log(`\uD83D\uDD17 Player ${playerId} connected from ${clientAddress}`);
      this.clients.set(playerId, ws);
      const player = this.gameEngine.addPlayer(playerId);
      const initialGameState = this.gameEngine.getGameState();
      const serializedInitialGameState = {
        ...initialGameState,
        players: Object.fromEntries(initialGameState.players)
      };
      this.sendToClient(playerId, {
        type: "join",
        playerId,
        data: {
          player,
          gameState: serializedInitialGameState,
          stadium: this.gameEngine.getStadium()
        },
        timestamp: Date.now()
      });
      this.broadcastToOthers(playerId, {
        type: "join",
        playerId,
        data: { player },
        timestamp: Date.now()
      });
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(playerId, message);
        } catch (error) {
          console.error("❌ Error parsing message:", error);
        }
      });
      ws.on("close", () => {
        console.log(`\uD83D\uDD0C Player ${playerId} disconnected`);
        this.clients.delete(playerId);
        this.gameEngine.removePlayer(playerId);
        this.broadcastToOthers(playerId, {
          type: "leave",
          playerId,
          data: null,
          timestamp: Date.now()
        });
      });
      ws.on("error", (error) => {
        console.error(`❌ WebSocket error for player ${playerId}:`, error);
      });
    });
    this.wss.on("error", (error) => {
      console.error("❌ WebSocket server error:", error);
    });
  }
  handleMessage(playerId, message) {
    switch (message.type) {
      case "input":
        if (message.data && this.isValidInput(message.data)) {
          this.gameEngine.updatePlayerInput(playerId, message.data);
        }
        break;
      default:
        console.warn(`⚠️ Unknown message type: ${message.type}`);
        break;
    }
  }
  isValidInput(input) {
    return typeof input === "object" && typeof input.up === "boolean" && typeof input.down === "boolean" && typeof input.left === "boolean" && typeof input.right === "boolean" && typeof input.kick === "boolean";
  }
  startGameLoop() {
    this.gameLoop = setInterval(() => {
      const gameState = this.gameEngine.update();
      const serializedGameState = {
        ...gameState,
        players: Object.fromEntries(gameState.players)
      };
      const message = {
        type: "gameState",
        data: serializedGameState,
        timestamp: Date.now()
      };
      this.broadcast(message);
    }, 1000 / this.tickRate);
  }
  sendToClient(playerId, message) {
    const client = this.clients.get(playerId);
    if (client && client.readyState === import_ws.WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Error sending message to ${playerId}:`, error);
      }
    }
  }
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    for (const [playerId, client] of this.clients) {
      if (client.readyState === import_ws.WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error(`❌ Error broadcasting to ${playerId}:`, error);
        }
      }
    }
  }
  broadcastToOthers(excludePlayerId, message) {
    const messageStr = JSON.stringify(message);
    for (const [playerId, client] of this.clients) {
      if (playerId !== excludePlayerId && client.readyState === import_ws.WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error(`❌ Error broadcasting to ${playerId}:`, error);
        }
      }
    }
  }
  generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  stop() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
    this.wss.close();
    console.log("\uD83D\uDED1 Game server stopped");
  }
}
var server = new GameServer(process.env.PORT ? parseInt(process.env.PORT) : 8090);
process.on("SIGINT", () => {
  console.log(`
\uD83D\uDED1 Shutting down server...`);
  server.stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log(`
\uD83D\uDED1 Shutting down server...`);
  server.stop();
  process.exit(0);
});
