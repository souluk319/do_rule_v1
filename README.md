# 도를아십니까 (DO-RULE)

<img src="docs\images\do_rule_con.jpg" style="opacity: 0.8;">

**절대음 C(도)를 구분하는 음성 가창 게임**

[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)

---

## 🎮 게임 개요

제시된 단어를 **특정 음정(C3, C4, C5)을 발음**하여 클리어하는 웹 게임입니다.

### 💡 설계 철학

**틱톡/릴스 숏폼 콘텐츠 활용을 염두하여** 개발 하였습니다.

- **프론트엔드 중심 아키텍처**: 빠른 반응성과 부드러운 UI/UX
- **즉각적 피드백**: 실시간 음정 시각화
- **모바일 최적화**: 390x844
- **카메라 모드**: 실시간 녹화 및 공유 기능 (업데이트를 통해 제공)

추후 업데이트를 통해 플레이 화면과 리액션을 함께 녹화할 수 있습니다.

### 핵심 규칙

예: "모나리자" (4글자) = 4번 시도
- 1번: **모(C4)** + 나(C3) + 리(C3) + 자(C3)
- 2번: 모(C3) + **나(C4)** + 리(C3) + 자(C3)
- 3번: 모(C3) + 나(C3) + **리(C4)** + 자(C3)
- 4번: 모(C3) + 나(C3) + 리(C3) + **자(C4)**

각 시도마다 한 글자는 **High C**, 나머지는 **Low C**로 발음해야 합니다.

### 음정 매핑

| 성별 | 난이도 | Focus | Base |
|------|--------|-------|------|
| 남자 | Easy/Normal | C4 (261Hz) | C3 (130Hz) |
| 남자 | Hard | C3 (130Hz) | C4 (261Hz) |
| 여자 | Easy/Normal | C5 (523Hz) | C4 (261Hz) |
| 여자 | Hard | C4 (261Hz) | C5 (523Hz) |

---

## 🛠️ 기술 스택

### Frontend
- **React** + **TypeScript**: UI 구축
- **Zustand**: 전역 상태 관리
- **Tailwind CSS** + **Framer Motion**: 스타일링 & 애니메이션

### 음성 인식
- **Web Audio API**: 마이크 입력 처리
- **pitchfinder (YIN)**: 피치 감지 (정확도 95%+)
- **OscillatorNode**: 가이드 톤 생성

### AI (다중 폴백 전략)
- **Plan A - Ollama (EEVE)**: 한국어 특화 모델로 1차 시도
- **Plan B - Ollama (gemma2:2b)**: EEVE 실패/부족 시 2차 시도
- **Plan C - Fallback Words**: 모든 AI 실패 시 사전 정의 단어 사용

### 빌드
- **Vite**: 빠른 개발 서버 & 빌드

---

## 🎹 주파수 측정

FabFilter Pro-Q 4로 실측한 결과:

<img src="docs/images/c3_129_99.jpeg" width="500" alt="C3 측정">
<img src="docs\images\c4_264_10.jpeg" width="500" alt="C4 측정">
<img src="docs\images\c5_530_0.jpeg" width="500" alt="C5 측정">

- **C3**: 129.99Hz → 이론: 130.81Hz
- **C4**: 264.10Hz → 이론: 261.63Hz  
- **C5**: 530.00Hz → 이론: 523.25Hz

**코드 적용:**
```typescript
// src/core/PitchDetector.ts
private readonly frequencies = {
  C3: 130.81,  // 실측: 129.99Hz (오차 0.82Hz)
  C4: 261.63,  // 실측: 264.10Hz (오차 2.47Hz)
  C5: 523.25   // 실측: 530.00Hz (오차 6.75Hz)
};
```

> 💡 실측값과 이론값의 차이(±7Hz)는 피아노 조율 상태에 따른 것으로, 게임에서는 표준 이론값을 사용하여 범용성을 확보했습니다.

## 🤖 제시어 생성 로직 (3단계 폴백 전략)

매 라운드마다 새로운 단어를 생성하여 무한한 콘텐츠를 제공합니다.

### Plan A: EEVE 모델 (1순위)
```
📍 라운드 시작 → 4글자 단어 10개 필요
🤖 EEVE 호출: "정확히 4글자인 재미있는 한국어 명사 10개"
✅ EEVE 응답: 8개 성공
```
- 한국어 특화 LLM으로 자연스러운 단어 생성
- 10개 요청 → 랜덤 선택으로 다양성 확보
- 성공 시 → **즉시 게임 진행**

### Plan B: gemma2:2b 모델 (2순위)
```
⚠️ EEVE 부족: 8/10개만 생성
📍 Plan B: gemma2:2b로 2개 추가 생성
✅ gemma2:2b 응답: 2개 성공
✅ 총 10개 완성 (EEVE 8 + Gemma 2)
```
- EEVE가 실패하거나 부족한 만큼만 생성
- 빠르고 안정적인 보조 모델
- 예: EEVE 6개 → gemma로 4개 보충

### Plan C: 폴백 단어 (3순위)
```
⚠️ Plan B 부족: 총 5/10개만 생성
📍 Plan C: 기본 단어 풀에서 5개 추가
✅ 최종 10개 완성 (AI 5 + 폴백 5)
```
- 사전 정의된 재미있는 단어 풀 (글자수별 80개+)
- **절대 실패하지 않음** - 항상 게임 진행 보장
- 예: `피자나라`, `치킨공주`, `주식떡상` 등

