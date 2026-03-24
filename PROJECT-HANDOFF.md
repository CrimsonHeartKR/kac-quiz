# KAC Quiz - 프로젝트 인수인계 문서

> 최종 업데이트: 2026-03-20
> 다른 컴퓨터에서 이어서 개발할 수 있도록 환경 설정부터 작업 히스토리까지 정리한 문서입니다.

---

## 1. 프로젝트 개요

실시간 멀티플레이어 퀴즈 서비스. 운영자가 퀴즈를 생성·관리하고, 참가자가 QR코드/PIN으로 접속하여 실시간 퀴즈에 참여하는 시스템.

| 항목 | 내용 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 빌드 도구 | Vite 8 |
| CSS | Tailwind CSS v4 (`@tailwindcss/vite` 플러그인) |
| 백엔드 | Supabase (DB + Realtime + Storage) |
| 라우팅 | React Router v7 |
| 기타 | react-qr-code, lottie-react, docx |

---

## 2. 다른 컴퓨터에서 시작하기 (환경 설정)

### 2-1. 필수 프로그램 설치

#### (1) Node.js (v20 LTS 이상)
- 다운로드: https://nodejs.org/
- LTS 버전 설치 (npm 포함)
- 설치 확인: `node -v` / `npm -v`

#### (2) Git
- 다운로드: https://git-scm.com/downloads
- 설치 확인: `git --version`

#### (3) VS Code (권장 에디터)
- 다운로드: https://code.visualstudio.com/
- 권장 확장 프로그램:
  - ESLint
  - Tailwind CSS IntelliSense
  - TypeScript Importer
  - Prettier

#### (4) Claude Code CLI (AI 코딩 도우미)
- 설치: `npm install -g @anthropic-ai/claude-code`
- 실행: 프로젝트 폴더에서 `claude` 명령 실행
- API 키 필요 (Anthropic 계정)

### 2-2. 프로젝트 세팅

```bash
# 1. 프로젝트 폴더 복사 또는 git clone
# (git 저장소가 설정되어 있다면 clone, 아니면 폴더 복사)

# 2. 프로젝트 폴더로 이동
cd kac-quiz

# 3. 의존성 설치
npm install

# 4. 환경변수 파일 생성
# .env.local 파일을 프로젝트 루트에 생성하고 아래 내용 입력:
```

### 2-3. 환경변수 (.env.local)

```env
VITE_SUPABASE_URL=https://exeiahjopgoqtsrjliwk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_HNVPF7Cs3zbmEgDTjTz-Pw_ZhbbxUbp
```

### 2-4. 개발 서버 실행

```bash
npm run dev
# → http://localhost:5173 에서 접속 (또는 vite가 지정하는 포트)
```

### 2-5. 빌드 (배포용)

```bash
npm run build
# → dist/ 폴더에 정적 파일 생성
npm run preview
# → 빌드 결과 로컬 미리보기
```

---

## 3. 프로젝트 구조

```
kac-quiz/
├── src/
│   ├── pages/                    # 페이지 컴포넌트
│   │   ├── JoinPage.tsx          # 참가자 입장 (PIN 입력)
│   │   ├── WaitPage.tsx          # 참가자 대기
│   │   ├── PlayPage.tsx          # 참가자 퀴즈 화면
│   │   ├── HostSelectPage.tsx    # 운영자 퀴즈 선택
│   │   ├── HostLobbyPage.tsx     # 운영자 대기실 (QR+PIN+참가자목록)
│   │   ├── HostPlayPage.tsx      # 운영자 퀴즈 진행 제어
│   │   ├── ProjectorPage.tsx     # 프로젝터 표시용 (대형 스크린)
│   │   ├── AdminLoginPage.tsx    # 관리자 로그인
│   │   ├── AdminPage.tsx         # 관리자 대시보드
│   │   ├── AdminEditorPage.tsx   # 퀴즈 에디터 (생성/수정)
│   │   └── PreviewPage.tsx       # 미리보기
│   ├── components/
│   │   ├── ThemedBackground.tsx  # 레이어 기반 배경 (이미지+오버레이+UI)
│   │   ├── DashboardLayout.tsx   # 관리자 페이지 레이아웃
│   │   └── LottieAnimation.tsx   # Lottie 애니메이션 래퍼
│   ├── hooks/
│   │   └── useQuizSession.ts     # 세션 관리 훅 (Realtime 구독)
│   ├── lib/
│   │   ├── supabase.ts           # Supabase 클라이언트
│   │   ├── auth.ts               # 운영자 인증 (SHA-256)
│   │   ├── theme.ts              # 테마 시스템 (useTheme 훅)
│   │   ├── scoring.ts            # 점수 계산 (기본500 + 속도보너스500)
│   │   ├── schema.sql            # DB 기본 스키마
│   │   ├── schema-operators.sql  # 운영자 테이블
│   │   ├── schema-theme.sql      # 테마 JSONB 구조 문서
│   │   ├── schema-question-types.sql # OX/이미지 문항 확장
│   │   ├── schema-join-screen.sql    # 입장화면 커스터마이징
│   │   ├── storage-policy.sql    # Supabase Storage 정책
│   │   └── test-data.sql         # 테스트 데이터
│   ├── themes/                   # 테마 프리셋 JSON
│   │   ├── default.json
│   │   ├── aviation.json
│   │   └── safety.json
│   ├── App.tsx                   # 라우터 설정
│   ├── index.css                 # Tailwind + CSS 변수
│   └── main.tsx                  # 앱 진입점
├── .env.local                    # 환경변수 (Supabase 키)
├── .claude/launch.json           # Claude Code 개발서버 설정 (포트 5180)
├── vite.config.ts                # Vite 설정
├── tsconfig.json                 # TypeScript 설정
└── package.json                  # 의존성 및 스크립트
```

