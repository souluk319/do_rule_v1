/**
 * ============================================
 * useGameLoop.ts - 게임 메인 로직
 * ============================================
 *
 * 게임 흐름:
 * startNextRound() → showCountdown() → startAttempt() → 판정 → 다음 시도/라운드
 *
 * v2 변경사항:
 * - onGameEnd 콜백으로 결과 화면 전환
 * - AI_CONFIG.enabled 플래그로 Ollama 연결 on/off
 * - 타임아웃 시 failRemainingAttempts()로 루프 버그 수정
 * - TIMER_DURATION 상수 통일
 */

import { useEffect, useRef } from 'react';
import { useGameStore, TIMER_DURATION } from '../store/gameStore';
import { PitchDetector } from '../core/PitchDetector';
import { OllamaService } from '../services/OllamaService';
import { generateNaturalFallback } from '../utils/FallbackGenerator';
import { AI_CONFIG } from '../config/aiConfig';
import type { GameResult } from '../types';

interface UseGameLoopOptions {
  onGameEnd: (result: GameResult) => void;
}

export const useGameLoop = ({ onGameEnd }: UseGameLoopOptions) => {
  // ── Zustand 상태 ──────────────────────────────
  const nickname = useGameStore(state => state.nickname);
  const gender = useGameStore(state => state.gender);
  const difficulty = useGameStore(state => state.difficulty);
  const currentRound = useGameStore(state => state.currentRound);

  const startRound = useGameStore(state => state.startRound);
  const setCurrentAttempt = useGameStore(state => state.setCurrentAttempt);
  const completeAttempt = useGameStore(state => state.completeAttempt);
  const failRemainingAttempts = useGameStore(state => state.failRemainingAttempts);
  const completeRound = useGameStore(state => state.completeRound);
  const updateTimer = useGameStore(state => state.updateTimer);
  const setCountdown = useGameStore(state => state.setCountdown);
  const setShowRoundClear = useGameStore(state => state.setShowRoundClear);
  const setAudioReady = useGameStore(state => state.setAudioReady);
  const setPaused = useGameStore(state => state.setPaused);
  const updatePitch = useGameStore(state => state.updatePitch);

  // ── Refs (리렌더링과 무관하게 유지) ──────────
  const audioContextRef = useRef<AudioContext | null>(null);
  const pitchDetectorRef = useRef<PitchDetector | null>(null);
  const ollamaServiceRef = useRef(new OllamaService());
  const micStreamRef = useRef<MediaStream | null>(null);
  const guideAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const correctSfxRef = useRef<HTMLAudioElement | null>(null);
  const negativeSfxRef = useRef<HTMLAudioElement | null>(null);
  const roundClearSfxRef = useRef<HTMLAudioElement | null>(null);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pitchCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedPromptsRef = useRef<Set<string>>(new Set());

  // ── 1. 오디오 초기화 ──────────────────────────
  useEffect(() => {
    console.log('🎤 오디오 초기화 시작...');

    const initAudio = async () => {
      try {
        audioContextRef.current = new AudioContext();

        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        pitchDetectorRef.current = new PitchDetector(
          audioContextRef.current,
          micStreamRef.current
        );

        guideAudioRef.current = new Audio('/sounds/c_gudie.wav');
        guideAudioRef.current.volume = 0.5;

        bgMusicRef.current = new Audio('/sounds/bg_perc.wav');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.3;

        correctSfxRef.current = new Audio('/sounds/correct.wav');
        correctSfxRef.current.volume = 0.6;

        negativeSfxRef.current = new Audio('/sounds/negative.wav');
        negativeSfxRef.current.volume = 0.6;

        roundClearSfxRef.current = new Audio('/sounds/roundclear.wav');
        roundClearSfxRef.current.volume = 0.7;

        console.log('✅ 오디오 초기화 완료');
        setAudioReady(true);
      } catch (error) {
        console.error('❌ 오디오 초기화 실패:', error);
        alert('마이크 권한이 필요합니다!');
        setAudioReady(false);
      }
    };

    initAudio();

    return () => {
      // Cleanup: intervals
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (pitchCheckIntervalRef.current) clearInterval(pitchCheckIntervalRef.current);
      // Cleanup: 오디오
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
      bgMusicRef.current?.pause();
    };
  }, []);

  // ── 2. 다음 라운드 시작 ───────────────────────
  const startNextRound = async () => {
    console.log('🎮 startNextRound 호출');

    // 30라운드 완료 → 게임 종료
    if (currentRound >= 30) {
      console.log('🎉 30라운드 완료! 게임 종료');
      const state = useGameStore.getState();
      const successRate =
        state.totalAttempts > 0
          ? (state.totalSuccesses / state.totalAttempts) * 100
          : 0;

      onGameEnd({
        score: state.score,
        maxCombo: state.maxCombo,
        successRate,
      });
      return;
    }

    const charLen = getCharLength(currentRound + 1);
    console.log(`📏 라운드 ${currentRound + 1} → ${charLen}글자 단어 생성`);

    let word = '';

    // ── AI 연동 (aiConfig.ts의 enabled 플래그로 제어) ──
    if (AI_CONFIG.enabled) {
      try {
        console.log(`🤖 Ollama(${AI_CONFIG.model}) 호출...`);
        const words = await ollamaServiceRef.current.generatePrompts(charLen, 10, difficulty);
        const newWords = words.filter(w => w.length === charLen && !usedPromptsRef.current.has(w));

        if (newWords.length > 0) {
          word = newWords[Math.floor(Math.random() * newWords.length)];
          console.log(`✅ AI 응답 성공: "${word}"`);
        } else {
          throw new Error('유효한 단어 없음');
        }
      } catch (e) {
        console.warn('⚠️ AI 호출 실패 → 폴백 단어 사용');
        word = generateNaturalFallback(charLen, usedPromptsRef.current);
      }
    } else {
      // AI 비활성화: 즉시 폴백 사용
      word = generateNaturalFallback(charLen, usedPromptsRef.current);
      console.log(`🎲 폴백 단어: "${word}"`);
    }

    usedPromptsRef.current.add(word);
    startRound(word);

    await showCountdown();
    startTimer();
    startAttempt(0);
  };

  // ── 카운트다운 ────────────────────────────────
  const showCountdown = async () => {
    const counts = ['3', '2', '1', 'Go!!'];

    for (const count of counts) {
      setCountdown(count);

      if (guideAudioRef.current) {
        guideAudioRef.current.currentTime = 0;
        guideAudioRef.current.play().catch(() => {});
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCountdown(null);

    if (bgMusicRef.current) {
      bgMusicRef.current.currentTime = 0;
      bgMusicRef.current.play().catch(() => {});
    }
  };

  // ── 타이머 ────────────────────────────────────
  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    updateTimer(TIMER_DURATION);

    timerIntervalRef.current = setInterval(() => {
      if (useGameStore.getState().isPaused) return;

      const currentTime = useGameStore.getState().timeRemaining;
      const newTime = Math.round((currentTime - 0.1) * 10) / 10;

      if (newTime <= 0) {
        clearInterval(timerIntervalRef.current!);
        handleRoundTimeout();
      } else {
        updateTimer(newTime);
      }
    }, 100);
  };

  // ── 3. 시도 시작 ──────────────────────────────
  const startAttempt = (attemptIndex: number) => {
    const word = useGameStore.getState().currentWord;
    console.log(`\n🎬 시도 시작: ${attemptIndex + 1}/${word.length}`);

    // 모든 시도 완료 → 라운드 종료
    if (attemptIndex >= word.length) {
      console.log('✅ 모든 시도 완료!');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      bgMusicRef.current?.pause();

      if (roundClearSfxRef.current) {
        roundClearSfxRef.current.currentTime = 0;
        roundClearSfxRef.current.play().catch(() => {});
      }
      setShowRoundClear(true);
      completeRound();

      setTimeout(() => {
        setShowRoundClear(false);
        startNextRound();
      }, 1500);
      return;
    }

    setCurrentAttempt(attemptIndex);

    const notes = getBaseNotes();
    const isReverse = difficulty === 'hard';
    const focusPitch = isReverse ? notes.low : notes.high;
    const basePitch = isReverse ? notes.high : notes.low;
    const tolerance = getTolerance();

    const samples: string[] = [];
    const startTime = Date.now();
    const judgmentDuration = 2000;
    const minDuration = 500;
    let earlySuccessCount = 0;

    if (pitchCheckIntervalRef.current) clearInterval(pitchCheckIntervalRef.current);

    pitchCheckIntervalRef.current = setInterval(() => {
      if (useGameStore.getState().isPaused) return;

      const elapsed = Date.now() - startTime;
      if (!pitchDetectorRef.current) return;

      const freq = pitchDetectorRef.current.detectPitch();
      let detectedNote: string | null = null;
      let cents = 0;

      if (freq) {
        const noteResult = pitchDetectorRef.current.frequencyToNote(freq);
        if (noteResult) {
          detectedNote = noteResult.note;
          cents = noteResult.cents;
          if (Math.abs(cents) <= tolerance) {
            samples.push(detectedNote);
          }
        }
      }

      const targetNote = isReverse ? notes.low : notes.high;
      const isAccurate = detectedNote === targetNote && Math.abs(cents) <= tolerance;
      updatePitch(detectedNote || '---', cents, isAccurate);

      // 조기 성공 감지 (0.5초 경과 후, 샘플 10개 이상)
      if (elapsed >= minDuration && samples.length >= 10) {
        const totalSamples = samples.length;
        const focusCount = samples.filter(n => n === focusPitch).length;
        const baseCount = samples.filter(n => n === basePitch).length;
        const focusRatio = focusCount / totalSamples;
        const baseRatio = baseCount / totalSamples;

        const focusSuccess = focusCount >= 2 || focusRatio >= 0.05;
        const baseSuccess = baseCount >= 1 || baseRatio >= 0.3;

        if (focusSuccess && baseSuccess) {
          earlySuccessCount++;
          if (earlySuccessCount >= 3) {
            console.log('⚡ 조기 성공!');
            clearInterval(pitchCheckIntervalRef.current!);
            handleCompleteAttempt(true, (focusRatio + baseRatio) / 2);
            return;
          }
        } else {
          earlySuccessCount = 0;
        }
      }

      // 2초 경과 → 최종 판정
      if (elapsed >= judgmentDuration) {
        clearInterval(pitchCheckIntervalRef.current!);

        const totalSamples = samples.length;
        const focusCount = samples.filter(n => n === focusPitch).length;
        const baseCount = samples.filter(n => n === basePitch).length;
        const focusRatio = totalSamples > 0 ? focusCount / totalSamples : 0;
        const baseRatio = totalSamples > 0 ? baseCount / totalSamples : 0;

        console.log(`📊 시도 ${attemptIndex + 1} | 총 ${totalSamples}개 | Focus: ${(focusRatio * 100).toFixed(1)}% | Base: ${(baseRatio * 100).toFixed(1)}%`);

        const focusSuccess = focusCount >= 2 || focusRatio >= 0.05;
        const baseSuccess = baseCount >= 1 || baseRatio >= 0.3;
        const success = focusSuccess && baseSuccess;
        const accuracy = (focusRatio + baseRatio) / 2;

        console.log(`  → ${success ? '✅ 성공' : '❌ 실패'}`);
        handleCompleteAttempt(success, accuracy);
      }
    }, 50);
  };

  // ── 시도 완료 처리 ────────────────────────────
  const handleCompleteAttempt = (success: boolean, accuracy: number) => {
    completeAttempt(success, accuracy);

    if (success && correctSfxRef.current) {
      correctSfxRef.current.currentTime = 0;
      correctSfxRef.current.play().catch(() => {});
    } else if (!success && negativeSfxRef.current) {
      negativeSfxRef.current.currentTime = 0;
      negativeSfxRef.current.play().catch(() => {});
    }

    const nextAttempt = useGameStore.getState().currentAttempt + 1;
    const word = useGameStore.getState().currentWord;

    if (nextAttempt >= word.length) {
      startAttempt(nextAttempt);
    } else {
      setTimeout(() => startAttempt(nextAttempt), success ? 100 : 300);
    }
  };

  // ── 라운드 타임아웃 ───────────────────────────
  const handleRoundTimeout = () => {
    console.log('⏰ 타임아웃!');

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (pitchCheckIntervalRef.current) clearInterval(pitchCheckIntervalRef.current);

    bgMusicRef.current?.pause();

    // 남은 시도를 한 번에 실패 처리 (루프 버그 수정)
    failRemainingAttempts();

    completeRound();
    setTimeout(() => startNextRound(), 800);
  };

  // ── 헬퍼 함수 ─────────────────────────────────
  const getCharLength = (round: number): number => {
    if (round <= 10) return 4;
    if (round <= 20) return 5;
    return 6;
  };

  const getBaseNotes = () => {
    return gender === 'male'
      ? { high: 'C4', low: 'C3' }
      : { high: 'C5', low: 'C4' };
  };

  const getTolerance = (): number => {
    switch (difficulty) {
      case 'easy':   return 40;
      case 'normal': return 30;
      case 'hard':   return 18;
      default:       return 30;
    }
  };

  // ── 일시정지 토글 ─────────────────────────────
  const togglePause = () => {
    const isPaused = useGameStore.getState().isPaused;

    if (!isPaused) {
      bgMusicRef.current?.pause();
      setPaused(true);
    } else {
      const state = useGameStore.getState();
      if (bgMusicRef.current && !state.countdown) {
        bgMusicRef.current.play().catch(() => {});
      }
      setPaused(false);
    }
  };

  // ── 오디오 언락 (모바일 최초 탭) ─────────────
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
    ].filter((el): el is HTMLAudioElement => el !== null);

    await Promise.all(
      audioElements.map(async (audio) => {
        audio.muted = true;
        audio.setAttribute('playsinline', 'true');
        try {
          audio.currentTime = 0;
          await audio.play();
          audio.pause();
        } catch {
          // 일부 환경에서 무시
        } finally {
          audio.currentTime = 0;
          audio.muted = false;
        }
      })
    );
  };

  return { startNextRound, unlockAudio, togglePause };
};
