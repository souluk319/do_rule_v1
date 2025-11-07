/**
 * 게임 상태 관리
 */
export interface GameConfig {
  nickname: string;
  gender: 'male' | 'female';
  difficulty: 'easy' | 'normal' | 'hard';
  cameraMode: boolean;
}

export interface AttemptResult {
  success: boolean;
  accuracy: number;
  timestamp: number;
}

export interface RoundResult {
  word: string;
  attempts: AttemptResult[];
  allPassed: boolean;
}

export class GameState {
  config: GameConfig;
  currentRound: number = 0;
  maxRounds: number = 30;
  rounds: RoundResult[] = [];
  score: number = 0;

  // 현재 라운드 상태
  currentWord: string = '';
  currentAttempt: number = 0;
  currentAttemptResults: AttemptResult[] = [];

  // 콤보 시스템
  combo: number = 0;
  maxCombo: number = 0;
  consecutiveSuccess: number = 0;

  // 중복 제거용
  usedPrompts: Set<string> = new Set();

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * 현재 라운드의 글자 수
   */
  getCurrentCharLength(): number {
    if (this.currentRound <= 10) return 4;
    if (this.currentRound <= 20) return 5;
    return 6;
  }

  /**
   * 난이도별 허용 오차 (cents)
   */
  getTolerance(): number {
    switch (this.config.difficulty) {
      case 'easy': return 40;
      case 'normal': return 25;
      case 'hard': return 18;
    }
  }

  /**
   * 성별별 기준 음정
   */
  getBaseNotes(): { high: string; low: string } {
    const isReverse = this.config.difficulty === 'hard';
    
    if (this.config.gender === 'male') {
      return {
        high: isReverse ? 'C3' : 'C4',
        low: isReverse ? 'C4' : 'C3'
      };
    } else {
      return {
        high: isReverse ? 'C4' : 'C5',
        low: isReverse ? 'C5' : 'C4'
      };
    }
  }

  /**
   * 현재 시도의 목표 음정
   */
  getCurrentTargetNote(): string {
    const notes = this.getBaseNotes();
    const isReverse = this.config.difficulty === 'hard';
    // 포커스 글자는 높은 도, 나머지는 낮은 도 (Reverse 모드는 반대)
    return isReverse ? notes.low : notes.high;
  }

  /**
   * 라운드 시작
   */
  startRound(word: string): void {
    this.currentWord = word;
    this.currentAttempt = 0;
    this.currentAttemptResults = [];
    this.usedPrompts.add(word); // 중복 방지
  }

  /**
   * 라운드 재시도 (같은 제시어)
   */
  retryRound(): void {
    this.currentAttempt = 0;
    this.currentAttemptResults = [];
    // currentWord는 유지
  }

  /**
   * 시도 완료
   */
  completeAttempt(successOrResult: boolean | AttemptResult, accuracy?: number): void {
    let result: AttemptResult;
    
    // 오버로드 처리
    if (typeof successOrResult === 'boolean') {
      result = {
        success: successOrResult,
        accuracy: accuracy || 0,
        timestamp: Date.now()
      };
    } else {
      result = successOrResult;
    }
    
    this.currentAttemptResults.push(result);
    this.currentAttempt++;

    // 콤보 시스템
    if (result.success) {
      this.combo++;
      this.consecutiveSuccess++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
    } else {
      this.combo = 0;
      this.consecutiveSuccess = 0;
    }
  }

  /**
   * 라운드 완료
   */
  completeRound(): void {
    const allPassed = this.currentAttemptResults.every(r => r.success);
    const roundResult: RoundResult = {
      word: this.currentWord,
      attempts: [...this.currentAttemptResults],
      allPassed
    };
    
    this.rounds.push(roundResult);
    if (allPassed) {
      // 기본 점수
      let points = 100 * this.currentWord.length;
      
      // 콤보 보너스 (2x, 3x, 5x, 10x)
      if (this.combo >= 10) {
        points = Math.floor(points * 3);
      } else if (this.combo >= 5) {
        points = Math.floor(points * 2);
      } else if (this.combo >= 3) {
        points = Math.floor(points * 1.5);
      }
      
      this.score += points;
    }
    
    this.currentRound++;
  }

  /**
   * 콤보 배수 계산
   */
  getComboMultiplier(): number {
    if (this.combo >= 10) return 3;
    if (this.combo >= 5) return 2;
    if (this.combo >= 3) return 1.5;
    return 1;
  }

  /**
   * 콤보 메시지
   */
  getComboMessage(): string {
    if (this.combo >= 10) return 'LEGENDARY!';
    if (this.combo >= 5) return 'AWESOME!';
    if (this.combo >= 3) return 'GREAT!';
    if (this.combo >= 2) return 'GOOD!';
    return '';
  }

  /**
   * 게임 종료 여부
   */
  isGameOver(): boolean {
    return this.currentRound >= this.maxRounds;
  }
}

