import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PianoKeyboardProps {
  detectedNote: string;
  targetNote: string;
  gender: 'male' | 'female';
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ detectedNote, targetNote, gender }) => {
  // 안내 문구를 처음 한 번만 표시하기 위한 상태
  const [hasDetectedAny, setHasDetectedAny] = useState(false);
  
  // 음정이 한 번이라도 감지되면 안내 문구 숨김
  useEffect(() => {
    if (detectedNote && detectedNote !== '---' && !hasDetectedAny) {
      setHasDetectedAny(true);
    }
  }, [detectedNote, hasDetectedAny]);
  // 옥타브 3, 4, 5의 C만 표시
  const notes = ['C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
                 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
                 'C5'];

  const isBlackKey = (note: string) => note.includes('#');
  
  // C3, C4, C5 위치 찾기
  const targetKeys = gender === 'male' ? ['C3', 'C4'] : ['C4', 'C5'];
  
  // 흰 건반만 (C, D, E, F, G, A, B)
  const whiteNotes = notes.filter(n => !isBlackKey(n));
  
  // 검은 건반 (C#, D#, F#, G#, A#)
  const blackNotes = notes.filter(n => isBlackKey(n));

  // const getWhiteKeyIndex = (note: string) => whiteNotes.indexOf(note);
  const getBlackKeyPosition = (note: string) => {
    const whiteIndex = whiteNotes.indexOf(note.replace('#', ''));
    return whiteIndex;
  };

  return (
    <div className="relative">
      {/* 타이틀 - 더 명확하게 */}
      <div className="text-center mb-3">
        <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-2 rounded-full shadow-lg">
          <div className="text-sm text-gray-900 font-black">
            🎯 목표 음정: {targetNote}
          </div>
        </div>
      </div>

      <div className="relative" style={{ width: '380px', height: '140px' }}>
        {/* 흰 건반들 */}
        <div className="absolute inset-0 flex">
          {whiteNotes.map((note) => {
            const isTarget = targetKeys.includes(note);
            const isDetected = detectedNote === note;
            const isC = note.startsWith('C');
            const octave = note.replace(/[^0-9]/g, '');

            return (
              <motion.div
                key={note}
                className="relative flex-1"
                animate={{
                  scale: isDetected ? 0.98 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                {/* 흰 건반 */}
                <div
                  className={`
                    w-full h-full border-r border-gray-400 rounded-b-lg transition-all duration-150
                    ${isDetected && isTarget
                      ? 'bg-gradient-to-b from-green-300 to-green-400 shadow-lg shadow-green-500/50'  // 목표 음정 맞음
                      : isDetected
                      ? 'bg-gradient-to-b from-yellow-300 to-orange-400 shadow-lg shadow-yellow-500/50'  // 다른 음정 감지
                      : 'bg-gradient-to-b from-white to-gray-100'  // 기본
                    }
                    ${isTarget ? 'ring-2 ring-yellow-400' : ''}
                  `}
                  style={{
                    boxShadow: isDetected 
                      ? '0 4px 20px rgba(34, 197, 94, 0.5), inset 0 -2px 4px rgba(0,0,0,0.1)' 
                      : 'inset 0 -2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* 건반 하이라이트 */}
                  <div className="absolute inset-x-0 top-0 h-6 bg-white/40 rounded-t-lg" />
                  
                  {/* C 음정만 라벨 표시 */}
                  {isC && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                      <div className={`
                        text-xs font-black px-2 py-1 rounded-full
                        ${isTarget 
                          ? 'bg-yellow-400 text-gray-900' 
                          : 'bg-gray-800 text-white'
                        }
                      `}>
                        C{octave}
                      </div>
                    </div>
                  )}
                </div>

        {/* 목표 표시 제거 - 혼란스러움 */}
              </motion.div>
            );
          })}
        </div>

        {/* 검은 건반들 */}
        <div className="absolute inset-0 pointer-events-none">
          {blackNotes.map((note) => {
            const whiteKeyIndex = getBlackKeyPosition(note);
            if (whiteKeyIndex === -1) return null;
            
            const isDetected = detectedNote === note;
            const isTarget = targetKeys.includes(note);
            const left = ((whiteKeyIndex + 0.7) / whiteNotes.length) * 100;

            return (
              <motion.div
                key={note}
                className="absolute"
                style={{
                  left: `${left}%`,
                  width: `${100 / whiteNotes.length * 0.6}%`,
                  height: '70%',
                  top: 0,
                }}
                animate={{
                  scale: isDetected ? 0.95 : 1,
                }}
              >
                <div
                  className={`
                    w-full h-full rounded-b-lg transition-all duration-150
                    ${isDetected && isTarget
                      ? 'bg-gradient-to-b from-green-500 to-green-600 shadow-lg shadow-green-500/50'  // 목표 음정 맞음
                      : isDetected
                      ? 'bg-gradient-to-b from-yellow-500 to-orange-600 shadow-lg shadow-yellow-500/50'  // 다른 음정 감지
                      : 'bg-gradient-to-b from-gray-800 to-black'  // 기본
                    }
                    border-l border-r border-black
                  `}
                  style={{
                    boxShadow: isDetected 
                      ? '0 4px 15px rgba(34, 197, 94, 0.6)' 
                      : '0 2px 6px rgba(0,0,0,0.8)'
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* 현재 감지된 음정 표시 (마커) */}
        <AnimatePresence>
          {detectedNote && detectedNote !== '---' && (
            <motion.div
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -20 }}
              className="absolute -top-14 left-1/2 transform -translate-x-1/2 pointer-events-none"
            >
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-xl font-black text-lg">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎤</span>
                  <span>{detectedNote}</span>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-green-500" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 안내 텍스트 - 처음 한 번만 표시 (높이 고정) */}
      <div className="text-center mt-3" style={{ minHeight: '48px' }}>
        <AnimatePresence>
          {!hasDetectedAny && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-red-500/80 text-white px-4 py-2 rounded-full inline-block shadow-lg animate-pulse">
                🎤 큰 소리로 "아~~~~~" 하세요!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PianoKeyboard;