---

## 4. 라우트 구조

| 경로 | 페이지 | 용도 |
|------|--------|------|
| `/` | JoinPage | 참가자 입장 (PIN 입력) |
| `/wait` | WaitPage | 참가자 대기 화면 |
| `/play` | PlayPage | 참가자 퀴즈 플레이 |
| `/host` | HostSelectPage | 운영자 퀴즈 선택 |
| `/host/lobby` | HostLobbyPage | 운영자 대기실 |
| `/host/play` | HostPlayPage | 운영자 퀴즈 진행 |
| `/projector` | ProjectorPage | 프로젝터 화면 |
| `/admin/login` | AdminLoginPage | 관리자 로그인 |
| `/admin` | AdminPage | 관리자 대시보드 |
| `/admin/editor` | AdminEditorPage | 퀴즈 에디터 |
| `/preview` | PreviewPage | 미리보기 |

---

## 5. 데이터베이스 구조 (Supabase)

### 테이블 관계도

```
quiz_sets (퀴즈 세트)
  ├── questions (문항) — quiz_set_id FK
  └── sessions (세션) — quiz_set_id FK
       └── participants (참가자) — session_id FK

operators (운영자 계정)
  └── sessions.host_user_id FK
```

### 주요 테이블

#### quiz_sets
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 퀴즈 세트 ID |
| title | TEXT | 제목 |
| theme_config | JSONB | 테마 설정 (색상, 배경이미지, 로고 등) |
| join_bg_image | TEXT | 입장화면 배경 (레거시, theme_config 우선) |
| field1_label | TEXT | 입장 필드 라벨 (기본: '이름') |
| field1_placeholder | TEXT | 입장 필드 플레이스홀더 |

#### questions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 문항 ID |
| quiz_set_id | UUID (FK) | 소속 퀴즈 세트 |
| order_num | INTEGER | 출제 순서 |
| question_text | TEXT | 문제 텍스트 |
| slide_image_url | TEXT | 슬라이드 이미지 URL |
| options | JSONB | 선택지 배열 `["A","B","C","D"]` |
| correct_index | INTEGER | 정답 인덱스 (0~3) |
| time_limit | INTEGER | 제한시간(초, 기본 20) |
| question_type | TEXT | 유형: 'text', 'ox', 'image' |
| option_images | JSONB | 이미지 보기용 URL 배열 |

#### sessions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 세션 ID |
| quiz_set_id | UUID (FK) | 퀴즈 세트 |
| pin | TEXT (UNIQUE) | 4자리 참가 코드 |
| phase | TEXT | 진행 단계 (lobby→play→reveal→rank→ended) |
| current_question | INTEGER | 현재 문항 번호 |
| host_user_id | UUID (FK) | 운영자 ID |
| question_started_at | TIMESTAMPTZ | 문항 시작 시각 |

#### participants
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 참가자 ID |
| session_id | UUID (FK) | 세션 ID |
| name | TEXT | 이름 |
| class_name | TEXT | 소속/반 |
| score | INTEGER | 총점 |
| answers | JSONB | 답안 배열 |

