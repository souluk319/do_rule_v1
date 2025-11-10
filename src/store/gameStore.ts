/**
 * ============================================
 * 📌 gameStore.ts - 전역 상태 관리 (Zustand)
 * ============================================
 * 
 * 게임의 모든 상태를 중앙에서 관리합니다.
 * 여러 컴포넌트에서 동시에 접근 가능!
 * 
 * 저장되는 정보:
 * - 게임 설정: 닉네임, 성별, 난이도
 * - 현재 상태: 라운드, 점수, 콤보, 타이머
 * - 현재 단어: 제시어, 시도 번호, 결과
 * - 피치 정보: 감지된 음정, 오차
 * 
 * 사용 예:
 * const score = useGameStore(state => state.score);
 * const updateTimer = useGameStore(state => state.updateTimer);
 */

import { create } from 'zustand';

interface AttemptResult {
  success: boolean;
  accuracy: number;
}

interface GameStore {
  // 게임 설정
  nickname: string;
  gender: 'male' | 'female';
  difficulty: 'easy' | 'normal' | 'hard';
  cameraMode: boolean;

  // 게임 상태
  currentRound: number;
  score: number;
  combo: number;
  maxCombo: number;
  
  // 현재 라운드
  currentWord: string;
  currentAttempt: number;
  currentAttemptResults: AttemptResult[];
  
  // 타이머
  timeRemaining: number;
  isAttempting: boolean;
  
  // 카운트다운
  countdown: string | null;
  
  // 라운드 클리어
  showRoundClear: boolean;
  
  // 오디오 준비 상태
  audioReady: boolean;
  
  // 일시정지
  isPaused: boolean;
  
  // 피치 감지
  detectedNote: string;
  detectedCents: number;
  isAccurate: boolean;
  
  // 액션
  setConfig: (config: { nickname: string; gender: 'male' | 'female'; difficulty: 'easy' | 'normal' | 'hard'; cameraMode: boolean }) => void;
  startRound: (word: string) => void;
  setCurrentAttempt: (attempt: number) => void;
  completeAttempt: (success: boolean, accuracy: number) => void;
  completeRound: () => void;
  updateTimer: (time: number) => void;
  setCountdown: (countdown: string | null) => void;
  setShowRoundClear: (show: boolean) => void;
  setAudioReady: (ready: boolean) => void;
  setPaused: (paused: boolean) => void;
  updatePitch: (note: string, cents: number, isAccurate: boolean) => void;
  setIsAttempting: (attempting: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // 초기값
  nickname: '',
  gender: 'male',
  difficulty: 'normal',
  cameraMode: false,
  
  currentRound: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  
  currentWord: '',
  currentAttempt: 0,
  currentAttemptResults: [],
  
  timeRemaining: 15,
  isAttempting: false,
  
  countdown: null,
  showRoundClear: false,
  audioReady: false,
  isPaused: false,
  
  detectedNote: '---',
  detectedCents: 0,
  isAccurate: false,
  
  // 액션
  setConfig: (config) => set({
    nickname: config.nickname,
    gender: config.gender,
    difficulty: config.difficulty,
    cameraMode: config.cameraMode,
  }),
  
  startRound: (word) => set({
    currentWord: word,
    currentAttempt: 0,
    currentAttemptResults: [],
    timeRemaining: 15,
    isAttempting: false,
  }),
  
  setCurrentAttempt: (attempt) => set({
    currentAttempt: attempt,
    isAttempting: true,
  }),
  
  completeAttempt: (success, accuracy) => set((state) => {
    const newResults = [...state.currentAttemptResults];
    newResults[state.currentAttempt] = { success, accuracy };
    
    let newCombo = state.combo;
    let newScore = state.score;
    
    if (success) {
      newCombo += 1;
      const multiplier = Math.min(Math.floor(newCombo / 5) + 1, 3);
      const basePoints = state.difficulty === 'hard' ? 150 : state.difficulty === 'normal' ? 100 : 50;
      const accuracyBonus = Math.floor(accuracy * 50);
      const points = (basePoints + accuracyBonus) * multiplier;
      newScore += points;
      
      console.log(`💰 점수 획득! +${points}점 (기본: ${basePoints}, 정확도: ${accuracyBonus}, 배수: x${multiplier}) → 총점: ${newScore}`);
    } else {
      newCombo = 0;
    }
    
    return {
      currentAttemptResults: newResults,
      combo: newCombo,
      maxCombo: Math.max(state.maxCombo, newCombo),
      score: newScore,
      isAttempting: false,
    };
  }),
  
  completeRound: () => set((state) => ({
    currentRound: state.currentRound + 1,
  })),
  
  updateTimer: (time) => set({ timeRemaining: time }),
  
  setCountdown: (countdown) => set({ countdown }),
  
  setShowRoundClear: (show) => set({ showRoundClear: show }),
  
  setAudioReady: (ready) => set({ audioReady: ready }),
  
  setPaused: (paused) => set({ isPaused: paused }),
  
  updatePitch: (note, cents, isAccurate) => set({
    detectedNote: note,
    detectedCents: cents,
    isAccurate: isAccurate,
  }),
  
  setIsAttempting: (attempting) => set({ isAttempting: attempting }),
  
  resetGame: () => set({
    currentRound: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    currentWord: '',
    currentAttempt: 0,
    currentAttemptResults: [],
    timeRemaining: 15,
    isAttempting: false,
    detectedNote: '---',
    detectedCents: 0,
    isAccurate: false,
  }),
}));

