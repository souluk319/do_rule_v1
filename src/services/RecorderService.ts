/**
 * 카메라 녹화 서비스
 */
export class RecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;

  /**
   * 카메라 스트림 시작
   */
  async startCamera(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 390, height: 844 },
        audio: true
      });
      return this.stream;
    } catch (error) {
      console.error('카메라 접근 실패:', error);
      throw error;
    }
  }

  /**
   * 녹화 시작
   */
  startRecording(stream: MediaStream): void {
    if (this.isRecording) return;

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

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
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
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
  downloadVideo(blob: Blob, filename: string = 'do-rule-recording.webm'): void {
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
      const file = new File([blob], 'do-rule-recording.webm', { type: 'video/webm' });
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