### 실제 동작 예시

**시나리오 1: EEVE 완벽 성공 ✅**
```
🎲 제시어 생성: 4글자 x 10개
📍 Plan A: EEVE 시도
  ✓ "김치찌개" ✓ "불닭볶음" ✓ "치킨텐더" ...
✅ Plan A 성공! EEVE 10개 생성 완료
```

**시나리오 2: EEVE + gemma 조합 🔄**
```
🎲 제시어 생성: 4글자 x 10개
📍 Plan A: EEVE 시도 → 6개 성공
📍 Plan B: gemma2:2b로 4개 추가 → 4개 성공
✅ Plan B 성공! 총 10개 (EEVE 6 + Gemma 4)
```

**시나리오 3: 전체 폴백 🛡️**
```
🎲 제시어 생성: 6글자 x 10개
📍 Plan A: EEVE 실패 → 0개
📍 Plan B: gemma2:2b 시도 → 3개 성공
📍 Plan C: 폴백 단어 7개 추가
✅ Plan C 완료! 총 10개 (Gemma 3 + 폴백 7)
```

### 코드 위치
```typescript
// src/services/OllamaService.ts
async generatePrompts(charLen, count) {
  // Plan A: EEVE
  const eeveWords = await tryGenerateWithModel('eeve', ...);
  if (eeveWords.length >= count) return eeveWords;
  
  // Plan B: gemma2:2b
  const needed = count - eeveWords.length;
  const gemmaWords = await tryGenerateWithModel('gemma2:2b', ...);
  
  // Plan C: Fallback
  const defaultWords = getDefaultWords(charLen);
  return [...eeveWords, ...gemmaWords, ...defaultWords].slice(0, count);
}
```

> 💡 **왜 이렇게 복잡하게?**  
> EEVE는 한국어는 뛰어나지만 "정확히 N글자" 제약을 지키기 어려워합니다. 3단계 폴백으로 **항상 새로운 단어를 보장**하면서도 **게임 중단 없음**을 실현했습니다.


** 음성 입력 **

1. 마이크의 **'배경 소음'**과 **'실제 목소리'**를 구분하도록 '볼륨 문턱값'을 설정했습니다. (아무 말 안 할 땐 조용히 있도록!)

// 소리가 너무 작으면 스킵 (매우 관대하게 조정)
if (max < 0.0005 || rms < 0.00001) {
  return null;
}

YIN 알고리즘이 실패하면 즉시 **Autocorrelation**(자기상관) 방식으로 전환됩니다.

**Autocorrelation이란?**
- 파형이 스스로 반복되는 주기를 찾는 방법
- 예: "도도도도" 소리 → 반복 간격 측정 → 주파수 계산
- YIN보다 단순하지만 빠르고 안정적

즉, 음정이 튀거나 마이크 입력이 불안정해도 안정적으로 작동합니다."

그러나 사람의 목소리는 주파수의 복잡성이 너무 다양하기 때문에
현재의 프로토타입에서는 정확도가 아쉽습니다.
그렇기에 조금 관대한 세팅을 해 두었습니다.

---

## 📂 프로젝트 구조

```
src/
├─ components/          # React UI
│  ├─ MainMenu.tsx
│  ├─ GameCanvas.tsx
│  ├─ GameUI.tsx
│  └─ PianoKeyboard.tsx
├─ hooks/
│  └─ useGameLoop.ts    # 핵심 게임 로직
├─ store/
│  └─ gameStore.ts      # Zustand 상태
├─ core/
│  ├─ PitchDetector.ts  # 피치 감지 (YIN)
│  └─ OscillatorTone.ts # 가이드 톤
└─ services/
   └─ OllamaService.ts  # AI 제시어 생성
```

---

## 🚀 실행 방법

### 로컬 실행
```bash
# Ollama 실행
ollama pull eeve
ollama serve

# 프로젝트 실행
npm install
npm run dev
# → http://localhost:3001
```

### 외부 접속 (mobile or PC)
```bash
ngrok http 3001
# → https://xxx.ngrok-free.dev
```

### 빌드
```bash
npm run build
# → dist/ 폴더 생성
```

---

## 🐛 디버깅

### 마이크 안 됨
- 브라우저 주소창 자물쇠 → 마이크 권한 허용

### Ollama 연결 실패
- `ollama serve` 실행 확인
- 실패 시 Fallback 자동 작동

### 피치 감지 안 됨
- F12 → Console에서 "오디오 레벨" 확인
- 마이크 볼륨 높이기
- 정확한 음정으로 발음

---

## 📝 로드맵

### 계획 중
- **🎤 싱어 모드**: C3~C6 전체 음역대 사용, 모든 글자 다른 음정
- 멀티플레이어 (WebSocket)
- 리더보드 (Firebase)
- 튜토리얼 & 데일리 챌린지

### 최적화
- React.memo로 리렌더 최소화
- Web Worker로 피치 감지 분리
- Ollama 결과 캐싱

---

## 📄 라이선스

MIT License

---

## 🎵 게임 시연

👉 **[플레이하기](https://hillary-unsecluding-unphilosophically.ngrok-free.dev/)**

> ⚠️ 마이크 권한 필요

---

**Made with 💜 by KUGNUS**