#### operators
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | 운영자 ID |
| email | TEXT (UNIQUE) | 이메일 |
| password_hash | TEXT | SHA-256 비밀번호 해시 |
| name | TEXT | 이름 |
| role | TEXT | 'admin' 또는 'host' |
| is_active | BOOLEAN | 활성 여부 |

### 관리자 계정
- **이메일**: `admin@kac-quiz.com`
- **비밀번호**: `admin1234`

### Supabase Storage
- **버킷**: `quiz-images` (public read, authenticated write)
- 용도: 슬라이드 이미지, 배경 이미지, 로고 등 업로드

---

## 6. 테마 시스템

### 구조
`quiz_sets.theme_config` JSONB 컬럼에 모든 테마 데이터 저장.

### 주요 테마 속성

```json
{
  "name": "테마 이름",
  "primaryColor": "#1E40AF",
  "accentColor": "#F5C842",
  "bgColor": "#0A1628",
  "bgSecondary": "#111D35",
  "btnA": "#DC2626",    "btnB": "#1D4ED8",
  "btnC": "#D97706",    "btnD": "#059669",
  "timerSafe": "#059669", "timerWarn": "#D97706", "timerDanger": "#DC2626",
  "correct": "#059669",   "incorrect": "#DC2626",
  "bgImageWait": "https://...",
  "bgImagePlay": "https://...",
  "bgImageResult": "https://...",
  "bgImageProjector": "https://...",
  "logoUrl": "https://...",
  "eventName": "KAC 항공교육"
}
```

### 배경 이미지 계층 (ThemedBackground 컴포넌트)
1. **Layer 1**: 배경 이미지 (있으면 표시)
2. **Layer 2**: 오버레이 (가독성 보장, 기본 55% 불투명도)
3. **Layer 3**: UI 콘텐츠

### CSS 변수 (index.css)
`useTheme` 훅이 DB에서 테마를 로드하고 `:root`에 CSS 변수를 동적 적용.

---

## 7. 퀴즈 진행 흐름

```
[운영자] 퀴즈 생성 (AdminEditorPage)
    ↓
[운영자] 세션 시작 (HostSelectPage → HostLobbyPage)
    ↓                          ↓
[참가자] QR/PIN 입장         [프로젝터] 대기 화면
    ↓                          ↓
[운영자] "퀴즈 시작" 클릭
    ↓
phase: lobby → ready (3초 카운트다운) → play
    ↓
[참가자] 문제 풀기 ← [프로젝터] 문제+타이머 표시
    ↓
phase: play → reveal (정답 공개) → rank (순위) → 다음 문제 or ended
    ↓
[참가자] 최종 결과 화면    [프로젝터] 시상 화면
```

### 세션 phase 상태

| Phase | 설명 |
|-------|------|
| `lobby` | 대기실 (참가자 입장 중) |
| `ready` | 카운트다운 (3초) |
| `play` | 문제 풀이 중 |
| `reveal` | 정답 공개 |
| `rank` | 중간 순위 |
| `ended` | 퀴즈 종료 |

---

## 8. 작업 히스토리 (완료된 작업)

### 8-1. 전체 화면 최적화
- **내용**: 참가자 화면(PlayPage), 프로젝터(ProjectorPage), 운영자 화면(HostPlayPage, HostLobbyPage)을 브라우저 전체 화면으로 표시
- **변경 사항**:
  - ProjectorPage: `style={{ width: 1920, height: 1080 }}` 7개 인스턴스를 모두 `className="fixed inset-0 ..."` 으로 교체
  - HostPlayPage: `min-h-screen` → `fixed inset-0 overflow-auto`
  - PlayPage: 데스크톱 반응형 타이머 (48px/96px), `md:`/`lg:` 브레이크포인트 적용

### 8-2. 흰 화면(White Screen) 버그 수정
- **원인 1**: `var(--bg)` CSS 변수가 정의되지 않아 배경이 투명 처리됨
  - 수정: ThemedBackground, HostPlayPage, PlayPage의 로딩 상태에서 `#090D1A` 또는 `theme.bgColor` 사용
- **원인 2**: ThemedBackground에서 `relative` 클래스가 `fixed` 보다 우선 적용되어 전체 화면이 안 됨
  - 수정: `className.includes('fixed')` 조건부로 `position: relative` 적용

### 8-3. 카운트다운 타이머 조정
- **내용**: ready phase 카운트다운 5초 → 3초로 변경
- **변경 파일**: PlayPage.tsx (`setCount(3)`, `count / 3`), HostPlayPage.tsx (`setReadyCount(3)`, `readyCount / 3`)

