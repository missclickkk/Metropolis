class SfxEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(freq: number, endFreq: number, duration: number, type: OscillatorType, gainPeak = 0.08) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  click() {
    const jitter = 0.94 + Math.random() * 0.12;
    this.playTone(520 * jitter, 780 * jitter, 0.09, 'triangle', 0.07);
  }

  mine() {
    const jitter = 0.92 + Math.random() * 0.16;
    this.playTone(260 * jitter, 120 * jitter, 0.11, 'square', 0.05);
  }

  cash() {
    this.playTone(660, 990, 0.12, 'sine', 0.07);
    setTimeout(() => this.playTone(880, 1320, 0.14, 'sine', 0.06), 70);
  }

  warn() {
    this.playTone(180, 110, 0.22, 'sawtooth', 0.07);
  }

  levelUp() {
    this.playTone(440, 554, 0.12, 'triangle', 0.08);
    setTimeout(() => this.playTone(554, 659, 0.12, 'triangle', 0.08), 90);
    setTimeout(() => this.playTone(659, 880, 0.2, 'triangle', 0.08), 180);
  }
}

export const sfx = new SfxEngine();
