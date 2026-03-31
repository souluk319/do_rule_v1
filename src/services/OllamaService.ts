/**
 * ============================================
 * 📌 OllamaService.ts - eeve 모델 활용 핵심!
 * ============================================
 * 
 * 이 게임의 가장 중요한 특징: Ollama eeve를 활용한 동적 제시어 생성!
 * 
 * eeve 모델이란?
 * - 한국어 특화 LLM (Large Language Model)
 * - 자연스러운 한국어 단어 생성에 최적화
 * - 로컬에서 실행 가능 (개인정보 보호)
 * 
 * 활용 방식:
 * 1. 제시어 생성 (generatePrompts)
 *    - 4/5/6글자 한국어 단어 생성
 *    - 유머러스하고 발음하기 재미있는 단어 요청
 *    - 매 라운드마다 새로운 단어 → 무한한 콘텐츠!
 * 
 * 2. 코멘트 생성 (generateComment) - 선택 사항
 *    - 실패 시 격려 메시지
 *    - 게임 몰입도 향상
 * 
 * 폴백 메커니즘:
 * - Ollama 실패 시 → 미리 준비된 단어 풀 사용
 * - 게임 중단 없이 안정적 동작 보장
 */
import { AI_CONFIG } from '../config/aiConfig';
import { getFallbackPool } from '../utils/FallbackGenerator';

export interface GenerateRequest {
  mode: 'prompt' | 'comment';
  char_len?: number;
  count?: number;
  difficulty?: string;
}

export interface GenerateResponse {
  items?: string[];
  comments?: string[];
}

export class OllamaService {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string = AI_CONFIG.ollamaUrl, timeoutMs: number = AI_CONFIG.timeoutMs) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  /**
   * ===== 🤖 핵심 함수: 다중 폴백 전략으로 제시어 생성 =====
   * 
   * Plan A: EEVE 모델 시도 (한국어 특화)
   * Plan B: gemma2:2b 시도 (빠르고 안정적)
   * Plan C: 기본 단어 풀 사용 (마지막 보루)
   * 
   * @param charLen 생성할 단어의 글자 수 (4/5/6)
   * @param count 생성할 단어 개수 (기본 8개)
   * @param difficulty 난이도 (easy/normal/hard)
   * @returns 생성된 한국어 단어 배열
   */
  async generatePrompts(charLen: number, count: number = 8, difficulty: string = 'normal'): Promise<string[]> {
    console.log(`\n🎲 제시어 생성 시작: ${charLen}글자 x ${count}개`);

    // ===== Plan A: EEVE 시도 =====
    console.log('📍 Plan A: EEVE 모델 시도...');
    const eeveWords = await this.tryGenerateWithModel('eeve', charLen, count, difficulty);

    if (eeveWords.length >= count) {
      console.log(`✅ Plan A 성공! EEVE가 ${eeveWords.length}개 생성`);
      return eeveWords.slice(0, count);
    }

    console.log(`⚠️ Plan A 부족: EEVE ${eeveWords.length}/${count}개만 생성`);

    // ===== Plan B: gemma2:2b로 부족한 만큼만 생성 =====
    const needed = count - eeveWords.length;
    console.log(`📍 Plan B: gemma2:2b로 ${needed}개 추가 생성 시도...`);
    const gemmaWords = await this.tryGenerateWithModel('gemma2:2b', charLen, needed, difficulty);

    const combined = [...eeveWords, ...gemmaWords];

    if (combined.length >= count) {
      console.log(`✅ Plan B 성공! 총 ${combined.length}개 (EEVE ${eeveWords.length} + Gemma ${gemmaWords.length})`);
      return combined.slice(0, count);
    }

    console.log(`⚠️ Plan B 부족: 총 ${combined.length}/${count}개만 생성`);

    // ===== Plan C: 폴백 단어 풀로 나머지 채우기 =====
    console.log('📍 Plan C: 폴백 단어 풀 사용...');
    const defaultWords = getFallbackPool(charLen);
    const finalWords = [...combined];

    for (const word of defaultWords) {
      if (finalWords.length >= count) break;
      if (!finalWords.includes(word)) {
        finalWords.push(word);
      }
    }

    console.log(`✅ Plan C 완료! 총 ${finalWords.length}개 생성됨\n`);
    return finalWords.slice(0, count);
  }

  /**
   * 특정 모델로 단어 생성 시도
   */
  private async tryGenerateWithModel(
    model: string,
    charLen: number,
    count: number,
    difficulty: string
  ): Promise<string[]> {
    try {
      const prompt = this.buildPromptPrompt(charLen, difficulty);
      const options = model === 'eeve'
        ? {
          temperature: 0.8,
          top_p: 0.9,
          top_k: 50,
          num_predict: 120,
          repeat_penalty: 1.3,
          stop: ["\n\n\n", "예시:", "설명:", "조건:"]
        }
        : {
          temperature: 0.8,
          top_p: 0.9,
          num_predict: 150
        };

      // 타임아웃 제어 (AbortController)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
          options: options
        })
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`${model} API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.response || '';

      console.log(`  🤖 ${model} 원본 응답:`, text.substring(0, 200));

      // 응답 파싱
      const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
      const items: string[] = [];

      for (const line of lines) {
        let cleaned = line
          .replace(/^[\d\-.\s)]+/, '')
          .replace(/[^\uAC00-\uD7A3]/g, '')
          .trim();

        if (cleaned.length === charLen && !items.includes(cleaned)) {
          items.push(cleaned);
          console.log(`    ✓ "${cleaned}"`);
        }

        if (items.length >= count) break;
      }

      console.log(`  ✅ ${model}: ${items.length}개 파싱 성공`);
      return items;
    } catch (error) {
      console.error(`  ❌ ${model} 실패:`, error);
      return [];
    }
  }

  /**
   * 코멘트 생성
   */
  async generateComment(difficulty: string): Promise<string> {
    try {
      const prompt = this.buildCommentPrompt(difficulty);
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'eeve',
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.response || '다시 시도해보세요!').trim();
    } catch (error) {
      console.warn('Ollama 코멘트 생성 실패:', error);
      return '다시 시도해보세요!';
    }
  }

  private buildPromptPrompt(charLen: number, _difficulty: string): string {
    // EEVE/gemma 공용: 명확한 프롬프트
    const examples = this.getExamplesForLength(charLen);

    return `아래 예시처럼 정확히 ${charLen}글자인 재미있는 한국어 명사를 10개 생성하세요.
