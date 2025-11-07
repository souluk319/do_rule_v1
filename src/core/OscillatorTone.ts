/**
 * 실시간 사인파 오실레이터 (가이드톤 생성)
 * C3, C4, C5 음정 생성
 */
export class OscillatorTone {
  private audioContext: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  // 음정 주파수
  private readonly frequencies = {
    C3: 130.81,
    C4: 261.63,
    C5: 523.25
  };

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * 가이드톤 재생
   * @param note 음정 ('C3', 'C4', 'C5')
   * @param duration 재생 시간 (ms), 0이면 무한 재생
   */
  async play(note: 'C3' | 'C4' | 'C5', duration: number = 0): Promise<void> {
    this.stop();

    if (this.audioContext.state !== 'running') {
      await this.audioContext.resume();
    }

    const frequency = this.frequencies[note];
    
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = frequency;

    // 부드러운 페이드 인/아웃
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.1); // 볼륨 50%로 증가

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.start();

    if (duration > 0) {
      const stopTime = this.audioContext.currentTime + duration / 1000;
      this.gainNode.gain.linearRampToValueAtTime(0, stopTime - 0.1);
      this.oscillator.stop(stopTime);
    }
  }

  /**
   * 가이드톤 정지
   */
  stop(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // 이미 정지된 경우 무시
      }
      this.oscillator = null;
    }
    this.gainNode = null;
  }

  /**
   * 볼륨 조절
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }
}