### 8-4. 퀴즈 종료 후 문제 반복 버그 수정
- **원인**: PlayPage에서 `session.phase === 'ended'` 처리가 없어 마지막 문제가 반복 표시됨
- **수정**: `ended` phase 블록 추가 — 최종 순위, 점수, 메달 표시

### 8-5. 파일 업로드 기능 구현
- **내용**: 배경 이미지(대기/퀴즈/결과/프로젝터) + 로고를 URL 텍스트 입력 → 파일 업로드로 변경
- **변경 파일**: AdminEditorPage.tsx
- **기술**: Supabase Storage `quiz-images` 버킷에 업로드, URL 반환 후 theme_config에 저장
- 업로드 정책 안내 텍스트 추가 (포맷/사이즈/권장 해상도)

### 8-6. 대기실(HostLobbyPage) 완전 재디자인
- **레이아웃**:
  - 좌측 패널 (480px, 어두운 배경): QR코드(360px) + PIN 숫자 + 링크 복사 버튼
  - 우측 패널: 참가자 목록 영역 (배경 이미지 교체 가능) + 빨간색 "퀴즈 시작" 버튼
- **기능**: `theme.bgImageWait` 또는 `theme.bgImageProjector` 이미지를 참가자 목록 배경으로 사용
- **여백**: 참가자 목록 영역 내부 padding 32px (텍스트 크기에 맞춤)

---

## 9. 알려진 이슈 및 미완료 작업

### 9-1. Tailwind CSS v4 유틸리티 클래스 문제
- **현상**: 일부 Tailwind 유틸리티 클래스(예: `p-16`)가 CSS로 생성되지 않음
- **원인**: Tailwind v4가 CSS-first 설정 방식을 사용하며, JIT 스캔에서 누락되는 경우 있음
- **대처법**: 해당 경우 인라인 `style={{ padding: '64px' }}` 방식으로 직접 지정

### 9-2. 미등록 퀴즈 문항
- 20문항 시사상식 퀴즈를 Supabase DB에 등록하는 작업이 미완료

### 9-3. Storage 업로드 정책
- 현재 Supabase Storage는 `authenticated` 사용자만 업로드 가능하나, 앱은 `anon` 키로 접속
- 업로드 시 인증 문제가 발생할 수 있음 → Storage 정책 조정 필요할 수 있음

---

## 10. Supabase 데이터베이스 초기 설정

새 Supabase 프로젝트에서 처음 설정하는 경우, SQL Editor에서 아래 순서로 실행:

```
1. schema.sql              — 기본 테이블 생성
2. schema-operators.sql     — 운영자 테이블 + 기본 관리자 계정
3. schema-question-types.sql — OX/이미지 문항 확장
4. schema-theme.sql         — (문서용, 실행 불필요)
5. schema-join-screen.sql   — 입장화면 커스터마이징 필드
6. storage-policy.sql       — Storage 버킷 + 접근 정책
```

> 이미 기존 Supabase 프로젝트가 세팅되어 있으므로, 같은 `.env.local` 환경변수를 사용하면 별도 DB 설정 없이 바로 사용 가능합니다.

---

## 11. 주요 기술 참고사항

### Realtime 구독
- `sessions`와 `participants` 테이블에 Supabase Realtime 활성화
- `useQuizSession` 훅에서 실시간 구독 관리

### 인증 방식
- Supabase Auth가 아닌 **자체 인증** 사용 (operators 테이블 + SHA-256)
- 세션 정보는 `localStorage`에 저장

### 점수 계산
- 정답 시: 기본 500점 + 속도 보너스 (최대 500점)
- 속도 보너스 = `(남은시간 / 제한시간) × 500`
- 오답: 0점

### 배포
- Vite 빌드 결과(`dist/`)를 정적 호스팅 서비스에 배포
- Vercel, Netlify, Cloudflare Pages 등 사용 가능
- SPA이므로 모든 경로를 `index.html`로 리다이렉트하는 설정 필요

---

## 12. 개발 팁

1. **Claude Code 사용 시**: 프로젝트 루트(`kac-quiz/`)에서 `claude` 실행. `.claude/launch.json`으로 개발 서버 자동 설정 (포트 5180)
2. **Supabase 대시보드**: `.env.local`의 URL에서 프로젝트 ID 확인 후 https://supabase.com/dashboard 접속
3. **테마 수정**: 관리자 페이지(`/admin/editor`)에서 퀴즈별 테마 설정 가능
4. **새 문항 추가**: 관리자 페이지에서 UI로 추가하거나, Supabase SQL Editor에서 직접 INSERT
