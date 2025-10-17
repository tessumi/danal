# 기억의 정원 (Memory Garden)

기억의 정원은 회상 · 퀴즈 · 감정 기록을 통해 인지 활동을 돕고, 정원에 꽃을 피워 나가는 웹 애플리케이션입니다. 서버는 Node.js/Express/SQLite, 프론트는 React/Vite 기반의 모노레포 구조로 구성되어 있으며, Gemini API를 활용한 보조 채점 기능을 포함합니다.

## 프로젝트 구조

```
memory-garden/
├─ server/               # Express + SQLite 백엔드
│  ├─ server.mjs         # 라우팅 및 비즈니스 로직
│  ├─ db.mjs             # SQLite 연결 및 헬퍼
│  ├─ schema.sql         # 데이터베이스 스키마
│  ├─ scoring.mjs        # 규칙 기반 점수 계산 + AI 결합
│  ├─ ai.mjs             # Gemini API 래퍼 (JSON 강제)
│  ├─ mailer.mjs         # 보호자 이메일 알림 (옵션)
│  ├─ seed.mjs           # 테스트 계정 시드 스크립트
│  └─ .env.example       # 환경 변수 템플릿
├─ web/                  # React 18 + Vite 프론트엔드
│  ├─ src/
│  │  ├─ App.jsx         # 인증/정원/리포트 라우팅
│  │  ├─ LoginSignup.jsx # 블랙 테마 전환 패널 로그인
│  │  ├─ Garden.jsx      # CSS 나무 + 열매 30개 골든앵글 배치
│  │  ├─ Play.jsx        # 3단계 게임 UI (모달)
│  │  ├─ Report.jsx      # 최근 7회 리포트 차트
│  │  ├─ api.js, auth.js # API/JWT 유틸리티
│  │  └─ components/     # Modal, Toast 등 공용 컴포넌트
│  ├─ vite.config.mjs
│  └─ index.html
└─ README.md
```

## 실행 방법

### 1. 서버 실행

```bash
cd server
npm install
cp .env.example .env    # 필요한 값 수정
npm run dev             # 기본 포트 3000
```

- `GOOGLE_API_KEY` 환경 변수를 실제 키로 채워야 Gemini API가 활성화됩니다.
- 환경 변수 미설정 시 규칙 기반 점수만 사용되며, `missing_api_key` 이유가 응답에 포함됩니다.

### 2. 웹 실행

```bash
cd web
npm install
VITE_API_URL=http://localhost:3000 npm run dev  # 기본 포트 5173
```

### 3. 시드 데이터

테스트 계정(`login_id: tester`, `password: password123`)을 생성하려면 다음 명령을 실행하세요.

```bash
cd server
npm run seed
```

## 주요 기능

- **JWT 인증**: 회원가입/로그인 후 7일 만료 토큰 발급, `/me`, `/garden`, `/play/submit`, `/report/weekly` 등 보호.
- **정원 화면**: CSS만으로 구현된 큰 나무와 30개의 열매(골든앵글 배치) 제공. 성공 시 낙하 애니메이션 및 꽃 연출.
- **3단계 게임**: 회상 → 퀴즈 → 감정 기록, 서버 제출 후 규칙 점수 + Gemini 보조 점수 합산 (0~100점).
- **엣지 케이스 처리**: 하루 1회 성공 제한, 과거 데이터 부재 시 안내(`no_historical_context`), AI 파싱 실패 시 규칙 점수 사용.
- **주간 리포트**: 최근 7회 점수를 막대 차트로 시각화, 평균 제공.
- **보호자 알림(옵션)**: SMTP 환경 설정 시 최근 3회 활동 메일 발송.

## 디자인 참고

- 로그인/회원가입 전환 패널은 *Weekly Coding Challenge #1: Sign in/up Form* 패턴을 기반으로 하되, 블랙 테마로 재구성했습니다.
- 정원, 열매, 꽃, 애니메이션은 순수 CSS/SVG 없이 CSS만으로 구현되었습니다.

## 환경 변수

`server/.env.example` 참고:

- `PORT`: 서버 포트 (기본 3000)
- `JWT_SECRET`: JWT 서명 비밀 키
- `GOOGLE_API_KEY`: Gemini API 키 (서버에서만 사용)
- `GEMINI_MODEL`: 기본 `gemini-1.5-flash`
- `SMTP_*`: 보호자 알림용 SMTP 설정

프론트엔드에 키가 노출되지 않도록 `.env` 파일은 버전에 포함하지 않습니다.

## 테스트 & 접근성

- 폼 요소에 라벨/`aria-label`, 포커스 링 제공.
- 모바일 360px 이상에서 반응형 동작.
- 열매 버튼은 44×44px 이상 크기로 접근성 기준을 충족합니다.

## 주의사항

- Gemini API 호출은 서버 사이드에서만 이뤄집니다. 프론트엔드에 키를 주입하거나 호출하지 마세요.
- SQLite 데이터는 `server/memory-garden.db`에 저장됩니다. 필요 시 삭제하여 초기화할 수 있습니다.
