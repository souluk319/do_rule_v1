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
const OLLAMA_BASE_URL = (import.meta as any).env?.VITE_OLLAMA_URL || 'http://localhost:11434/api/generate';

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

  constructor(baseUrl: string = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * ===== 🤖 핵심 함수: eeve로 제시어 생성 =====
   * 
   * 이 함수가 게임의 핵심입니다!
   * 
   * @param charLen 생성할 단어의 글자 수 (4/5/6)
   * @param count 생성할 단어 개수 (기본 8개)
   * @param difficulty 난이도 (easy/normal/hard)
   * @returns 생성된 한국어 단어 배열
   * 
   * 동작 방식:
   * 1. eeve 모델에 프롬프트 전송
   *    - "4글자, 유머러스한 일상어 8개 생성해줘"
   * 2. eeve 응답 수신 및 파싱
   *    - 한글만 필터링, 중복 제거
   * 3. 부족하면 폴백 단어로 채우기
   * 4. 게임에 단어 반환
   * 
   * 예시 프롬프트:
   * "다음 조건에 맞는 한국어 단어를 생성해주세요:
   *  - 정확히 4글자
   *  - 병맛스럽고 유머러스한 일상어
   *  - 발음하기 재미있는 단어
   *  단어만 한 줄에 하나씩 출력하세요."
   * 
   * 예시 eeve 응답:
   * "불닭볶음
   *  양념치킨
   *  김치찌개
   *  ..."
   */
  async generatePrompts(charLen: number, count: number = 8, difficulty: string = 'normal'): Promise<string[]> {
    // Ollama URL이 localhost이고 접근 불가능한 경우 바로 기본 단어 사용
    if (this.baseUrl.includes('localhost') && typeof window !== 'undefined') {
      // 로컬 Ollama 서버 확인 (옵션)
      const useOllama = (import.meta as any).env?.VITE_USE_OLLAMA !== 'false';
      if (!useOllama) {
        console.log('⚠️ Ollama 비활성화됨 → 폴백 단어 사용');
        return this.getDefaultWords(charLen).slice(0, count);
      }
    }

    console.log(`🤖 Ollama eeve 호출 시도: ${charLen}글자 x ${count}개`);
    try {
      const prompt = this.buildPromptPrompt(charLen, difficulty);
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
      const text = data.response || '';
      
      // 응답 파싱 (한 줄당 하나의 단어)
      const items = text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length === charLen && /^[가-힣]+$/.test(line))
        .slice(0, count);

      // 부족하면 기본 단어로 채우기
      const defaultWords = this.getDefaultWords(charLen);
      while (items.length < count) {
        const randomWord = defaultWords[Math.floor(Math.random() * defaultWords.length)];
        if (!items.includes(randomWord)) {
          items.push(randomWord);
        }
      }

      console.log(`✅ Ollama eeve 응답: ${items.length}개 단어 생성됨`);
      return items.slice(0, count);
    } catch (error) {
      console.error('❌ Ollama API 실패 → 폴백 단어 사용:', error);
      // 기본 단어 풀을 더 다양하게 사용
      return this.getDefaultWords(charLen).slice(0, count);
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
    return `다음 조건에 맞는 한국어 단어를 생성해주세요:
- 정확히 ${charLen}글자
- 병맛스럽고 유머러스한 일상어
- 발음하기 재미있는 단어
- 예시: ${this.getDefaultWords(charLen).slice(0, 3).join(', ')}

단어만 한 줄에 하나씩 출력하세요.`;
  }

  private buildCommentPrompt(_difficulty: string): string {
    return `절대음감 게임에서 실패했을 때의 재미있는 코멘트를 생성해주세요.
- 유머러스하고 격려하는 톤
- 예시: "도를 놓치셨습니다.", "다시 마음을 가다듬으세요.", "음정이 살짝 어긋났어요!"

코멘트 하나만 출력하세요.`;
  }

  private getDefaultWords(charLen: number): string[] {
    const words: Record<number, string[]> = {
      4: [
        '불닭볶음', '양념치킨', '김치찌개', '된장국물', '비빔밥맛',
        '햇살따뜻', '바람시원', '구름하늘', '눈사람만', '봄꽃향기',
        '친구만남', '가족여행', '학교축제', '회사야근', '주말휴식',
        '피자먹기', '커피마시', '게임하기', '영화보기', '음악듣기',
        '책읽기좋', '산책가자', '운동하자', '공부하기', '잠자기좋',
        '행복해요', '사랑해요', '고마워요', '미안해요', '힘내세요',
        '웃어봐요', '울지마요', '괜찮아요', '좋아해요', '싫어해요',
        '맛있어요', '배고파요', '졸려요즘', '피곤해요', '힘들어요'
      ],
      5: [
        '불닭볶음면', '양념치킨맛', '김치찌개끓', '된장국물맛', '비빔밥비벼',
        '햇살따뜻해', '바람시원해', '구름많은날', '눈사람만들', '봄꽃향기좋',
        '친구만나자', '가족여행가', '학교축제다', '회사야근중', '주말휴식해',
        '피자먹고파', '커피마시자', '게임하고파', '영화보고파', '음악듣고파',
        '책읽고싶다', '산책가고파', '운동하자요', '공부해야지', '잠자고싶다',
        '행복하세요', '사랑합니다', '고맙습니다', '미안합니다', '힘내세요요',
        '웃어봐요오', '울지마세요', '괜찮습니다', '좋아합니다', '싫어합니다',
        '맛있습니다', '배고픕니다', '졸립니다요', '피곤합니다', '힘듭니다요'
      ],
      6: [
        '불닭볶음면맵다', '양념치킨먹기', '김치찌개끓이기', '된장국물맛나', '비빔밥비벼먹기',
        '햇살따뜻하다요', '바람시원하다요', '구름많은하늘', '눈사람만들기', '봄꽃향기좋다',
        '친구만나러가자', '가족여행가고파', '학교축제재밌다', '회사야근힘들다', '주말휴식필요해',
        '피자먹고싶어요', '커피마시고싶다', '게임하고싶어요', '영화보고싶어요', '음악듣고싶다',
        '책읽고싶어요', '산책가고싶어요', '운동하고싶다', '공부해야하는데', '잠자고싶어요',
        '행복하세요오', '사랑합니다아', '고맙습니다아', '미안합니다아', '힘내세요오오',
        '웃어봐요오오', '울지마세요오', '괜찮습니다아', '좋아합니다아', '싫어합니다아',
        '맛있습니다아', '배고픕니다아', '졸립니다아아', '피곤합니다아', '힘듭니다아아'
      ]
    };
    const list = words[charLen] || words[4];
    
    // 랜덤 셔플
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    console.log(`🎲 폴백 단어 생성 (${charLen}글자, 셔플됨):`, shuffled.slice(0, 5));
    return shuffled;
  }
}

