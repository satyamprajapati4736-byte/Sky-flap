/**
 * Simple Sound System using Web Audio API
 */
class SoundSystem {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playFlap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playPoint() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

export const sounds = new SoundSystem();

/**
 * Game Logic
 */
export enum GameState {
  START,
  PLAYING,
  GAME_OVER
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: GameState = GameState.START;
  score: number = 0;
  level: number = 1;
  highScore: number = 0;
  
  // Bird properties
  birdY: number = 0;
  birdVelocity: number = 0;
  birdWidth: number = 34;
  birdHeight: number = 24;
  birdX: number = 50;
  
  // Constants
  gravity: number = 0.25;
  jumpStrength: number = -5;
  pipeWidth: number = 52;
  pipeGap: number = 150;
  pipeSpeed: number = 2;
  groundHeight: number = 100;
  
  pipes: any[] = [];
  frameCount: number = 0;
  groundOffset: number = 0;
  wingPhase: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.highScore = parseInt(localStorage.getItem('skyflap_highscore') || '0');
    this.reset();
  }

  reset() {
    this.birdY = this.canvas.height / 2;
    this.birdVelocity = 0;
    this.score = 0;
    this.level = 1;
    this.pipes = [];
    this.frameCount = 0;
    this.pipeSpeed = 2;
    this.pipeGap = 150;
    this.wingPhase = 0;
  }

  start() {
    this.state = GameState.PLAYING;
    this.reset();
  }

  jump() {
    if (this.state === GameState.PLAYING) {
      this.birdVelocity = this.jumpStrength;
      sounds.playFlap();
    } else if (this.state === GameState.START) {
      this.start();
    }
  }

  update() {
    this.frameCount++;
    
    // Wing animation
    const flapSpeed = this.state === GameState.PLAYING && this.birdVelocity < 0 ? 0.4 : 0.2;
    if (this.state !== GameState.GAME_OVER) {
      this.wingPhase += flapSpeed;
    }

    // Ground animation
    if (this.state !== GameState.GAME_OVER) {
      this.groundOffset = (this.groundOffset + this.pipeSpeed) % 24;
    }

    if (this.state === GameState.START) return;

    // Bird physics (always apply unless on ground)
    if (this.birdY + this.birdHeight < this.canvas.height - this.groundHeight) {
      this.birdVelocity += this.gravity;
      this.birdY += this.birdVelocity;
    } else {
      this.birdY = this.canvas.height - this.groundHeight - this.birdHeight;
      this.birdVelocity = 0;
    }

    if (this.state === GameState.GAME_OVER) return;
    const newLevel = Math.floor(this.score / 10) + 1;
    if (newLevel !== this.level) {
      this.level = newLevel;
      // Increase speed and decrease gap
      this.pipeSpeed = 2 + (this.level - 1) * 0.5;
      this.pipeGap = Math.max(100, 150 - (this.level - 1) * 10);
    }

    // Ground collision
    if (this.birdY + this.birdHeight > this.canvas.height - this.groundHeight) {
      this.gameOver();
    }
    
    // Ceiling collision
    if (this.birdY < 0) {
      this.birdY = 0;
      this.birdVelocity = 0;
    }

    // Pipes
    if (this.frameCount % 100 === 0) {
      const minPipeHeight = 50;
      const maxPipeHeight = this.canvas.height - this.groundHeight - this.pipeGap - minPipeHeight;
      const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
      this.pipes.push({
        x: this.canvas.width,
        topHeight: topHeight,
        passed: false
      });
    }

    this.pipes.forEach((pipe, index) => {
      pipe.x -= this.pipeSpeed;

      // Collision detection
      if (
        this.birdX + this.birdWidth > pipe.x &&
        this.birdX < pipe.x + this.pipeWidth &&
        (this.birdY < pipe.topHeight || this.birdY + this.birdHeight > pipe.topHeight + this.pipeGap)
      ) {
        this.gameOver();
      }

      // Score
      if (!pipe.passed && pipe.x + this.pipeWidth < this.birdX) {
        pipe.passed = true;
        this.score++;
        sounds.playPoint();
        if (this.score > this.highScore) {
          this.highScore = this.score;
          localStorage.setItem('skyflap_highscore', this.highScore.toString());
        }
      }

      // Remove off-screen pipes
      if (pipe.x + this.pipeWidth < 0) {
        this.pipes.splice(index, 1);
      }
    });
  }

