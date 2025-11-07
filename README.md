# 도를아십니까 (DO-RULE)

**절대음 C(도)를 구분하는 음성 리듬 게임**

[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)

---

## 🎮 게임 개요

제시된 단어를 **특정 음정(C3, C4, C5)으로 발음**하여 클리어하는 웹 게임입니다.

### 💡 설계 철학

**틱톡/릴스 숏폼 콘텐츠 활용을 염두하여** 설계 하였습니다.

- **프론트엔드 중심 아키텍처**: 빠른 반응성과 부드러운 UI/UX
- **모바일 최적화**: 390x844
- **카메라 모드**: 실시간 녹화 및 공유 기능
- **즉각적 피드백**: 60fps 애니메이션, 실시간 음정 시각화

추후 업데이트를 통해 백엔드 없이 브라우저만으로 실행되어, 어디서든 즉시 플레이하고 녹화할 수 있습니다.

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

### AI
- **Ollama (eeve)**: 한국어 제시어 동적 생성
- Fallback Generator: Ollama 실패 시 백업

### 빌드
- **Vite**: 빠른 개발 서버 & 빌드

---

## 🎹 주파수 측정

FabFilter Pro-Q 4로 실측한 결과:

<img src="docs/images/c3_129_99.jpeg" width="500" alt="C3 측정">
<img src="docs\images\c4_264_10.jpeg" width="500" alt="C4 측정">
<img src="docs\images\c5_530_0.jpeg" width="500" alt="C5 측정">

- **C3**: 129.99Hz → 이론론: 130.81Hz
- **C4**: 264.10Hz → 이론: 261.63Hz  
- **C5**: 530.00Hz → 이론: 523.25Hz

```typescript
// src/core/PitchDetector.ts
private readonly frequencies = {
  C3: 130.81,
  C4: 261.63,
  C5: 523.25
};
```

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

### 외부 접속 (스마트폰)
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
