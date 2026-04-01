/**
 * CameraFilter - Canvas 기반 카메라 피드 필터 렌더러
 *
 * 주요 기능:
 * - 소프트웨어 배럴 디스토션 (광각/어안 효과) — Canvas 2D 픽셀 매핑
 * - 게임 상태 연동 CSS 필터 (ctx.filter)
 * - 글리치 효과: RGB 채널 분리 + 랜덤 스캔라인
 * - 무지개 효과: 애니메이션 색조 회전
 * - 필터 비활성 시 원본 미러 영상 그대로 표시
 */

import React, { useRef, useEffect } from 'react';
import type { FilterConfig } from '../hooks/useCameraFilter';

interface CameraFilterProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  config: FilterConfig;
  className?: string;
}

/** 축소 비율 — 픽셀 루프를 이 해상도에서 수행 후 스케일업 */
const PIXEL_SCALE = 0.38;
/** FPS 캡 */
const FRAME_MS = 1000 / 30;

/**
 * video → canvas object-cover 소스 영역 계산
 * objectPosition: center 22% 재현 (얼굴 상단 기준)
 */
function getObjectCoverSrc(
  vw: number,
  vh: number,
  cw: number,
  ch: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (vw === 0 || vh === 0) return { sx: 0, sy: 0, sw: cw, sh: ch };
  const vAspect = vw / vh;
  const cAspect = cw / ch;
  if (vAspect > cAspect) {
    // 영상이 더 넓음 → 좌우 크롭
    const sh = vh;
    const sw = vh * cAspect;
    return { sx: (vw - sw) / 2, sy: 0, sw, sh };
  } else {
    // 영상이 더 높음 → 상하 크롭 (22% 위치 기준)
    const sw = vw;
    const sh = vw / cAspect;
    const sy = (vh - sh) * 0.22;
    return { sx: 0, sy, sw, sh };
  }
}

const CameraFilter: React.FC<CameraFilterProps> = ({
  videoRef,
  enabled,
  config,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);

  // 최신 config/enabled를 ref로 유지 (RAF 재시작 없이 반영)
  const configRef = useRef(config);
  const enabledRef = useRef(enabled);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // 애니메이션 상태
  const glitchPhaseRef = useRef(0);
  const rainbowAngleRef = useRef(0);

  useEffect(() => {
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) return;

      // 캔버스 픽셀 크기를 CSS 크기에 동기화
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw === 0 || ch === 0) return;
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;

      // FPS 제한
      if (ts - lastFrameRef.current < FRAME_MS) return;
      lastFrameRef.current = ts;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isEnabled = enabledRef.current;
      const cfg = configRef.current;

      const vw = video.videoWidth || cw;
      const vh = video.videoHeight || ch;
      const { sx, sy, sw, sh } = getObjectCoverSrc(vw, vh, cw, ch);

      // ── 필터 비활성: 단순 미러 표시 ──────────────────────────────
      if (!isEnabled) {
        ctx.save();
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
        ctx.restore();
        return;
      }

      // ── 오프스크린 캔버스 초기화 ─────────────────────────────────
      if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas');
      const off = offscreenRef.current;
      const ow = Math.max(1, Math.floor(cw * PIXEL_SCALE));
      const oh = Math.max(1, Math.floor(ch * PIXEL_SCALE));
      if (off.width !== ow || off.height !== oh) { off.width = ow; off.height = oh; }

      const offCtx = off.getContext('2d');
      if (!offCtx) return;

      // 영상을 오프스크린에 미러 드로우 (축소)
      offCtx.save();
      offCtx.translate(ow, 0);
      offCtx.scale(-1, 1);
      offCtx.drawImage(video, sx, sy, sw, sh, 0, 0, ow, oh);
      offCtx.restore();

      // ── 픽셀 조작 (배럴 디스토션 + 글리치) ─────────────────────
      const { barrelStrength, glitch } = cfg;

      if (barrelStrength > 0 || glitch) {
        const srcData = offCtx.getImageData(0, 0, ow, oh);
        const dstData = offCtx.createImageData(ow, oh);
        const src = srcData.data;
        const dst = dstData.data;

        const cx = ow / 2;
        const cy = oh / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);

        // 글리치: 사인파 기반 RGB 오프셋 (좌우 분리량)
        const glitchOff = glitch
          ? Math.floor(Math.abs(Math.sin(glitchPhaseRef.current)) * 12 + 3)
          : 0;

        for (let y = 0; y < oh; y++) {
          for (let x = 0; x < ow; x++) {
            let bx = x;
            let by = y;

            // 배럴 디스토션: 출력 픽셀 → 소스 픽셀 역 매핑
            // r_src = r' / (1 + k * r'^2) → 중앙 확대, 가장자리 압축
            if (barrelStrength > 0) {
              const dx = x - cx;
              const dy = y - cy;
              const r = Math.sqrt(dx * dx + dy * dy) / maxR;
              if (r > 0) {
                const rSrc = r / (1 + barrelStrength * r * r);
                const scale = rSrc / r;
                bx = Math.round(cx + dx * scale);
                by = Math.round(cy + dy * scale);
                bx = Math.max(0, Math.min(ow - 1, bx));
                by = Math.max(0, Math.min(oh - 1, by));
              }
            }

            const di = (y * ow + x) * 4;

            if (glitch) {
              // RGB 채널 분리
              const rx = Math.max(0, Math.min(ow - 1, bx + glitchOff));
              const gx = bx;
              const bxOff = Math.max(0, Math.min(ow - 1, bx - glitchOff));

              dst[di]     = src[(by * ow + rx) * 4];         // R
              dst[di + 1] = src[(by * ow + gx) * 4 + 1];    // G
              dst[di + 2] = src[(by * ow + bxOff) * 4 + 2]; // B
              dst[di + 3] = 255;
            } else {
              const si = (by * ow + bx) * 4;
              dst[di]     = src[si];
              dst[di + 1] = src[si + 1];
              dst[di + 2] = src[si + 2];
              dst[di + 3] = src[si + 3];
            }
          }
        }

        offCtx.putImageData(dstData, 0, 0);
      }

      // ── CSS 필터 적용 후 메인 캔버스에 드로우 ────────────────────
      let filterStr = cfg.cssFilter;
      if (cfg.rainbow) {
        filterStr += ` hue-rotate(${Math.round(rainbowAngleRef.current)}deg)`;
      }

      ctx.filter = filterStr;
      ctx.drawImage(off, 0, 0, cw, ch);
      ctx.filter = 'none';

      // ── 글리치 스캔라인 오버레이 ──────────────────────────────────
      if (glitch && Math.random() > 0.55) {
        const lineY = Math.floor(Math.random() * ch);
        const lineH = Math.floor(Math.random() * 4) + 1;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255,0,0,${(Math.random() * 0.22).toFixed(2)})`;
        ctx.fillRect(0, lineY, cw, lineH);

        // 두 번째 스캔라인 (파란색 계열)
        if (Math.random() > 0.5) {
          const lineY2 = Math.floor(Math.random() * ch);
          ctx.fillStyle = `rgba(0,150,255,${(Math.random() * 0.18).toFixed(2)})`;
          ctx.fillRect(0, lineY2, cw, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // 애니메이션 값 갱신
      glitchPhaseRef.current += 0.45;
      rainbowAngleRef.current = (rainbowAngleRef.current + 3.5) % 360;
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef]); // videoRef만 의존 — config/enabled는 ref로 처리

  return <canvas ref={canvasRef} className={className} />;
};

export default CameraFilter;
