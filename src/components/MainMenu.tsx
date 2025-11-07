import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameConfig } from '../core/GameState';

interface MainMenuProps {
  onStartGame: (config: GameConfig) => void;
}

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | null>(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [error, setError] = useState('');

  const handleStart = () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요!');
      return;
    }
    if (!gender) {
      setError('성별을 선택해주세요!');
      return;
    }
    if (!difficulty) {
      setError('난이도를 선택해주세요!');
      return;
    }

    onStartGame({
      nickname: nickname.trim(),
      gender,
      difficulty,
      cameraMode
    });
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-2 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md my-auto py-2"
      >
        {/* 로고 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center mb-3"
        >
          <h1 className="text-3xl font-black text-white mb-0.5 tracking-tight">
            도를아십니까
          </h1>
          <p className="text-sm text-white/80 font-semibold tracking-wider">
            DO-RULE
          </p>
        </motion.div>

        {/* 카드 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-2xl rounded-2xl p-3 shadow-2xl border border-white/20"
        >
          {/* 닉네임 */}
          <div className="mb-3">
            <label className="block text-white/90 text-xs font-semibold mb-1.5">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError('');
              }}
              placeholder="닉네임을 입력하세요"
              maxLength={10}
              className="w-full px-4 py-2.5 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder-white/50 focus:border-white focus:outline-none text-center text-base font-medium transition-all"
            />
          </div>

          {/* 성별 */}
          <div className="mb-3">
            <label className="block text-white/90 text-xs font-semibold mb-1.5">
              성별
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['male', 'female'].map((g) => (
                <motion.button
                  key={g}
                  onClick={() => {
                    setGender(g as 'male' | 'female');
                    setError('');
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`py-2.5 rounded-xl font-bold text-base transition-all ${
                    gender === g
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {g === 'male' ? '남' : '여'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 난이도 */}
          <div className="mb-3">
            <label className="block text-white/90 text-xs font-semibold mb-1.5">
              난이도
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'easy', label: 'Easy' },
                { key: 'normal', label: 'Normal' },
                { key: 'hard', label: 'Hard' }
              ].map((d) => (
                <motion.button
                  key={d.key}
                  onClick={() => {
                    setDifficulty(d.key as 'easy' | 'normal' | 'hard');
                    setError('');
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`py-2 rounded-xl font-bold text-xs transition-all ${
                    difficulty === d.key
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {d.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 카메라 모드 */}
          <div className="mb-4 flex items-center justify-between">
            <label className="text-white/90 text-xs font-semibold">
              카메라 모드 (숏폼용)
            </label>
            <motion.button
              onClick={() => setCameraMode(!cameraMode)}
              whileTap={{ scale: 0.9 }}
              className={`w-12 h-6 rounded-full transition-all ${
                cameraMode ? 'bg-white' : 'bg-white/30'
              }`}
            >
              <motion.div
                animate={{ x: cameraMode ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full ${
                  cameraMode ? 'bg-purple-600' : 'bg-white'
                }`}
              />
            </motion.button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-300 text-center mb-2 text-xs font-semibold"
            >
              {error}
            </motion.p>
          )}

          {/* 시작 버튼 */}
          <motion.button
            onClick={handleStart}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-white text-purple-600 font-black text-lg shadow-2xl hover:shadow-3xl transition-all"
          >
            게임 시작
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

