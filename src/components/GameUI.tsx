import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

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
  const progressPercent = (timeRemaining / 15) * 100;
  const isLowTime = timeRemaining < 5;
  
  // 단어 글자 배열 메모이제이션 (불필요한 리렌더링 방지)
  const wordChars = useMemo(() => {
    return currentWord ? currentWord.split('') : [];
  }, [currentWord]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      {/* 상단: 닉네임, 라운드, 점수 */}
      <div className="p-3 pt-4 space-y-2">
        {/* 닉네임 (중앙) */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <div className="inline-block bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md px-5 py-1.5 rounded-full border border-purple-400/30">
            <div className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300">
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
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-400/30"
          >
            <div className="text-xs text-purple-300 font-medium">Round</div>
            <div className="text-2xl font-black text-white">{round}</div>
          </motion.div>

          {/* 점수 & 콤보 */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-400/30 text-right"
          >
            <div className="text-xs text-blue-300 font-medium">Score</div>
            <div className="text-2xl font-black text-white">{score}</div>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs font-bold text-yellow-300 mt-1"
              >
                {combo}x COMBO
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

          {/* 중앙: 단어 표시 */}
          <div className="flex-1 flex items-center justify-center">
            {!currentWord ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-white/60 mb-2">준비 중...</div>
                <div className="text-sm text-white/40">게임을 시작합니다</div>
              </div>
            ) : (
          <div className="flex flex-col items-center gap-3">
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
                    relative w-14 h-18 flex flex-col items-center justify-center
                    rounded-xl backdrop-blur-md
                    ${isSuccess ? 'bg-green-500/30 border-2 border-green-400' : 'bg-black/40 border-2 border-white/20'}
                    ${isCurrentFocus && isAttempting ? 'ring-4 ring-blue-400 shadow-lg shadow-blue-400/50' : ''}
                  `}
                >
                  {/* 글자 */}
                  <div
                    className={`text-3xl font-black ${
                      isSuccess ? 'text-green-300' : 'text-white'
                    }`}
                  >
                    {char}
                  </div>
                  
                  {/* 음정 표시 */}
                  <div className="text-[10px] font-bold text-white/60 mt-1">
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

            {/* 진행 안내 */}
            {isAttempting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/60 backdrop-blur-md px-5 py-2 rounded-full"
            >
              <div className="text-sm font-bold text-white">
                시도 {currentAttempt + 1} / {currentWord.length}
              </div>
            </motion.div>
            )}

          </div>
        )}
      </div>

      {/* 하단: 타이머 */}
      <div className="p-3 pb-32">
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
          <div className="relative h-3 bg-white/10">
            <motion.div
              className={`absolute inset-y-0 left-0 transition-colors duration-300 ${
                isLowTime ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-600'
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
              className={`text-xl font-black transition-colors ${
                isLowTime ? 'text-red-400' : 'text-white'
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

