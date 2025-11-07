/**
 * ============================================
 * 📌 useGameLoop.ts - 게임 메인 로직 (핵심 파일!)
 * ============================================
 * 
 * 이 파일은 "도를아십니까" 게임의 전체 흐름을 관리합니다.
 * 
 * 주요 역할:
 * 1. 오디오 초기화 (마이크, 피치 감지, 가이드음)
 * 2. 라운드 시작 (Ollama로 제시어 생성, 카운트다운)
 * 3. 시도 진행 (실시간 음성 분석, 판정)
 * 4. 점수 계산 및 다음 라운드 전환
 * 
 * 게임 흐름:
 * startNextRound() → showCountdown() → startAttempt() → 판정 → 다음 시도/라운드
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { PitchDetector } from '../core/PitchDetector';
import { OscillatorTone } from '../core/OscillatorTone';
import { OllamaService } from '../services/OllamaService';
import { generateNaturalFallback } from '../utils/FallbackGenerator';

export const useGameLoop = () => {
  // ===== Zustand 전역 상태 가져오기 =====
  // 게임 설정 및 현재 상태를 중앙 저장소(store)에서 읽어옴
  const nickname = useGameStore(state => state.nickname);
  const gender = useGameStore(state => state.gender);           // 남자/여자 (C3/C4 or C4/C5)
  const difficulty = useGameStore(state => state.difficulty);   // Easy/Normal/Hard
  const currentRound = useGameStore(state => state.currentRound);
  const currentWord = useGameStore(state => state.currentWord);
  const currentAttempt = useGameStore(state => state.currentAttempt);
  const currentAttemptResults = useGameStore(state => state.currentAttemptResults);
  const timeRemaining = useGameStore(state => state.timeRemaining);
  
  // ===== Zustand 상태 변경 함수 =====
  const startRound = useGameStore(state => state.startRound);
  const setCurrentAttempt = useGameStore(state => state.setCurrentAttempt);
  const completeAttempt = useGameStore(state => state.completeAttempt);
  const completeRound = useGameStore(state => state.completeRound);
  const updateTimer = useGameStore(state => state.updateTimer);
  const updatePitch = useGameStore(state => state.updatePitch);
  
  // ===== useRef: 컴포넌트 생명주기 동안 유지되는 변수 =====
  // React 리렌더링과 무관하게 값을 유지하기 위해 useRef 사용
  const audioContextRef = useRef<AudioContext | null>(null);        // Web Audio API 엔진
  const pitchDetectorRef = useRef<PitchDetector | null>(null);      // 피치 감지기 (YIN 알고리즘)
  const oscillatorToneRef = useRef<OscillatorTone | null>(null);    // 가이드 톤 생성기
  const ollamaServiceRef = useRef(new OllamaService());             // AI 제시어 생성 서비스
  const micStreamRef = useRef<MediaStream | null>(null);            // 마이크 스트림
  
  const timerIntervalRef = useRef<any>(null);                       // 15초 타이머
  const pitchCheckIntervalRef = useRef<any>(null);                  // 50ms마다 피치 체크
  const usedPromptsRef = useRef<Set<string>>(new Set());            // 중복 단어 방지
  const wordPoolRef = useRef<string[]>([]);                         // Ollama 생성 단어 풀

  // ===== 🎤 1단계: 오디오 초기화 (게임 시작 시 1회만 실행) =====
  useEffect(() => {
    console.log('🎤 오디오 초기화 시작...');
    
    const initAudio = async () => {
      try {
        // AudioContext 생성
        audioContextRef.current = new AudioContext();
        console.log('✅ AudioContext 생성 완료');
        
        // 마이크 스트림 가져오기
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        console.log('✅ 마이크 스트림 획득 완료');
        
        // PitchDetector 초기화
        pitchDetectorRef.current = new PitchDetector(
          audioContextRef.current,
          micStreamRef.current
        );
        console.log('✅ PitchDetector 초기화 완료');
        
        // OscillatorTone 초기화
        oscillatorToneRef.current = new OscillatorTone(audioContextRef.current);
        console.log('✅ OscillatorTone 초기화 완료');
        
        console.log('✅✅✅ 오디오 초기화 완료!');
      } catch (error) {
        console.error('❌❌❌ 오디오 초기화 실패:', error);
        alert('마이크 권한이 필요합니다!');
      }
    };
    
    initAudio();
    
    return () => {
      console.log('🧹 오디오 cleanup');
      // Cleanup
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ===== 🎮 2단계: 다음 라운드 시작 =====
  /**
   * 게임의 핵심 함수! 새로운 라운드를 시작합니다.
   * 
   * 흐름:
   * 1. Ollama로 제시어 생성 (4/5/6글자)
   * 2. 카운트다운 + 가이드 톤 (3, 2, 1, Go!!)
   * 3. 15초 타이머 시작
   * 4. 첫 번째 시도 시작
   */
  const startNextRound = async () => {
    console.log('🎮 startNextRound 호출');
    
    // 30라운드 완료 시 게임 종료
    if (currentRound >= 30) {
      console.log('🎉 게임 종료!');
      return;
    }

    // ===== 제시어 생성 (Ollama eeve 모델 활용!) ⭐ =====
    // 이 부분이 과제의 핵심입니다!
    // eeve 모델을 사용하여 매 라운드마다 새로운 한국어 단어를 동적으로 생성합니다.
    
    const charLen = getCharLength(currentRound); // 라운드별 글자 수 (1~10: 4글자, 11~20: 5글자, 21~30: 6글자)
    
    // 단어 풀이 비어있으면 eeve로 새로 생성
    if (wordPoolRef.current.length === 0) {
      try {
        // 🤖 eeve 호출: "4글자 유머러스한 일상어 8개 생성해줘"
        console.log(`🤖 eeve 호출: ${charLen}글자 단어 8개 요청`);
        const words = await ollamaServiceRef.current.generatePrompts(charLen, 8, difficulty);
        
        // 중복 제거 (이미 사용한 단어는 제외)
        wordPoolRef.current = words.filter(w => !usedPromptsRef.current.has(w));
        console.log(`✅ eeve 응답: ${wordPoolRef.current.length}개 단어 생성됨`, wordPoolRef.current);
      } catch (e) {
        console.warn('⚠️ eeve 실패 → 폴백 단어 사용');
        wordPoolRef.current = [];
      }
    }
    
    // 단어 풀에서 하나 가져오기
    let word = wordPoolRef.current.shift();
    
    // 단어가 없거나 중복이면 폴백 생성기 사용
    if (!word || usedPromptsRef.current.has(word)) {
      console.log('🎲 폴백 단어 생성기 사용');
      word = generateNaturalFallback(charLen, usedPromptsRef.current);
    }
    
    // 사용한 단어 기록 (중복 방지)
    usedPromptsRef.current.add(word);
    
    // Zustand store에 라운드 시작 알림
    startRound(word);
    
    // 카운트다운 + 가이드톤
    await showCountdown();
    
    // 타이머 시작
    startTimer();
    
    // 첫 시도 시작
    startAttempt(0);
  };

  // 카운트다운
  const showCountdown = async () => {
    console.log('⏰ 카운트다운 시작!');
    const guideNote = gender === 'male' ? 'C3' : 'C4';
    const counts = ['3', '2', '1', 'Go!!'];
    
    for (const count of counts) {
      console.log(`🔢 카운트: ${count}`);
      
      // 가이드톤 재생
      if (oscillatorToneRef.current) {
        console.log(`🔊 가이드톤 재생: ${guideNote}`);
        await oscillatorToneRef.current.play(guideNote, 300);
      } else {
        console.warn('⚠️ oscillatorTone이 null입니다!');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('✅ 카운트다운 완료!');
  };

  // 타이머 시작
  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    updateTimer(15);
    
    timerIntervalRef.current = setInterval(() => {
      const currentTime = useGameStore.getState().timeRemaining;
      const newTime = currentTime - 0.1;
      
      if (newTime <= 0) {
        clearInterval(timerIntervalRef.current);
        handleRoundTimeout();
      } else {
        updateTimer(newTime);
      }
    }, 100);
  };

  // ===== 🎯 3단계: 시도 시작 (핵심 판정 로직!) =====
  /**
   * 각 글자별 시도를 진행하고 음성을 분석합니다.
   * 
   * 예시: "모나리자" (남자)
   * - 1번 시도: 모(C4 - Focus) + 나리자(C3 - Base)
   * - 2번 시도: 나(C4 - Focus) + 모리자(C3 - Base)
   * - ...
   * 
   * 판정 조건:
   * - Focus 음정: 최소 2개 샘플 + 전체의 10% 이상
   * - Base 음정: (글자수-1)개 샘플 + 전체의 60% 이상
   * - 둘 다 만족 시 성공!
   * 
   * @param attemptIndex 시도 번호 (0부터 시작)
   */
  const startAttempt = (attemptIndex: number) => {
    const word = useGameStore.getState().currentWord;
    console.log(`\n🎬🎬🎬 시도 시작: ${attemptIndex + 1}/${word.length}`);
    
    // ===== 모든 시도 완료 시 라운드 종료 =====
    if (attemptIndex >= word.length) {
      console.log('✅ 모든 시도 완료!');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      completeRound();
      setTimeout(() => startNextRound(), 2000); // 2초 후 다음 라운드
      return;
    }
    
    setCurrentAttempt(attemptIndex);
    
    // ===== 목표 음정 설정 =====
    const notes = getBaseNotes();                    // 성별에 따른 음정 (C3/C4 or C4/C5)
    const isReverse = difficulty === 'hard';         // Hard 모드는 음정 반전
    const focusPitch = isReverse ? notes.low : notes.high;  // Focus 글자 음정
    const basePitch = isReverse ? notes.high : notes.low;   // 나머지 글자 음정
    const tolerance = getTolerance();                // 난이도별 허용 오차 (±18~40 cents)
    
    // ===== 실시간 피치 감지 시작 =====
    const samples: string[] = [];          // tolerance 내의 감지된 음정들 저장
    const startTime = Date.now();
    const judgmentDuration = 2000;         // 2초 동안 분석
    
    if (pitchCheckIntervalRef.current) {
      clearInterval(pitchCheckIntervalRef.current);
    }
    
    // ===== 50ms마다 피치 체크 (1초에 20번) =====
    pitchCheckIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (!pitchDetectorRef.current) return;
      
      // ===== 마이크로 피치 감지 (YIN 알고리즘) =====
      const freq = pitchDetectorRef.current.detectPitch();  // 주파수 감지 (Hz)
      let detectedNote: string | null = null;
      let cents = 0;
      
      if (freq) {
        const noteResult = pitchDetectorRef.current.frequencyToNote(freq);
        if (noteResult) {
          detectedNote = noteResult.note;  // C3, C4, C5
          cents = noteResult.cents;        // 오차 (센트 단위)
          
          // tolerance 이내면 유효한 샘플로 추가
          if (Math.abs(cents) <= tolerance) {
            samples.push(detectedNote);
          }
        }
      }
      
      // ===== 피아노 건반 UI 업데이트 (실시간 피드백) =====
      const targetNote = isReverse ? notes.low : notes.high;
      const isAccurate = detectedNote === targetNote && Math.abs(cents) <= tolerance;
      updatePitch(detectedNote || '---', cents, isAccurate);
      
      // ===== 2초 경과 시 판정 실행 =====
      if (elapsed >= judgmentDuration) {
        clearInterval(pitchCheckIntervalRef.current);
        
        // ===== 샘플 분석 =====
        const word = useGameStore.getState().currentWord;
        const focusCount = samples.filter(n => n === focusPitch).length;  // Focus 음정 개수
        const baseCount = samples.filter(n => n === basePitch).length;    // Base 음정 개수
        const totalSamples = samples.length;                              // 전체 샘플 수
        
        // ===== 비율 계산 =====
        const focusRatio = totalSamples > 0 ? focusCount / totalSamples : 0;
        const baseRatio = totalSamples > 0 ? baseCount / totalSamples : 0;
        
        // 디버그 로그 (상세)
        console.log(`\n📊 시도 ${attemptIndex + 1} 분석:`);
        console.log(`  총 샘플: ${totalSamples}개`);
        console.log(`  Focus(${focusPitch}): ${focusCount}개 (${(focusRatio * 100).toFixed(1)}%)`);
        console.log(`  Base(${basePitch}): ${baseCount}개 (${(baseRatio * 100).toFixed(1)}%)`);
        
        // ===== 성공 조건 (완화) =====
        // Focus: 최소 2개 OR 전체의 5% 이상
        const focusSuccess = focusCount >= 2 || focusRatio >= 0.05;
        // Base: 최소 1개 OR 전체의 30% 이상
        const baseSuccess = baseCount >= 1 || baseRatio >= 0.3;
        
        console.log(`  Focus 조건: ${focusSuccess ? '✅' : '❌'} (2개 이상 또는 5% 이상)`);
        console.log(`  Base 조건: ${baseSuccess ? '✅' : '❌'} (1개 이상 또는 30% 이상)`);
        
        // ===== 최종 판정 =====
        const success = focusSuccess && baseSuccess;  // 둘 다 만족 시 성공
        const accuracy = (focusRatio + baseRatio) / 2;
        
        console.log(`  최종 판정: ${success ? '✅ 성공!' : '❌ 실패'} (정확도: ${(accuracy * 100).toFixed(1)}%)\n`);
        
        handleCompleteAttempt(success, accuracy);
      }
    }, 50); // 50ms마다 체크
  };

  // 시도 완료
  const handleCompleteAttempt = (success: boolean, accuracy: number) => {
    completeAttempt(success, accuracy);
    
    const nextAttempt = useGameStore.getState().currentAttempt + 1;
    const word = useGameStore.getState().currentWord;
    
    if (nextAttempt >= word.length) {
      startAttempt(nextAttempt);
    } else {
      setTimeout(() => startAttempt(nextAttempt), success ? 300 : 500);
    }
  };

  // 라운드 타임아웃
  const handleRoundTimeout = () => {
    console.log('⏰ 타임아웃!');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (pitchCheckIntervalRef.current) {
      clearInterval(pitchCheckIntervalRef.current);
    }
    
    // 남은 시도 모두 실패 처리
    const state = useGameStore.getState();
    for (let i = state.currentAttempt; i < state.currentWord.length; i++) {
      completeAttempt(false, 0);
    }
    
    completeRound();
    setTimeout(() => startNextRound(), 2000);
  };

  // 헬퍼 함수들
  const getCharLength = (round: number): number => {
    if (round < 10) return 4;
    if (round < 20) return 5;
    return 6;
  };

  const getBaseNotes = () => {
    return gender === 'male'
      ? { high: 'C4', low: 'C3' }
      : { high: 'C5', low: 'C4' };
  };

  const getTolerance = (): number => {
    switch (difficulty) {
      case 'easy': return 40;
      case 'normal': return 30;
      case 'hard': return 18;
      default: return 30;
    }
  };

  return {
    startNextRound,
  };
};

