import type { SoundEventType } from '../types/game';

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundEventType, AudioBuffer> = new Map();
  private isEnabled: boolean = true;
  private masterVolume: number = 0.7;

  constructor() {
    this.initializeAudioContext();
    this.loadSounds();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
      this.isEnabled = false;
    }
  }

  private async loadSounds(): Promise<void> {
    if (!this.audioContext || !this.isEnabled) return;

    const soundFiles = {
      goalScored: this.createGoalSound(),
      wallHit: this.createWallHitSound(),
      ballKick: this.createBallKickSound()
    };

    for (const [soundType, audioBuffer] of Object.entries(soundFiles)) {
      this.sounds.set(soundType as SoundEventType, audioBuffer);
    }
  }

  // Generate goal crowd sound (synthesized crowd noise)
  private createGoalSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 2.0; // 2 seconds
    const frameCount = sampleRate * duration;
    const audioBuffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        
        // Create crowd-like noise using multiple sine waves with random frequencies
        let sample = 0;
        
        // Base crowd rumble (low frequencies)
        sample += Math.sin(2 * Math.PI * 80 * time + Math.random() * 0.5) * 0.3;
        sample += Math.sin(2 * Math.PI * 120 * time + Math.random() * 0.5) * 0.25;
        
        // Mid-range crowd voices
        for (let j = 0; j < 5; j++) {
          const freq = 200 + Math.random() * 400;
          sample += Math.sin(2 * Math.PI * freq * time + Math.random() * 0.3) * 0.1;
        }
        
        // High-frequency excitement
        sample += Math.sin(2 * Math.PI * 800 * time + Math.random() * 0.8) * 0.15;
        
        // Add some noise for realism
        sample += (Math.random() - 0.5) * 0.1;
        
        // Apply envelope (fade in and out)
        const envelope = Math.sin(Math.PI * time / duration);
        sample *= envelope;
        
        // Apply volume
        channelData[i] = sample * 0.5;
      }
    }

    return audioBuffer;
  }

  // Generate wall hit sound (short impact)
  private createWallHitSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2; // 200ms
    const frameCount = sampleRate * duration;
    const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      
      // Create impact sound using noise and filtered frequencies
      let sample = 0;
      
      // Low thump
      sample += Math.sin(2 * Math.PI * 60 * time) * Math.exp(-time * 15) * 0.5;
      
      // Mid click
      sample += Math.sin(2 * Math.PI * 200 * time) * Math.exp(-time * 25) * 0.3;
      
      // High snap
      sample += Math.sin(2 * Math.PI * 800 * time) * Math.exp(-time * 40) * 0.2;
      
      // Add some noise
      sample += (Math.random() - 0.5) * Math.exp(-time * 20) * 0.1;
      
      channelData[i] = sample;
    }

    return audioBuffer;
  }

  // Generate ball kick sound (short kick impact)
  private createBallKickSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15; // 150ms
    const frameCount = sampleRate * duration;
    const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      
      // Create kick sound - softer than wall hit
      let sample = 0;
      
      // Low thump (softer)
      sample += Math.sin(2 * Math.PI * 80 * time) * Math.exp(-time * 10) * 0.4;
      
      // Mid pop
      sample += Math.sin(2 * Math.PI * 300 * time) * Math.exp(-time * 20) * 0.2;
      
      // Small amount of noise
      sample += (Math.random() - 0.5) * Math.exp(-time * 15) * 0.05;
      
      channelData[i] = sample;
    }

    return audioBuffer;
  }

  async playSound(soundType: SoundEventType, volume: number = 1.0): Promise<void> {
    if (!this.audioContext || !this.isEnabled || !this.sounds.has(soundType)) {
      return;
    }

    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const audioBuffer = this.sounds.get(soundType);
    if (!audioBuffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = audioBuffer;
    gainNode.gain.value = volume * this.masterVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isAudioEnabled(): boolean {
    return this.isEnabled && this.audioContext !== null;
  }
}