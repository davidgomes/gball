export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class ConfettiSystem {
  private particles: ConfettiParticle[] = [];
  private isActive: boolean = false;
  private startTime: number = 0;
  private duration: number = 2000; // 2 seconds

  private readonly colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b',
    '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#e17055'
  ];

  trigger(canvasWidth: number, canvasHeight: number): void {
    this.isActive = true;
    this.startTime = Date.now();
    this.particles = [];

    // Create confetti particles
    const particleCount = 150;
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push(this.createParticle(canvasWidth, canvasHeight));
    }
  }

  private createParticle(canvasWidth: number, canvasHeight: number): ConfettiParticle {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    return {
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 400, // pixels per second
      vy: (Math.random() - 0.5) * 300 - 200, // bias upward
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      size: Math.random() * 8 + 4,
      life: 1.0,
      maxLife: 1.0
    };
  }

  update(deltaTime: number): void {
    if (!this.isActive) return;

    const elapsed = Date.now() - this.startTime;
    if (elapsed > this.duration) {
      this.isActive = false;
      this.particles = [];
      return;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // Apply gravity
      particle.vy += 500 * deltaTime; // gravity
      
      // Update rotation
      particle.rotation += particle.rotationSpeed * deltaTime;
      
      // Update life
      particle.life = 1.0 - (elapsed / this.duration);
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive || this.particles.length === 0) return;

    ctx.save();
    
    for (const particle of this.particles) {
      ctx.save();
      
      // Apply particle transformations
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = particle.life;
      
      // Draw particle as rectangle
      ctx.fillStyle = particle.color;
      const halfSize = particle.size / 2;
      ctx.fillRect(-halfSize, -halfSize, particle.size, particle.size);
      
      ctx.restore();
    }
    
    ctx.restore();
  }

  isRunning(): boolean {
    return this.isActive;
  }

  stop(): void {
    this.isActive = false;
    this.particles = [];
  }
}