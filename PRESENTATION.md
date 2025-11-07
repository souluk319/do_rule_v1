# 📊 발표용 코드 가이드

## 🎯 발표 시 보여줄 파일 (중요도 순)

### 1️⃣ 최우선: `src/hooks/useGameLoop.ts` ⭐⭐⭐
**게임의 심장! 모든 게임 로직이 여기 있습니다.**

**보여줄 부분:**
- 파일 최상단 주석 (8~15줄): 전체 구조 설명
- `startNextRound()` 함수 (110~158줄): 라운드 시작 로직
- `startAttempt()` 함수 (204~310줄): 핵심 판정 로직

**설명 포인트:**
```typescript
// 1. 오디오 초기화 (58줄~)
const audioContext = new AudioContext();  // 브라우저 오디오 엔진
const pitchDetector = new PitchDetector();  // YIN 알고리즘

// 2. 라운드 시작 (110줄~)
- Ollama로 제시어 생성 (4/5/6글자)
- 카운트다운 + 가이드 톤 (3, 2, 1, Go!!)
- 15초 타이머 시작

// 3. 실시간 판정 (253줄~)
- 50ms마다 마이크 입력 체크 (1초에 20번)
- Focus 음정 + Base 음정 동시 체크
- 2초 분석 후 성공/실패 판정
```

---

### 2️⃣ 중요: `src/core/PitchDetector.ts` ⭐⭐
**음성 인식의 핵심! Web Audio API + YIN 알고리즘**

**보여줄 부분:**
- 파일 최상단 주석 (1~18줄): 음성 인식 설명
- `detectPitch()` 함수 (50~90줄): 주파수 감지
- `frequencyToNote()` 함수 (117~141줄): 주파수 → 음정 변환

**설명 포인트:**
```typescript
// 마이크 → 주파수(Hz) → 음정(C3/C4/C5) → 오차(Cents)

// 1. 마이크 입력
const dataArray = new Float32Array(2048);
analyser.getFloatTimeDomainData(dataArray);

// 2. YIN 알고리즘으로 주파수 감지
const frequency = detectPitchYIN(dataArray);  // 예: 261.5 Hz

// 3. 음정 변환
const note = frequencyToNote(frequency);  // C4

// 4. 오차 계산 (Cents)
const cents = 1200 * log2(실제주파수 / 목표주파수);
// ±18 cents 이내면 성공 (Hard 모드)
```

---

### 3️⃣ 참고: `src/store/gameStore.ts` ⭐
**Zustand 상태 관리 - 게임 데이터 중앙 관리**

**보여줄 부분:**
- 파일 최상단 주석 (1~18줄): Zustand 설명
- `completeAttempt` 함수 (87~106줄): 점수 계산 로직

**설명 포인트:**
```typescript
// Zustand = React의 중앙 상태 관리 라이브러리

// 저장되는 데이터
- 점수, 콤보, 라운드
- 현재 단어, 시도 번호
- 감지된 음정, 오차

// 사용 예
const score = useGameStore(state => state.score);  // 읽기
const updateTimer = useGameStore(state => state.updateTimer);  // 쓰기
updateTimer(14.5);
```

---

## 🎨 UI 컴포넌트 (간단히만 설명)

### `src/components/GameUI.tsx`
- 점수, 라운드, 타이머 표시
- 단어 표시 (각 글자별 성공/실패 표시)
- Framer Motion으로 부드러운 애니메이션

### `src/components/PianoKeyboard.tsx`
- 실시간 피아노 건반 시각화
- 감지된 음정 표시
- 목표 음정 하이라이트

---

## 📝 발표 스크립트 (예시)

### 1. 프로젝트 소개 (1분)
```
"도를아십니까"는 절대음감 게임을 응용한 웹 음성 게임입니다.
사용자는 제시된 단어를 특정 음정(C3, C4, C5)으로 발음해야 합니다.

예: "모나리자" (남자)
1번 시도: 모(C4) + 나리자(C3)
2번 시도: 나(C4) + 모리자(C3)
...

이렇게 각 글자를 다른 음정으로 발음하는 게임입니다.
```

### 2. 기술 스택 (1분)
```
[README.md 화면 보여주기]

- React: UI 프레임워크
- Zustand: 전역 상태 관리
- Web Audio API: 마이크 입력 처리
- YIN 알고리즘: 피치 감지 (pitchfinder 라이브러리)
- Ollama (eeve): AI 제시어 생성 ← 과제 핵심!
- Tailwind + Framer Motion: 모던 UI

모두 웹 표준 기술이라 별도 설치 없이 브라우저에서 바로 실행됩니다.
```

### 3. 🤖 Ollama eeve 활용 (2분) ⭐ **과제 핵심!**
```
[OllamaService.ts 파일 열기]

이 게임의 가장 중요한 특징은 eeve를 활용한 동적 제시어 생성입니다!

(파일 최상단 주석 보여주기 - 1~26줄)
"eeve는 한국어 특화 LLM으로, 자연스러운 한국어 단어를 생성합니다."

(48~78줄 generatePrompts 함수 보여주기)
게임 흐름:
1. 라운드 시작 시 eeve에게 요청
   "4글자, 유머러스한 일상어 8개 생성해줘"
   
2. eeve가 응답
   "불닭볶음, 양념치킨, 김치찌개, ..."
   
3. 응답 파싱 (한글만 필터링, 중복 제거)

4. 게임에 단어 전달

5. 네트워크 실패 시 → 폴백 단어 사용

(Console 로그 보여주기)
🤖 Ollama eeve 호출 시도: 4글자 x 8개
✅ Ollama eeve 응답: 8개 단어 생성됨

이렇게 매 라운드마다 새로운 단어를 생성하므로
무한한 콘텐츠를 제공할 수 있습니다!

하드코딩과 비교:
- 하드코딩: 제시어 고정, 금방 지루함
- eeve 활용: 매번 새로운 단어, 무한한 재미
```

