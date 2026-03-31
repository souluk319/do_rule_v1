/**
 * 카메라 녹화 서비스
 */
interface CameraStartOptions {
  includeAudio?: boolean;
  facingMode?: 'user' | 'environment';
}

export class RecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;

  /**
   * 카메라 스트림 시작
   */
  async startCamera(options: CameraStartOptions = {}): Promise<MediaStream> {
    const {
      includeAudio = false,
      facingMode = 'user',
    } = options;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: includeAudio
      });
      return this.stream;
    } catch (error) {
      console.error('카메라 접근 실패:', error);
      throw error;
    }
  }

  /**
   * 기기가 지원하는 MIME 타입 선택 (iOS Safari는 webm 미지원)
   */
  private getSupportedMimeType(): string {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return '';
  }

  /**
   * 녹화 시작
   */
  startRecording(stream: MediaStream): void {
    if (this.isRecording) return;

    this.recordedChunks = [];
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  /**
   * 녹화 정지
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('녹화가 시작되지 않았습니다.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/mp4';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * 스트림 정지
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * 파일 다운로드
   */
  downloadVideo(blob: Blob, filename?: string): void {
    if (!filename) {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      filename = `do-rule-recording.${ext}`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Web Share API로 공유
   */
  async shareVideo(blob: Blob): Promise<boolean> {
    if (!navigator.share) {
      return false;
    }

    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `do-rule-recording.${ext}`, { type: blob.type });
      await navigator.share({
        title: '도를 아십니까 (DO-RULL)',
        text: '절대음감 리듬 게임 플레이 영상',
        files: [file]
      });
      return true;
    } catch (error) {
      console.error('공유 실패:', error);
      return false;
    }
  }
}
