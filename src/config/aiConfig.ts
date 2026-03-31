/**
 * ============================================
 * AI 연동 설정 (Ollama / LLM 연결 제어)
 * ============================================
 *
 * 이 파일에서 Ollama(또는 다른 LLM)와의 연동을 켜고 끌 수 있습니다.
 *
 * .env 파일에 아래 변수를 추가하면 됩니다:
 *
 *   VITE_AI_ENABLED=true               # true 일 때만 Ollama 호출
 *   VITE_OLLAMA_URL=http://localhost:11434/api/generate
 *   VITE_OLLAMA_MODEL=eeve             # 모델명 (예: eeve, qwen3:4b, gemma2:2b)
 *   VITE_OLLAMA_TIMEOUT_MS=5000        # 응답 대기 최대 시간 (ms)
 *
 * 기본값: AI 비활성화 → 폴백 단어만 사용하여 게임 정상 동작
 *
 * ※ qwen3.5 등 다른 모델로 전환할 때는 VITE_OLLAMA_MODEL 만 바꾸면 됩니다.
 */

const env = (import.meta as any).env ?? {};

export const AI_CONFIG = {
  /** true 이면 Ollama API 호출, false 이면 즉시 폴백 단어 사용 */
  enabled: env.VITE_AI_ENABLED === 'true',

  /** Ollama API 엔드포인트 */
  ollamaUrl: (env.VITE_OLLAMA_URL as string) || 'http://localhost:11434/api/generate',

  /**
   * 사용할 모델명
   * - 현재 지원: eeve, gemma2:2b
   * - 추후 연결: qwen3:4b, llama3.2 등
   */
  model: (env.VITE_OLLAMA_MODEL as string) || 'eeve',

  /** API 응답 타임아웃 (ms). 초과 시 폴백 단어로 대체 */
  timeoutMs: Number(env.VITE_OLLAMA_TIMEOUT_MS) || 5000,
} as const;
