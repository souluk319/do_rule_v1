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
  const setCountdown = useGameStore(state => state.setCountdown);
  const setShowRoundClear = useGameStore(state => state.setShowRoundClear);
  const setAudioReady = useGameStore(state => state.setAudioReady);
  const setPaused = useGameStore(state => state.setPaused);
  const updatePitch = useGameStore(state => state.updatePitch);
  
  // ===== useRef: 컴포넌트 생명주기 동안 유지되는 변수 =====
  // React 리렌더링과 무관하게 값을 유지하기 위해 useRef 사용
  const audioContextRef = useRef<AudioContext | null>(null);        // Web Audio API 엔진
  const pitchDetectorRef = useRef<PitchDetector | null>(null);      // 피치 감지기 (YIN 알고리즘)
  const ollamaServiceRef = useRef(new OllamaService());             // AI 제시어 생성 서비스
  const micStreamRef = useRef<MediaStream | null>(null);            // 마이크 스트림
  const guideAudioRef = useRef<HTMLAudioElement | null>(null);      // 가이드 톤 WAV
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);         // 배경음악
  const correctSfxRef = useRef<HTMLAudioElement | null>(null);      // 정답 효과음
  const negativeSfxRef = useRef<HTMLAudioElement | null>(null);     // 오답 효과음
  const roundClearSfxRef = useRef<HTMLAudioElement | null>(null);   // 라운드 클리어 효과음
  
  const timerIntervalRef = useRef<any>(null);                       // 8초 타이머
  const pitchCheckIntervalRef = useRef<any>(null);                  // 50ms마다 피치 체크
  const usedPromptsRef = useRef<Set<string>>(new Set());            // 중복 단어 방지

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
        // ===== 🎵 가이드 톤 WAV 로드 =====
        guideAudioRef.current = new Audio('/sounds/c_gudie.wav');
        guideAudioRef.current.volume = 0.5;
        console.log('✅ 가이드 톤 WAV 로드 완료');
        
        // ===== 🎵 배경음악 로드 (재생은 카운트다운 후) =====
        bgMusicRef.current = new Audio('/sounds/bg_perc.wav');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.3;
        console.log('✅ 배경음악 로드 완료 (재생 대기)');
        
        // ===== 🎵 효과음 로드 =====
        correctSfxRef.current = new Audio('/sounds/correct.wav');
        correctSfxRef.current.volume = 0.6;
        
        negativeSfxRef.current = new Audio('/sounds/negative.wav');
        negativeSfxRef.current.volume = 0.6;
        
        roundClearSfxRef.current = new Audio('/sounds/roundclear.wav');
        roundClearSfxRef.current.volume = 0.7;
        console.log('✅ 효과음 로드 완료');
        
        console.log('✅✅✅ 오디오 초기화 완료!');
        
        // ===== 오디오 준비 완료 상태 업데이트 =====
        setAudioReady(true);
      } catch (error) {
        console.error('❌❌❌ 오디오 초기화 실패:', error);
        alert('마이크 권한이 필요합니다!');
        setAudioReady(false);
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
   * 3. 8초 타이머 시작
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
    
    const charLen = getCharLength(currentRound + 1); // 라운드별 글자 수 (1~10: 4글자, 11~20: 5글자, 21~30: 6글자)
    console.log(`📏 라운드 ${currentRound + 1} → ${charLen}글자 단어 생성`);
    
    // ===== 🎲 매 라운드마다 새로운 단어 생성 (캐싱 제거!) =====
    let word: string = '';
    
    try {
      // 🤖 gemma2:2b 호출: "N글자 단어 10개 생성해줘"
      console.log(`🤖 gemma2:2b 호출: ${charLen}글자 단어 생성 요청`);
      const words = await ollamaServiceRef.current.generatePrompts(charLen, 10, difficulty);
      
      // 중복 아닌 단어 찾기
      const newWords = words.filter(w => w.length === charLen && !usedPromptsRef.current.has(w));
      
      if (newWords.length > 0) {
        // 랜덤 선택으로 다양성 확보
        word = newWords[Math.floor(Math.random() * newWords.length)];
        console.log(`✅ gemma2:2b 응답 성공: "${word}" (후보 ${newWords.length}개)`);
      } else {
        throw new Error('유효한 단어 없음');
      }
    } catch (e) {
      console.warn('⚠️ gemma2:2b 실패 → 폴백 단어 사용');
      word = generateNaturalFallback(charLen, usedPromptsRef.current);
      console.log(`🎲 폴백 단어: "${word}"`);
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
      
      // ===== 화면에 카운트다운 표시 =====
      setCountdown(count);
      
      // 가이드톤 WAV 재생
      if (guideAudioRef.current) {
        console.log(`🔊 가이드톤 WAV 재생`);
        guideAudioRef.current.currentTime = 0;
        guideAudioRef.current.play().catch(err => console.warn('가이드톤 재생 실패:', err));
      } else {
        console.warn('⚠️ guideAudio가 null입니다!');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ===== 카운트다운 숨기기 =====
    setCountdown(null);
    console.log('✅ 카운트다운 완료!');
    
    // ===== 🎵 배경음악 시작 (처음부터 재생) =====
    if (bgMusicRef.current) {
      bgMusicRef.current.currentTime = 0; // 처음부터 재생
      bgMusicRef.current.play().catch(err => console.warn('배경음악 재생 실패:', err));
      console.log('🎵 배경음악 시작!');
    }
  };

  // 타이머 시작
  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    updateTimer(8);
    
    timerIntervalRef.current = setInterval(() => {
      // ===== 일시정지 중이면 타이머 업데이트 안 함 =====
      if (useGameStore.getState().isPaused) return;
      
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
    
    // ===== 마지막 시도인 경우 타이머 정지 (판정 완료까지 대기) =====
    if (attemptIndex === word.length - 1) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        console.log('⏸️ 마지막 시도 - 타이머 정지');
      }
    }
    
    // ===== 모든 시도 완료 시 라운드 종료 =====
    if (attemptIndex >= word.length) {
      console.log('✅ 모든 시도 완료!');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      // ===== 🎵 BGM 정지 =====
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        console.log('🎵 배경음악 정지');
      }
      
      // ===== 🎉 라운드 클리어 효과음 + 이펙트 =====
      if (roundClearSfxRef.current) {
        roundClearSfxRef.current.currentTime = 0;
        roundClearSfxRef.current.play().catch(err => console.warn('라운드 클리어 효과음 재생 실패:', err));
        console.log('🎉 라운드 클리어!');
      }
      setShowRoundClear(true);
      
      completeRound();
      
      // 폭죽 이펙트 표시 후 다음 라운드
      setTimeout(() => {
        setShowRoundClear(false);
        startNextRound();
      }, 1500); // 1.5초 동안 라운드 클리어 표시
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
    const judgmentDuration = 2000;         // 최대 2초 동안 분석
    const minDuration = 500;               // 최소 0.5초는 대기 (너무 빠른 판정 방지)
    let earlySuccessCount = 0;             // 조기 성공 카운터
    
    if (pitchCheckIntervalRef.current) {
      clearInterval(pitchCheckIntervalRef.current);
    }
    
    // ===== 50ms마다 피치 체크 (1초에 20번) =====
    pitchCheckIntervalRef.current = setInterval(() => {
      // ===== 일시정지 중이면 피치 감지 안 함 =====
      if (useGameStore.getState().isPaused) return;
      
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
      
      // ===== 조기 성공 감지 (빠른 클리어) =====
      if (elapsed >= minDuration) {
        const totalSamples = samples.length;
        const focusCount = samples.filter(n => n === focusPitch).length;
        const baseCount = samples.filter(n => n === basePitch).length;
        
        // 충분한 샘플이 모였고, 성공 조건 확실히 만족
        if (totalSamples >= 10) {
          const focusRatio = focusCount / totalSamples;
          const baseRatio = baseCount / totalSamples;
          
          const focusSuccess = focusCount >= 2 || focusRatio >= 0.05;
          const baseSuccess = baseCount >= 1 || baseRatio >= 0.3;
          
          // 연속으로 3번 성공 조건 만족 시 조기 종료 (빠른 응답!)
          if (focusSuccess && baseSuccess) {
            earlySuccessCount++;
            if (earlySuccessCount >= 3) {  // 5번 → 3번으로 완화
              console.log('⚡ 조기 성공 감지!');
              clearInterval(pitchCheckIntervalRef.current);
              
              const success = true;
              const accuracy = (focusRatio + baseRatio) / 2;
              handleCompleteAttempt(success, accuracy);
              return;
            }
          } else {
            earlySuccessCount = 0;
          }
        }
      }
      
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
    
    // ===== 🎵 효과음 재생 =====
    if (success && correctSfxRef.current) {
      correctSfxRef.current.currentTime = 0;
      correctSfxRef.current.play().catch(err => console.warn('정답 효과음 재생 실패:', err));
      console.log('✅ 정답 효과음 재생');
    } else if (!success && negativeSfxRef.current) {
      negativeSfxRef.current.currentTime = 0;
      negativeSfxRef.current.play().catch(err => console.warn('오답 효과음 재생 실패:', err));
      console.log('❌ 오답 효과음 재생');
    }
    
    const nextAttempt = useGameStore.getState().currentAttempt + 1;
    const word = useGameStore.getState().currentWord;
    
    // ===== 즉시 다음 시도 (성공: 0.1초, 실패: 0.3초) =====
    if (nextAttempt >= word.length) {
      startAttempt(nextAttempt);  // 모든 시도 완료 → 즉시 라운드 종료
    } else {
      setTimeout(() => startAttempt(nextAttempt), success ? 100 : 300);
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
    
    // ===== 🎵 BGM 정지 =====
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      console.log('🎵 배경음악 정지');
    }
    
    // 남은 시도 모두 실패 처리
    const state = useGameStore.getState();
    for (let i = state.currentAttempt; i < state.currentWord.length; i++) {
      completeAttempt(false, 0);
    }
    
    completeRound();
    setTimeout(() => startNextRound(), 800); // 0.8초 후 다음 라운드 (빠른 전환)
  };

  // 헬퍼 함수들
  const getCharLength = (round: number): number => {
    if (round <= 10) return 4;  // 1~10 라운드: 4글자
    if (round <= 20) return 5;  // 11~20 라운드: 5글자
    return 6;                   // 21~30 라운드: 6글자
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

  // ===== 일시정지/재개 함수 =====
  const togglePause = () => {
    const isPaused = useGameStore.getState().isPaused;
    
    if (!isPaused) {
      // ===== 일시정지 =====
      console.log('⏸️ 게임 일시정지');
      
      // BGM 정지
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
      }
      
      setPaused(true);
    } else {
      // ===== 재개 =====
      console.log('▶️ 게임 재개');
      
      // BGM 재개
      if (bgMusicRef.current && !useGameStore.getState().countdown) {
        bgMusicRef.current.play().catch(err => console.warn('BGM 재개 실패:', err));
      }
      
      setPaused(false);
    }
  };

  const unlockAudio = async () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'running') {
      await audioContextRef.current.resume();
    }

    const audioElements = [
      guideAudioRef.current,
      bgMusicRef.current,
      correctSfxRef.current,
      negativeSfxRef.current,
      roundClearSfxRef.current,
    ].filter(Boolean) as HTMLAudioElement[];

    await Promise.all(audioElements.map(async (audio) => {
      audio.muted = true;
      audio.setAttribute('playsinline', 'true');

      try {
        audio.currentTime = 0;
        await audio.play();
        audio.pause();
      } catch (error) {
        console.warn('오디오 언락 실패:', error);
      } finally {
        audio.currentTime = 0;
        audio.muted = false;
      }
    }));
  };

  return {
    startNextRound,
    unlockAudio,
    togglePause,
  };
};
