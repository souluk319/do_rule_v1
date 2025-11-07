/**
 * 폴백 제시어 생성기 (Ollama 실패 시)
 */

const HANGUL_SYLLABLES = [
  // 자주 쓰는 한글 음절들 (실제 단어 느낌)
  '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하',
  '거', '너', '더', '러', '머', '버', '서', '어', '저', '처', '커', '터', '퍼', '허',
  '고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호',
  '구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후',
  '기', '니', '디', '리', '미', '비', '시', '이', '지', '치', '키', '티', '피', '히',
  '김', '밥', '국', '면', '빵', '떡', '죽', '찜', '볶', '찌',
  '불', '물', '눈', '별', '달', '해', '구', '름', '비', '바람',
  '춘', '하', '추', '동', '봄', '여름', '가을', '겨울',
  '친', '구', '가족', '엄마', '아빠', '형', '누나', '동생',
  '학교', '집', '회사', '병원', '은행', '시장',
];

/**
 * 랜덤 한글 제시어 생성
 */
export function generateFallbackPrompt(charLen: number): string {
  const result: string[] = [];
  for (let i = 0; i < charLen; i++) {
    const randomIndex = Math.floor(Math.random() * HANGUL_SYLLABLES.length);
    result.push(HANGUL_SYLLABLES[randomIndex]);
  }
  return result.join('');
}

/**
 * 미리 정의된 단어 풀 (더 자연스러운 폴백)
 */
const PREDEFINED_WORDS: Record<number, string[]> = {
  4: [
    '불닭볶음', '양념치킨', '김치찌개', '된장국', '비빔밥',
    '햇살따뜻', '바람시원', '구름많음', '눈사람', '봄꽃향기',
    '친구만남', '가족여행', '학교축제', '회사야근', '주말휴식'
  ],
  5: [
    '불닭볶음면', '양념치킨먹기', '김치찌개맛있다', '된장국끓이기', '비빔밥비벼',
    '햇살따뜻하다', '바람시원하다', '구름많은하늘', '눈사람만들기', '봄꽃향기좋아',
    '친구만남즐거워', '가족여행가자', '학교축제재밌다', '회사야근힘들다', '주말휴식필요해'
  ],
  6: [
    '불닭볶음면맵다', '양념치킨먹고싶다', '김치찌개진짜맛있다', '된장국끓이는중', '비빔밥비벼먹기',
    '햇살따뜻하네요', '바람시원하네요', '구름많은하늘이다', '눈사람만들어보자', '봄꽃향기진짜좋아',
    '친구만남즐거웠어', '가족여행가고싶다', '학교축제재밌었다', '회사야근진짜힘들다', '주말휴식진짜필요해'
  ]
};

/**
 * 자연스러운 폴백 제시어 (미리 정의된 풀 사용)
 */
export function generateNaturalFallback(charLen: number, usedPrompts: Set<string>): string {
  const pool = PREDEFINED_WORDS[charLen] || [];
  
  // 사용 안 한 단어 필터링
  const available = pool.filter(w => !usedPrompts.has(w));
  
  if (available.length > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }
  
  // 모두 사용했으면 랜덤 생성
  return generateFallbackPrompt(charLen);
}