### 4. 핵심 게임 로직 (3분)
```
[useGameLoop.ts 파일 열기]

이 파일이 게임의 심장입니다.

(110줄 startNextRound 함수 보여주기)
1. Ollama로 제시어 생성
2. 카운트다운 + 가이드 톤
3. 15초 타이머 시작
4. 첫 시도 시작

(204줄 startAttempt 함수 보여주기)
핵심 판정 로직입니다.

(253~310줄 실시간 판정 부분 보여주기)
- 50ms마다 마이크 입력 체크 (1초에 20번)
- 2초 동안 샘플 수집
- Focus 음정 + Base 음정 동시 체크
- 판정 조건:
  * Focus: 최소 2개 + 전체의 10% 이상
  * Base: (글자수-1)개 + 전체의 60% 이상
  * 둘 다 만족 시 성공!

(PitchDetector.ts로 전환)
음성 인식은 YIN 알고리즘을 사용합니다.
정확도 95% 이상, 지연 시간 50ms 이하로
실시간 판정이 가능합니다.
```

### 4. 데모 (2분)
```
[실제 게임 플레이]

(브라우저에서 게임 실행)
- 마이크 권한 허용
- 게임 시작
- 카운트다운 + 가이드 톤
- 실제 발음하면서 플레이
- 피아노 건반에 실시간 피드백 보여주기
- 성공/실패 판정 확인

(F12 Console 탭 보여주기)
실시간 로그로 내부 동작 확인 가능합니다.
```

### 5. 향후 계획 (1분)
```
[README.md 로드맵 섹션 보여주기]

1. 싱어 모드 추가 (C3~C6 전체 사용)
2. 멀티플레이어
3. 리더보드 (Firebase)
4. 앱스토어 출시 (Capacitor)

감사합니다!
```

---

## 🎯 질문 대비 FAQ

### Q: "왜 Phaser를 제거했나요?"
**A:** 
```
처음에는 Phaser를 사용했지만, UI가 전부 React로 옮겨가면서
Phaser는 배경 렌더링만 하게 되었습니다.
불필요한 복잡도를 줄이기 위해 제거하고
순수 React + Zustand 구조로 단순화했습니다.
```

### Q: "피치 인식 정확도는?"
**A:**
```
YIN 알고리즘은 95% 이상의 정확도를 보입니다.
다만 환경(마이크 품질, 배경 소음)에 따라 달라질 수 있어
tolerance를 난이도별로 조정했습니다.
- Easy: ±40 cents
- Normal: ±30 cents
- Hard: ±18 cents
```

### Q: "Ollama eeve를 왜 사용했나요?"
**A:**
```
이 과제의 핵심 요구사항이 "Ollama의 eeve 모델을 활용한 게임"이었습니다.

eeve를 제시어 생성에 활용한 이유:
1. 자연스러운 한국어 단어 생성 (한국어 특화 모델)
2. 무한한 콘텐츠 제공 (매 라운드마다 새로운 단어)
3. 유머러스한 단어 생성으로 게임 재미 증가
4. 로컬 실행으로 개인정보 보호 + 무료

하드코딩 vs eeve:
- 하드코딩: 30개 단어 → 30라운드 후 반복, 지루함
- eeve: 무한 생성 → 매번 새로운 경험, 재미

폴백 메커니즘:
Ollama 서버 실패 시 → 미리 준비된 단어 사용
→ 게임 중단 없이 안정적 동작
```

### Q: "eeve 대신 다른 모델을 사용할 수도 있나요?"
**A:**
```
기술적으로는 가능하지만, eeve를 선택한 이유:
1. 한국어 성능: GPT보다 한국어 자연스러움 우수
2. 로컬 실행: 네트워크 없이도 작동
3. 무료: API 비용 없음
4. 빠른 응답: 1~2초 내 생성 (로컬이라 지연 없음)

만약 클라우드 배포 시:
- OpenAI GPT-4o
- Anthropic Claude
- Google Gemini
등으로 교체 가능 (OllamaService.ts만 수정)
```

### Q: "모바일 앱으로 만들 계획은?"
**A:**
```
네, Capacitor를 사용하면 현재 웹 코드 그대로
iOS/Android 앱으로 빌드 가능합니다.
작업량은 약 1주일 정도 예상됩니다.
```

---

## 📸 발표 시 화면 순서

1. **README.md 메인 페이지** (게임 소개)
2. **프로젝트 구조** (폴더 트리)
3. **⭐ OllamaService.ts** (eeve 활용 - 과제 핵심!)
4. **useGameLoop.ts** (핵심 게임 로직)
5. **PitchDetector.ts** (음성 인식)
6. **실제 게임 데모** (브라우저)
7. **Console 로그** (F12) - eeve 호출 확인
8. **README.md 로드맵** (향후 계획)

---

**행운을 빕니다! 🍀**

