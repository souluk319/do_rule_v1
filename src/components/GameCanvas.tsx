import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import PianoKeyboard from './PianoKeyboard';
import GameUI from './GameUI';

const GameCanvas: React.FC = () => {
  const store = useGameStore();
  const { startNextRound } = useGameLoop();

  // 게임 시작
  useEffect(() => {
    console.log('🎮 게임 시작!');
    
    // 오디오 초기화 대기 후 게임 시작
    const timer = setTimeout(() => {
      console.log('🎮 게임 시작 (오디오 준비 완료)');
      startNextRound();
    }, 500); // 0.5초 대기
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900 overflow-hidden">
      <div className="relative w-full h-full max-w-[430px] max-h-[932px]" style={{ aspectRatio: '390 / 844' }}>
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
          
          {/* 피아노 건반 */}
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 pointer-events-none scale-75">
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
