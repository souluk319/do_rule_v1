import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TIMER_DURATION } from '../store/gameStore';

interface GameUIProps {
  nickname: string;
  round: number;
  score: number;
  combo: number;
  timeRemaining: number;
  currentWord: string;
  currentAttempt: number;
  characterStatus: boolean[]; // 각 글자의 성공 여부
  targetPitches: string[]; // 각 글자의 목표 음정
  isAttempting: boolean;
}

const GameUI: React.FC<GameUIProps> = ({
  nickname,
  round,
  score,
  combo,
  timeRemaining,
  currentWord,
  currentAttempt,
  characterStatus,
  targetPitches,
  isAttempting,
}) => {
  const progressPercent = (timeRemaining / TIMER_DURATION) * 100;
  const isLowTime = timeRemaining < 5;

  // 단어 글자 배열 메모이제이션 (불필요한 리렌더링 방지)
  const wordChars = useMemo(() => {
    return currentWord ? currentWord.split('') : [];
  }, [currentWord]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col">
      {/* 상단: 닉네임, 라운드, 점수 (상단 여유 여백 확보) */}
      <div className="p-3 pt-12 space-y-2">
        {/* 닉네임 (중앙) */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <div className="inline-block bg-black/40 backdrop-blur-md px-5 py-1.5 rounded-full border border-white/20 shadow-lg">
            <div className="text-sm font-black text-white drop-shadow-md">
              {nickname}
            </div>
          </div>
        </motion.div>

        {/* 라운드 & 점수 */}
        <div className="flex justify-between items-start">
          {/* 라운드 */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-lg text-center min-w-[80px]"
          >
            <div className="text-[10px] text-white/60 font-black uppercase tracking-wider">Round</div>
            <div className="text-2xl font-black text-white leading-none mt-0.5">{round}</div>
          </motion.div>

          {/* 점수 & 콤보 */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-lg text-center min-w-[80px]"
          >
            <div className="text-[10px] text-white/60 font-black uppercase tracking-wider">Score</div>
            <div className="text-2xl font-black text-white leading-none mt-0.5">{score}</div>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="text-sm font-black text-yellow-400 mt-1 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
              >
                {combo} COMBO 🔥
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 중앙: 단어 표시 (위치를 아래로 살짝 내림) */}
      <div className="flex-1 flex items-center justify-center" style={{ marginTop: '-20px' }}>
        {!currentWord ? (
          <div className="text-center">
            <div className="text-2xl font-bold text-white/60 mb-2">준비 중...</div>
            <div className="text-sm text-white/40">게임을 시작합니다</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* 단어 */}
            <div className="flex gap-2">
              {wordChars.map((char, index) => {
                const isCurrentFocus = index === currentAttempt;
                const isSuccess = characterStatus[index];
                const pitch = targetPitches[index] || '';

                return (
                  <div
                    key={`${currentWord}-${index}`}
                    className={`
                    relative w-16 h-22 flex flex-col items-center justify-center
                    rounded-2xl backdrop-blur-md transition-all duration-300
                    ${isSuccess
                        ? 'bg-green-500/40 border-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)]'
                        : 'bg-black/40 border-2 border-white/20 shadow-lg'}
                    ${isCurrentFocus && isAttempting
                        ? 'ring-4 ring-yellow-400 scale-110 z-10 shadow-[0_0_20px_rgba(250,204,21,0.5)]'
                        : ''}
                  `}
                  >
                    {/* 글자 - Jua 폰트 적용 */}
                    <div
                      className={`text-3xl font-black drop-shadow-lg pt-1 ${isSuccess ? 'text-green-300' : 'text-white'
                        }`}
                      style={{ fontFamily: '"Jua", sans-serif' }}
                    >
                      {char}
                    </div>

                    {/* 음정 표시 */}
                    <div className="text-[11px] font-black text-white/70 mt-1 uppercase tracking-tighter">
                      {pitch}
                    </div>

                    {/* 성공 체크마크 */}
                    {isSuccess && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 진행 안내 (컴팩트) */}
            {isAttempting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full"
              >
                <div className="text-xs font-bold text-white">
                  시도 {currentAttempt + 1} / {currentWord.length}
                </div>
              </motion.div>
            )}

          </div>
        )}
      </div>

      {/* 하단: 타이머 (건반과 겹치지 않게 하단 끝으로 밀착) */}
      <div className="p-3 pb-4">
        <motion.div
          animate={{
            scale: isLowTime ? [1, 1.05, 1] : 1,
          }}
          transition={{
            repeat: isLowTime ? Infinity : 0,
            duration: 0.5,
          }}
          className="bg-black/40 backdrop-blur-md rounded-xl overflow-hidden"
        >
          {/* 타이머 바 */}
          <div className="relative h-4 bg-white/10">
            <motion.div
              className={`absolute inset-y-0 left-0 transition-colors duration-300 ${isLowTime ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-blue-400 to-cyan-500'
                }`}
              initial={{ width: '100%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'linear' }}
            />
          </div>

          {/* 타이머 텍스트 */}
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="text-xs text-white/60 font-medium">Time</div>
            <div
              className={`text-xl font-black transition-colors ${isLowTime ? 'text-red-400' : 'text-white'
                }`}
            >
              {timeRemaining.toFixed(1)}s
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GameUI;
