import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import ResultScreen from './components/ResultScreen';
import { GameConfig } from './core/GameState';
import { useGameStore } from './store/gameStore';

type Screen = 'menu' | 'game' | 'result';

export interface GameResult {
  score: number;
  maxCombo: number;
  successRate: number;
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const setConfig = useGameStore(state => state.setConfig);

  const handleStartGame = (config: GameConfig) => {
    setConfig(config);
    setScreen('game');
  };

  const handleGameEnd = (result: GameResult) => {
    setGameResult(result);
    setScreen('result');
  };

  const handleBackToMenu = () => {
    setScreen('menu');
    setGameResult(null);
  };

  const handleRetry = () => {
    setScreen('game');
  };

  return (
    <div className="w-full h-full fixed inset-0 overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full"
          >
            <MainMenu onStartGame={handleStartGame} />
          </motion.div>
        )}

            {screen === 'game' && (
              <motion.div
                key="game"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="w-full h-full"
              >
                <GameCanvas />
              </motion.div>
            )}

            {screen === 'result' && gameResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full"
          >
            <ResultScreen
              result={gameResult}
              onRetry={handleRetry}
              onBackToMenu={handleBackToMenu}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

