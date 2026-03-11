import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import PianoKeyboard from './PianoKeyboard';
import GameUI from './GameUI';
import { RecorderService } from '../services/RecorderService';

const GameCanvas: React.FC = () => {
  const store = useGameStore();
  const { startNextRound, unlockAudio, togglePause } = useGameLoop();
  const [isStarting, setIsStarting] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderServiceRef = useRef<RecorderService | null>(null);

  const attachCameraStream = async (video: HTMLVideoElement, stream: MediaStream) => {
    if (video.srcObject === stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');

    const markReady = () => {
      setCameraReady(true);
    };

    video.onloadeddata = markReady;
    video.onplaying = markReady;

    try {
      await video.play();
    } catch (err) {
      console.warn('카메라 미리보기 재생 실패:', err);
    }
  };

  const handleVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
  };

  // ESC 키로 일시정지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && store.audioReady && !store.countdown && !store.showRoundClear) {
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.audioReady, store.countdown, store.showRoundClear, togglePause]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !cameraStream) return;

    if (video.srcObject === cameraStream && !video.paused) return;

    setCameraReady(false);
    void attachCameraStream(video, cameraStream);

    return () => {
      video.onloadeddata = null;
      video.onplaying = null;
      if (video.srcObject === cameraStream) {
        video.srcObject = null;
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      recorderServiceRef.current?.stopCamera();
    };
  }, []);

  // 목표 음정 계산
  const calculateTargetPitches = (): string[] => {
    if (!store.currentWord) return [];

    const notes = store.gender === 'male'
      ? { high: 'C4', low: 'C3' }
      : { high: 'C5', low: 'C4' };

    const isReverse = store.difficulty === 'hard';
    const targetPitches: string[] = [];

    for (let i = 0; i < store.currentWord.length; i++) {
      if (i === store.currentAttempt) {
        targetPitches.push(isReverse ? notes.low : notes.high);
      } else {
        targetPitches.push(isReverse ? notes.high : notes.low);
      }
    }

    return targetPitches;
  };

  const targetPitches = calculateTargetPitches();
  const characterStatus = store.currentAttemptResults.map(r => r.success);
  const targetNote = targetPitches[store.currentAttempt] || (store.gender === 'male' ? 'C4' : 'C5');
  const hasCameraFeed = store.cameraMode && cameraReady;

  const startCameraPreview = async () => {
    if (!store.cameraMode) return;

    try {
      setCameraError(null);
      setCameraReady(false);
      const recorderService = recorderServiceRef.current ?? new RecorderService();
      recorderServiceRef.current = recorderService;

      const stream = await recorderService.startCamera({
        facingMode: 'user',
      });

      setCameraStream(stream);
    } catch (error) {
      console.error('카메라 시작 실패:', error);
      setCameraError('카메라 거부됨');
    }
  };

  const handleAudioStart = async () => {
    if (isStarting) return;

    try {
      setIsStarting(true);
      const audioUnlockPromise = unlockAudio();
      const cameraStartPromise = startCameraPreview();

      await audioUnlockPromise;
      await cameraStartPromise;
      await startNextRound();
      setIsStarting(false);
    } catch (error) {
      console.error('게임 시작 실패:', error);
      alert('사운드 초기화에 실패했습니다. 다시 시도해주세요.');
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
      {/* PC에서 모바일 비율로 가운데 고정시키는 래퍼(Wrapper) */}
      <div
        className="w-full h-[100dvh] max-w-[430px] flex items-center justify-center relative bg-cover bg-center bg-no-repeat shadow-2xl overflow-hidden"
        style={{ backgroundImage: 'url(/image/dorule_img.png)', aspectRatio: '390 / 844' }}
      >
        {/* 인물 가리지 않는 상하단 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0 pointer-events-none" />
        {store.cameraMode && (
          <>
            <div className="absolute inset-0 z-10">
              <div className="relative h-full w-full overflow-hidden bg-black/20 shadow-2xl">
                <video
                  ref={handleVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`h-full w-full object-cover transition-opacity duration-300 ${hasCameraFeed ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transform: 'scaleX(-1)', objectPosition: 'center 22%' }}
                />

                {!hasCameraFeed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/10 to-black/45 px-4 text-center">
                    <div className="mb-3 text-3xl">📷</div>
                    <div className="text-xs font-black tracking-[0.28em] text-white/85">
                      {cameraError ? 'CAM OFF' : 'SELFIE CAM'}
                    </div>
                    <div className="mt-2 text-[11px] text-white/55">
                      {cameraError ? '권한을 허용해주세요' : '카메라 연결 중'}
                    </div>
                  </div>
                )}

                {hasCameraFeed && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/08 via-transparent to-black/14" />
                    <div className="absolute inset-0 ring-1 ring-white/8 ring-inset rounded-[28px]" />
                  </>
                )}

                <div className="absolute left-4 top-3 flex items-center gap-1.5 rounded-full bg-black/46 px-2 py-0.5 shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur-md">
                  <span className={`h-2 w-2 rounded-full ${hasCameraFeed ? 'bg-red-500 animate-pulse' : 'bg-white/35'}`} />
                  <span className="text-[11px] font-black tracking-[0.16em] text-white">REC</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 오디오 준비 대기 화면 */}
        {!store.audioReady && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center px-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-6xl mb-6"
              >
                🎤
              </motion.div>
              <div className="text-white text-2xl font-black mb-4">
                마이크 권한 확인 중...
              </div>
              <div className="text-gray-300 text-sm">
                브라우저에서 마이크 허용을 눌러주세요
              </div>
            </motion.div>
          </div>
        )}

        {store.audioReady && !store.currentWord && !store.countdown && !store.showRoundClear && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center px-8"
            >
              <div className="text-white text-3xl font-black mb-4">
                {store.cameraMode ? '사운드 + 카메라 활성화' : '사운드 활성화'}
              </div>
              <div className="text-gray-300 text-sm mb-6">
                {store.cameraMode
                  ? '한 번 탭하면 셀카 카메라와 사운드가 함께 시작됩니다'
                  : '모바일 브라우저에서는 한 번 탭해야 소리가 재생됩니다'}
              </div>
              <button
                onClick={handleAudioStart}
                disabled={isStarting}
                className="px-8 py-4 bg-white text-purple-600 font-black text-lg rounded-2xl shadow-2xl disabled:opacity-60"
              >
                {isStarting ? '시작 중...' : '탭해서 시작'}
              </button>
            </motion.div>
          </div>
        )}

        {/* 카운트다운 오버레이 */}
        {store.countdown && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
            <motion.div
              key={store.countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-white font-black text-[150px] drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            >
              {store.countdown}
            </motion.div>
          </div>
        )}

        {/* 일시정지 버튼 */}
        {store.audioReady && !!store.currentWord && !store.countdown && !store.showRoundClear && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={togglePause}
            aria-label={store.isPaused ? '계속하기' : '일시정지'}
            className="absolute top-11 right-5 z-40 flex h-8 w-8 items-center justify-center rounded-lg bg-black/20 backdrop-blur-md border border-white/20 text-white text-[14px] transition-all duration-200 shadow-lg hover:bg-white/10"
          >
            {store.isPaused ? '▶' : '||'}
          </motion.button>
        )}

        {/* 일시정지 오버레이 (블러 약하게 조정) */}
        {store.isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center px-8"
            >
              <div className="text-white text-3xl font-black mb-10 drop-shadow-lg" style={{ fontFamily: '"Jua", sans-serif' }}>
                PAUSED
              </div>

              <div className="space-y-4">
                <button
                  onClick={togglePause}
                  className="w-64 px-8 py-4 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-black text-xl rounded-2xl transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/30 hover:scale-105 active:scale-95"
                  style={{ fontFamily: '"Jua", sans-serif' }}
                >
                  계속 하기
                </button>

                <button
                  onClick={() => {
                    if (confirm('게임을 포기하고 메인으로 돌아갈까요?')) {
                      window.location.reload();
                    }
                  }}
                  className="w-64 px-8 py-4 bg-red-500/40 backdrop-blur-xl border border-red-400/30 text-white font-black text-xl rounded-2xl transition-all duration-200 shadow-[0_8px_32px_rgba(255,0,0,0.2)] hover:bg-red-500/60 hover:scale-105 active:scale-95"
                  style={{ fontFamily: '"Jua", sans-serif' }}
                >
                  포기 하기
                </button>
              </div>

              <div className="mt-8 text-gray-300 text-sm">
                ESC 키로도 일시정지 가능
              </div>
            </motion.div>
          </div>
        )}

        {/* 라운드 클리어 오버레이 */}
        {store.showRoundClear && (
          <div className="absolute inset-0 flex items-start justify-center pt-32 z-50">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="text-center"
            >
              <div className="text-yellow-400 font-black text-5xl mb-4 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]">
                🎉 ROUND CLEAR! 🎉
              </div>
              {/* 폭죽 효과 */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    x: Math.cos((i * Math.PI * 2) / 8) * 150,
                    y: Math.sin((i * Math.PI * 2) / 8) * 150,
                    opacity: [1, 1, 0]
                  }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="absolute text-4xl"
                  style={{ left: '50%', top: '50%' }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* React UI */}
        <div className="absolute inset-0">
          <GameUI
            nickname={store.nickname}
            round={store.currentRound + 1}
            score={store.score}
            combo={store.combo}
            timeRemaining={store.timeRemaining}
            currentWord={store.currentWord}
            currentAttempt={store.currentAttempt}
            characterStatus={characterStatus}
            targetPitches={targetPitches}
            isAttempting={store.isAttempting}
          />

          {/* 피아노 건반 (하단 끝으로 더 내림) */}
          <div className="absolute bottom-4 left-1/2 z-30 transform -translate-x-1/2 pointer-events-none scale-75">
            <PianoKeyboard
              detectedNote={store.detectedNote}
              targetNote={targetNote}
              gender={store.gender}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;