번호나 설명 없이 단어만 한 줄에 하나씩 출력하세요.

예시:
${examples[0]}
${examples[1]}
${examples[2]}
${examples[3]}
${examples[4]}
${examples[5]}
${examples[6]}
${examples[7]}

이제 위 예시와 다른 새로운 ${charLen}글자 단어 10개를 생성하세요:`;
  }

  private getExamplesForLength(charLen: number): string[] {
    if (charLen === 4) {
      return ['김치찌개', '불닭볶음', '치킨텐더', '카페라떼', '주식떡상', '피자나라', '스시박사', '쟁반짜장', '제로콜라', '커피우유'];
    } else if (charLen === 5) {
      return ['감자요정님', '알잘딱깔센', '부끄럼대장', '주몽왕자님', '햄버거세트', '피자도우반죽', '짜장면배달', '탕수육소스', '커피머신기', '독서의계절'];
    } else {
      return ['김치찌개백반', '점심뭐먹을까', '디진다돈까스', '야근무한반복', '에이아이캠프', '피자도우반죽', '짜장면배달원', '여신등장주의', '럭키비키잖아', '프랑켄슈타인'];
    }
  }

  private buildCommentPrompt(_difficulty: string): string {
    return `절대음감 게임에서 실패했을 때의 재미있는 코멘트를 생성해주세요.
- 유머러스하고 격려하는 톤
- 예시: "도를 놓치셨습니다.", "다시 마음을 가다듬으세요.", "음정이 살짝 어긋났어요!"

코멘트 하나만 출력하세요.`;
  }

  // getDefaultWords 제거됨 → FallbackGenerator.getFallbackPool() 사용
}
