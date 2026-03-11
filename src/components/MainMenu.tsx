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
    <div className="w-full min-h-[100dvh] flex items-center justify-center bg-gray-900 relative">
      {/* PC에서 양옆 여백을 두고 모바일 비율로 가운데 고정시키는 래퍼(Wrapper) */}
      <div 
        className="w-full h-[100dvh] max-w-[430px] flex items-center justify-center p-5 overflow-y-auto relative bg-cover bg-center bg-no-repeat shadow-2xl"
        style={{ backgroundImage: 'url(/image/dorule_img.png)', aspectRatio: '390 / 844' }}
      >
        {/* 상/하단만 까맣게 처리하여 인물 강조 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 z-0 pointer-events-none" />

      {/* flex-col과 justify-end를 추가하여 전체적인 블록을 아래쪽으로 쏠리게 만듦. pt-20으로 상단 여유 공간 확보 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col justify-end pt-32 pb-4 relative z-10"
      >
        {/* 로고: 커졌다 작아졌다 숨쉬기(breath) 애니메이션 적용 */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-center mb-5"
        >
          <h1 
            className="text-[40px] font-black text-white mb-0 tracking-tighter drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)]"
            style={{ fontFamily: '"Jua", "Black Han Sans", "BM JUA_TTF", "Gmarket Sans", "Comic Sans MS", cursive, sans-serif' }}
          >
            도를아십니까
          </h1>
          <p className="text-[10px] text-white/90 font-bold tracking-[0.3em] drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
            DO-RULE
          </p>
        </motion.div>

        {/* 카드: 투명도 높임(bg-black/20), 블러 약하게(backdrop-blur-sm) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-black/20 backdrop-blur-sm rounded-xl p-3 shadow-2xl border border-white/20"
        >
          {/* 닉네임 */}
          <div className="mb-2.5">
            <label className="block text-white text-[11px] font-bold mb-1">
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
              className="w-full px-3 py-2 rounded-lg bg-white/20 backdrop-blur-md border border-white/50 text-white placeholder-white/60 focus:border-white focus:bg-white/30 focus:outline-none text-center text-[13px] font-bold shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all"
            />
          </div>

          {/* 성별 */}
          <div className="mb-2.5">
            <label className="block text-white text-[11px] font-bold mb-1">
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
                  className={`py-2 rounded-lg font-bold text-[13px] transition-all ${
                    gender === g
                      ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400'
                      : 'bg-black/40 backdrop-blur-md text-white border border-white/40 hover:bg-white/30 shadow-[0_2px_4px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  {g === 'male' ? '남 👨' : '여 👩'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 난이도 */}
          <div className="mb-3">
            <label className="block text-white text-[11px] font-bold mb-1">
              난이도
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'easy', label: 'Easy 🌱' },
                { key: 'normal', label: 'Normal ⭐' },
                { key: 'hard', label: 'Hard 🔥' }
              ].map((d) => (
                <motion.button
                  key={d.key}
                  onClick={() => {
                    setDifficulty(d.key as 'easy' | 'normal' | 'hard');
                    setError('');
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`py-1.5 rounded-lg font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-0.5 ${
                    difficulty === d.key
                      ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400'
                      : 'bg-black/40 backdrop-blur-md text-white border border-white/40 hover:bg-white/30 shadow-[0_2px_4px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  <span>{d.label.split(' ')[0]}</span>
                  <span className="text-[9px] leading-tight">{d.label.split(' ')[1]}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 카메라 모드 */}
          <div className="mb-3 bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/40 shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-between">
            <label className="text-white text-[11px] font-bold">
              📷 카메라 모드 (숏폼용)
            </label>
            <motion.button
              onClick={() => setCameraMode(!cameraMode)}
              whileTap={{ scale: 0.9 }}
              className={`w-9 h-4.5 rounded-full transition-all relative flex items-center ${
                cameraMode ? 'bg-purple-500' : 'bg-white/20'
              }`}
            >
              <motion.div
                animate={{ x: cameraMode ? 18 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-[18px] h-[18px] rounded-full absolute -left-0 shadow-md ${
                  cameraMode ? 'bg-white' : 'bg-white/80'
                }`}
              />
            </motion.button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-center mb-2 text-[11px] font-bold drop-shadow-md"
            >
              ⚠️ {error}
            </motion.p>
          )}

          {/* 시작 버튼 */}
          <motion.button
            onClick={handleStart}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-base shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all"
          >
            게임 시작 🚀
          </motion.button>
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
}