  gameOver() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.GAME_OVER;
      sounds.playHit();
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background (Sky)
    this.ctx.fillStyle = '#70c5ce';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Pipes
    this.pipes.forEach(pipe => {
      this.ctx.fillStyle = '#73bf2e';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;

      // Top pipe
      this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
      this.ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
      
      // Top pipe cap
      this.ctx.fillRect(pipe.x - 2, pipe.topHeight - 20, this.pipeWidth + 4, 20);
      this.ctx.strokeRect(pipe.x - 2, pipe.topHeight - 20, this.pipeWidth + 4, 20);

      // Bottom pipe
      const bottomY = pipe.topHeight + this.pipeGap;
      const bottomHeight = this.canvas.height - this.groundHeight - bottomY;
      this.ctx.fillRect(pipe.x, bottomY, this.pipeWidth, bottomHeight);
      this.ctx.strokeRect(pipe.x, bottomY, this.pipeWidth, bottomHeight);
      
      // Bottom pipe cap
      this.ctx.fillRect(pipe.x - 2, bottomY, this.pipeWidth + 4, 20);
      this.ctx.strokeRect(pipe.x - 2, bottomY, this.pipeWidth + 4, 20);
    });

    // Draw Ground
    this.ctx.fillStyle = '#ded895';
    this.ctx.fillRect(0, this.canvas.height - this.groundHeight, this.canvas.width, this.groundHeight);
    
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, this.canvas.height - this.groundHeight, this.canvas.width, this.groundHeight);

    // Ground stripes
    this.ctx.fillStyle = '#9ece67';
    for (let i = -24; i < this.canvas.width; i += 24) {
      this.ctx.fillRect(i - this.groundOffset, this.canvas.height - this.groundHeight, 12, 12);
    }

    // Draw Bird
    this.ctx.save();
    
    let drawY = this.birdY;
    if (this.state === GameState.START) {
      drawY += Math.sin(this.wingPhase * 0.5) * 10;
    }
    
    this.ctx.translate(this.birdX + this.birdWidth / 2, drawY + this.birdHeight / 2);
    
    // Rotate bird based on velocity or bobbing
    let rotation = Math.min(Math.PI / 2, Math.max(-Math.PI / 4, this.birdVelocity * 0.1));
    if (this.state === GameState.START) {
      rotation = Math.sin(this.wingPhase * 0.5) * 0.1;
    } else if (this.state === GameState.GAME_OVER && this.birdY + this.birdHeight >= this.canvas.height - this.groundHeight) {
      rotation = Math.PI / 2;
    }
    this.ctx.rotate(rotation);

    // Bird body
    this.ctx.fillStyle = '#f7d02c';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, this.birdWidth / 2, this.birdHeight / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Eye
    const isDeadOnGround = this.state === GameState.GAME_OVER && this.birdY + this.birdHeight >= this.canvas.height - this.groundHeight;
    
    if (isDeadOnGround) {
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(4, -8);
      this.ctx.lineTo(12, 0);
      this.ctx.moveTo(12, -8);
      this.ctx.lineTo(4, 0);
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(8, -4, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(10, -4, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Beak
    this.ctx.fillStyle = '#f7562c';
    this.ctx.beginPath();
    if (isDeadOnGround) {
      this.ctx.moveTo(12, 2);
      this.ctx.lineTo(20, 2);
      this.ctx.lineTo(12, 2);
    } else {
      this.ctx.moveTo(12, 0);
      this.ctx.lineTo(20, 2);
      this.ctx.lineTo(12, 4);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Wing
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    // Animate wing based on wingPhase
    const wingOffset = isDeadOnGround ? 0 : Math.sin(this.wingPhase) * 4;
    const wingRotation = isDeadOnGround ? 0 : rotation * -0.5;
    this.ctx.ellipse(-6, 2 + wingOffset, 8, 5 + Math.abs(wingOffset) * 0.5, wingRotation, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }
}
