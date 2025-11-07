import { motion } from 'framer-motion';
import { GameResult } from '../App';

interface ResultScreenProps {
  result: GameResult;
  onRetry: () => void;
  onBackToMenu: () => void;
}

export default function ResultScreen({ result, onRetry, onBackToMenu }: ResultScreenProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '도를아십니까 게임 결과',
          text: `점수: ${result.score}점 | 최대 콤보: ${result.maxCombo} | 성공률: ${result.successRate.toFixed(1)}%`,
          url: window.location.href
        });
      } catch (error) {
        console.log('공유 취소:', error);
      }
    } else {
      // Fallback: 클립보드 복사
      const shareText = `도를아십니까 게임 결과\n점수: ${result.score}점\n최대 콤보: ${result.maxCombo}\n성공률: ${result.successRate.toFixed(1)}%`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('결과가 클립보드에 복사되었습니다!');
      });
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-md"
      >
        {/* 결과 카드 */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* 타이틀 */}
          <motion.h2
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-4xl font-black text-white text-center mb-8"
          >
            게임 종료!
          </motion.h2>

          {/* 점수 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="text-center mb-6"
          >
            <div className="text-sm text-white/60 font-medium mb-2">점수</div>
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              {result.score}
            </div>
          </motion.div>

          {/* 통계 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4 mb-8"
          >
            <div className="bg-white/5 rounded-2xl p-4 text-center">
              <div className="text-sm text-white/60 mb-1">최대 콤보</div>
              <div className="text-3xl font-bold text-white">{result.maxCombo}</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 text-center">
              <div className="text-sm text-white/60 mb-1">성공률</div>
              <div className="text-3xl font-bold text-white">{result.successRate.toFixed(1)}%</div>
            </div>
          </motion.div>

          {/* 버튼들 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            {/* 공유 버튼 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              📤 공유하기
            </motion.button>

            {/* 재도전 버튼 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full py-4 bg-white/10 backdrop-blur-sm text-white text-lg font-bold rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all duration-200"
            >
              🔄 재도전
            </motion.button>

            {/* 메인 메뉴 버튼 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBackToMenu}
              className="w-full py-4 bg-transparent text-white/70 text-base font-semibold rounded-xl hover:text-white transition-all duration-200"
            >
              메인 메뉴로
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
