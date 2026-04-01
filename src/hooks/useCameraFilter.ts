/**
 * useCameraFilter - 카메라 필터 상태 및 설정 관리
 *
 * 게임 상태(콤보, 라운드 클리어 등)에 따라 필터 설정을 동적으로 계산한다.
 */

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export interface FilterConfig {
  /** 배럴 디스토션 강도 (0 = 없음, 0.5 = 강함) */
  barrelStrength: number;
  /** ctx.filter에 적용할 CSS 필터 문자열 */
  cssFilter: string;
  /** RGB 글리치 분리 효과 */
  glitch: boolean;
  /** 무지개 색조 회전 효과 */
  rainbow: boolean;
}

export function useCameraFilter() {
  const [enabled, setEnabled] = useState(true);
  const [glitchActive, setGlitchActive] = useState(false);

  const store = useGameStore();
  const prevComboRef = useRef(store.combo);
  const glitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 콤보가 0으로 떨어지면 글리치 1.3초 활성화
  useEffect(() => {
    const prev = prevComboRef.current;
    prevComboRef.current = store.combo;

    if (prev > 0 && store.combo === 0) {
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
      setGlitchActive(true);
      glitchTimerRef.current = setTimeout(() => setGlitchActive(false), 1300);
    }

    return () => {
      if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
    };
  }, [store.combo]);

  const getConfig = (): FilterConfig => {
    const { combo, showRoundClear } = store;

    // 글리치: 실패 직후
    if (glitchActive) {
      return {
        barrelStrength: 0.28,
        cssFilter: 'brightness(0.72) contrast(1.6) saturate(0.3)',
        glitch: true,
        rainbow: false,
      };
    }

    // 무지개: 라운드 클리어 + 콤보 5 이상
    if (showRoundClear && combo >= 5) {
      return {
        barrelStrength: 0.38,
        cssFilter: 'brightness(1.18) contrast(1.1) saturate(2.8)',
        glitch: false,
        rainbow: true,
      };
    }

    // 하이콤보 10+: 강한 왜곡 + 컬러풀
    if (combo >= 10) {
      return {
        barrelStrength: 0.32,
        cssFilter: 'brightness(1.12) contrast(1.18) saturate(2.3) hue-rotate(-8deg)',
        glitch: false,
        rainbow: false,
      };
    }

    // 콤보 3+: 중간 왜곡
    if (combo >= 3) {
      return {
        barrelStrength: 0.2,
        cssFilter: 'brightness(1.06) contrast(1.1) saturate(1.6) sepia(8%)',
        glitch: false,
        rainbow: false,
      };
    }

    // 기본: 살짝 광각 + 따뜻한 톤
    return {
      barrelStrength: 0.1,
      cssFilter: 'brightness(1.03) contrast(1.04) saturate(1.12) sepia(14%)',
      glitch: false,
      rainbow: false,
    };
  };

  return {
    enabled,
    toggleFilter: () => setEnabled((v) => !v),
    config: getConfig(),
  };
}
