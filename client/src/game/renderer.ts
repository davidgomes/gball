import type { GameState, Stadium, Player, Ball, Wall, Vector2 } from '../types/game.ts';
import { ConfettiSystem } from './confetti.ts';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offset: Vector2 = { x: 0, y: 0 };
  private stadium: Stadium | null = null;
  private confetti: ConfettiSystem = new ConfettiSystem();
  private lastUpdateTime: number = Date.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    
    this.setupCanvas();
    this.setupResizeHandler();
  }

  private setupCanvas(): void {
    // Enable high DPI display support
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Set rendering quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
      this.updateViewport();
    });
    resizeObserver.observe(this.canvas);
  }

  setStadium(stadium: Stadium): void {
    this.stadium = stadium;
    this.updateViewport();
  }

  private updateViewport(): void {
    if (!this.stadium) return;
    
    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;
    
    // Calculate scale to fit stadium with some padding
    const padding = 50;
    const scaleX = (canvasWidth - padding * 2) / this.stadium.width;
    const scaleY = (canvasHeight - padding * 2) / this.stadium.height;
    this.scale = Math.min(scaleX, scaleY);
    
    // Center the stadium
    this.offset.x = canvasWidth / 2;
    this.offset.y = canvasHeight / 2;
  }

  render(gameState: GameState): void {
    if (!this.stadium) return;
    
    // Update confetti system
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;
    this.confetti.update(deltaTime);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    
    // Set up coordinate system
    this.ctx.save();
    this.ctx.translate(this.offset.x, this.offset.y);
    this.ctx.scale(this.scale, this.scale);
    
    // Draw stadium
    this.drawStadium();
    
    // Draw entities
    this.drawBall(gameState.ball);
    gameState.players.forEach(player => this.drawPlayer(player));
    
    this.ctx.restore();
    
    // Draw UI elements (not scaled)
    this.drawUI(gameState);
    
    // Draw confetti on top of everything
    this.confetti.render(this.ctx);
  }

  triggerGoalCelebration(): void {
    this.confetti.trigger(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private drawStadium(): void {
    if (!this.stadium) return;
    
    // Draw field background
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillRect(
      -this.stadium.width / 2, 
      -this.stadium.height / 2, 
      this.stadium.width, 
      this.stadium.height
    );
    
    // Draw center circle
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 50, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Draw center line (vertical for horizontal field)
    this.ctx.beginPath();
    this.ctx.moveTo(0, -this.stadium.height / 2);
    this.ctx.lineTo(0, this.stadium.height / 2);
    this.ctx.stroke();
    
    // Draw goals
    this.drawGoal('left');
    this.drawGoal('right');
    
    // Draw walls and rounded corners
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.drawStadiumWalls();
  }

  private drawStadiumWalls(): void {
    if (!this.stadium) return;
    
    const { width, height } = this.stadium;
    const cornerRadius = 30;
    
    // Draw straight walls
    this.stadium.walls.forEach(wall => {
      // Skip corner walls (they have diagonal normals)
      if (Math.abs(wall.normal.x) === 0.707 || Math.abs(wall.normal.y) === 0.707) {
        return;
      }
      this.drawWall(wall);
    });
    
    // Draw rounded corners
    this.ctx.beginPath();
    
    // Top-left corner
    this.ctx.arc(-width/2 + cornerRadius, -height/2 + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5);
    
    // Top-right corner
    this.ctx.arc(width/2 - cornerRadius, -height/2 + cornerRadius, cornerRadius, Math.PI * 1.5, 0);
    
    // Bottom-right corner
    this.ctx.arc(width/2 - cornerRadius, height/2 - cornerRadius, cornerRadius, 0, Math.PI * 0.5);
    
    // Bottom-left corner
    this.ctx.arc(-width/2 + cornerRadius, height/2 - cornerRadius, cornerRadius, Math.PI * 0.5, Math.PI);
    
    this.ctx.stroke();
  }

  private drawGoal(position: 'left' | 'right'): void {
    if (!this.stadium) return;
    
    const x = position === 'left' ? -this.stadium.width / 2 : this.stadium.width / 2;
    const goalX = position === 'left' ? x - this.stadium.goalDepth : x + this.stadium.goalDepth;
    
    // Goal area background
    this.ctx.fillStyle = position === 'left' ? '#FF5722' : '#2196F3';
    this.ctx.fillRect(
      position === 'left' ? goalX : x,
      -this.stadium.goalWidth / 2,
      this.stadium.goalDepth,
      this.stadium.goalWidth
    );
    
    // Goal posts
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x, -this.stadium.goalWidth / 2);
    this.ctx.lineTo(goalX, -this.stadium.goalWidth / 2);
    this.ctx.lineTo(goalX, this.stadium.goalWidth / 2);
    this.ctx.lineTo(x, this.stadium.goalWidth / 2);
    this.ctx.stroke();
  }

  private drawWall(wall: Wall): void {
    this.ctx.beginPath();
    this.ctx.moveTo(wall.start.x, wall.start.y);
    this.ctx.lineTo(wall.end.x, wall.end.y);
    this.ctx.stroke();
  }

  private drawPlayer(player: Player): void {
    const { position, radius, team, playerId, input } = player;
    const isAI = playerId.startsWith('ai_');
    
    // Player body
    this.ctx.fillStyle = team === 'red' ? '#F44336' : '#2196F3';
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Player outline - gray-ish by default, white when kicking
    this.ctx.strokeStyle = input.kick ? '#FFFFFF' : '#808080';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // AI indicator with role-specific icons for blue AI players
    if (isAI && team === 'blue') {
      this.ctx.save();
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `${radius * 0.8}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Role-specific icons - ALL ATTACKING
      const role = (player as any).aiRole || 'midfielder';
      let icon = '⚙';
      switch (role) {
        case 'attacker': icon = '⚔'; break;
        case 'midfielder': icon = '⚽'; break;
        default: icon = '⚔'; break; // Default to attacker
      }
      
      this.ctx.fillText(icon, position.x, position.y);
      this.ctx.restore();
    } else {
      // Player direction indicator (small line) for humans
      const directionLength = radius * 0.7;
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(position.x, position.y);
      this.ctx.lineTo(
        position.x + Math.cos(-Math.PI / 2) * directionLength,
        position.y + Math.sin(-Math.PI / 2) * directionLength
      );
      this.ctx.stroke();
    }
  }

  private drawBall(ball: Ball): void {
    const { position, radius } = ball;
    
    // Ball body
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Ball outline
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Removed cross pattern - ball is now plain white
  }

  private drawUI(gameState: GameState): void {
    // Draw score
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#000000';
    
    const scoreText = `Red ${gameState.score.red} - ${gameState.score.blue} Blue`;
    this.ctx.fillText(scoreText, this.canvas.clientWidth / 2, 40);
    
    // Draw match time
    if (gameState.isMatchActive) {
      const timeLeft = Math.max(0, gameState.matchDuration - gameState.gameTime);
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText(timeText, this.canvas.clientWidth / 2, 70);
    } else {
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText('Waiting for players...', this.canvas.clientWidth / 2, 70);
    }
    
    // Draw controls
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#666666';
    this.ctx.fillText('Controls: Arrow Keys or WASD to move, Space to kick (get close to ball first!)', 10, this.canvas.clientHeight - 10);
  }
}