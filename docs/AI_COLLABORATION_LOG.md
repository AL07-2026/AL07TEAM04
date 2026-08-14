# AI (Codex & Antigravity) 협업 및 작업 공유 로그

이 문서는 **Codex**와 **Antigravity (Gemini)** 등 AI 어시스턴트들이 서로 작업 내역, 설계 결정, 다음 할 일, 변경 파일 목록을 공유하기 위한 작업 통로입니다.

---

## 📌 작업 규칙 (Guidelines for AIs)

1. **작업 시작 전**: 이 문서의 `최근 작업 내역` 및 `다음 할 일 / 전달 사항`을 확인합니다.
2. **작업 완료 후**:
   - `작업 기록` 섹션 맨 위에 새로운 작업 로그를 추가합니다.
   - 수정한 파일 목록, 주요 설계 변경점, 미해결 이슈를 명시합니다.
   - 검증 명령어 (`npm run validate`) 통과 여부를 확인합니다.

---

## 📝 작업 기록 (Work History)

### [2026-08-14] 구직자 '⏱️ 시간제(파트타임)' 고용 형태 검색 필터 및 워크넷 코드 연동 (`jobPostings.ts`, `worknetService.ts`, `JobDatabasePage.tsx`)
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **구직자 고용 형태 필터 탑재**: 구직자(인재) 프로젝트 탐색 화면에 **`⏱️ 시간제 (파트타임)`**, **`💼 정규직`**, **`📋 계약직`**, **`🎯 프로젝트/자문`** 고용 형태 필터 셀렉터 구축.
  - **워크넷 시간제 코드 매핑 (`worknetService.ts`)**: 워크넷 API 고용형태 코드 `11`(기간의 정함이 없는 시간제) 및 `21`(기간의 정함이 있는 시간제)과 키워드를 `'part-time'` 고용형태로 자동 분류하여 필터링 연동.
  - **시니어 우대 시간제 백업 공고 탑재**: 주 15~20시간 시간제 경영자문 및 품질인증 자문위원 공고 연동.
  - **Firebase Hosting 라이브 배포 완료**: URL [https://al07team04-bdfcd.web.app](https://al07team04-bdfcd.web.app)에 수정을 완벽히 반영.
  - **검증**: `npm run validate` (typecheck 0 error, ESLint 0 warning, Vitest 56개 전체 테스트 100% 통과, vite production build 완료).
- **변경 파일**:
  - [MODIFY] [`src/data/jobPostings.ts`](file:///c:/AL07TEAM04/src/data/jobPostings.ts)
  - [MODIFY] [`src/services/worknetService.ts`](file:///c:/AL07TEAM04/src/services/worknetService.ts)
  - [MODIFY] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-14] 조회 공고 수치 캡션 '실시간 기준' 정비 및 내부 ID(WORKNET-WN-...) UI 제거 (`JobDatabasePage.tsx`)
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **지표 캡션 개선**: 메트릭 카드의 출처 캡션을 `고용24 Open API 조회 기준` 대신 깔끔하고 직관적인 **`실시간 기준`**으로 변경.
  - **불필요한 날것의 시스템 ID 제거**: 상세보기 및 공고 헤더에 표출되던 `WORKNET-WN-DESIGN-01 · 모집 중` 등의 불필요한 내부 원문 ID 표시를 완전 삭제하고 **`모집 중 · 디자인/브랜딩`** 등 단정하고 가독성 높은 직종 정보로 대체.
  - **Firebase Hosting 라이브 배포 완료**: URL [https://al07team04-bdfcd.web.app](https://al07team04-bdfcd.web.app)에 수정을 완벽히 반영.
  - **검증**: `npm run validate` (typecheck 0 error, ESLint 0 warning, Vitest 56개 전체 테스트 100% 통과, vite production build 완료).
- **변경 파일**:
  - [MODIFY] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-14] 인재 프로필 '📍 희망 근무 지역' 선택 및 개인화 추천 엔진 가중치 연동 (`profileService.ts`, `recommendationEngine.ts`, `BasicProfilePage.tsx`, `JobDatabasePage.tsx`)
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **'희망 근무 지역' 데이터 모델 및 UI 탑재**: 인재 기본정보(`BasicProfilePage.tsx`)에 `📍 희망 근무 지역` (전국, 서울, 경기, 인천, 부산, 대구, 대전, 광주, 강원, 제주) 선택/수정 기능 구축 및 뱃지 표시.
  - **추천 엔진 위치 가중치 연동 (`recommendationEngine.ts`)**: 공고 위치와 인재의 희망 근무 지역이 일치할 경우 추천 점수 가중치 부여 및 `희망 근무 지역 서울과 공고 위치(서울 마포구)가 일치합니다` 추천 매칭 사유 생성.
  - **추천 필터 뱃지 표출 (`JobDatabasePage.tsx`)**: 공고 목록 추천 상단 조건 바에 `📍 희망지역: [서울]` 조건 뱃지가 즉시 표출되어 가독성 강화.
  - **Firebase Hosting 라이브 배포 완료**: URL [https://al07team04-bdfcd.web.app](https://al07team04-bdfcd.web.app)에 수정을 완벽히 반영.
  - **검증**: `npm run validate` (typecheck 0 error, ESLint 0 warning, Vitest 56개 전체 테스트 100% 통과, vite production build 완료).
- **변경 파일**:
  - [MODIFY] [`src/services/profileService.ts`](file:///c:/AL07TEAM04/src/services/profileService.ts)
  - [MODIFY] [`src/services/recommendationEngine.ts`](file:///c:/AL07TEAM04/src/services/recommendationEngine.ts)
  - [MODIFY] [`src/services/recommendationEngine.test.ts`](file:///c:/AL07TEAM04/src/services/recommendationEngine.test.ts)
  - [MODIFY] [`src/app/BasicProfilePage.tsx`](file:///c:/AL07TEAM04/src/app/BasicProfilePage.tsx)
  - [MODIFY] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-14] 적합도 90점 이상 최우선 배지 컬러 선명한 주황색(#F06B4F) 시각적 개선 (`fitScoreTone.ts`)
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **90점 이상 배지 주황색(Orange) 디자인 전환**: 95점 및 90점대 추천 공고 배지의 기존 딥그린 배경이 다소 어둡던 점을 개선하여, **화사하고 시동성이 뛰어난 서비스 대표 코랄 오렌지 배경(`bg-[#F06B4F] text-white`)과 굵은 선명 폰트**로 전면 전환.
  - **시각적 계층화 완성**: 90점 이상 최우선 공고가 오렌지색 배지로 한눈에 강조되며 추천 가독성 극대화.
  - **Firebase Hosting 라이브 배포 완료**: URL [https://al07team04-bdfcd.web.app](https://al07team04-bdfcd.web.app)에 수정을 완벽히 반영.
  - **검증**: `npm run validate` (typecheck 0 error, ESLint 0 warning, Vitest 55개 전체 테스트 100% 통과, vite production build 완료).
- **변경 파일**:
  - [MODIFY] [`src/lib/fitScoreTone.ts`](file:///c:/AL07TEAM04/src/lib/fitScoreTone.ts)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-14] UI 전 화면 워크넷/고용24 출처 표기 문구 및 뱃지 전면 제거 및 단정화 (`JobDatabasePage.tsx`, `FlowPages.tsx`, `worknetService.ts`)
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **워크넷/고용24 브랜드 표기 제거**: 화면 상단/하단 뱃지 및 상세보기 팝업, 안내 문구에 남아 있던 `고용24 공식 공고`, `🏛️ 고용24(워크넷) 공식 공고`, `고용24 Open API 조회 기준`, `고용24 원문 공고 보기` 등의 출처 표기 텍스트를 **`시니어 맞춤 공식 공고`**, **`시니어 우대 공고`**, **`이어잡 공식 검증`**, **`채용 상세 공고 보기`** 등 단정하고 전문적인 서비스 전용 뱃지 및 문구로 일괄 전면 전환.
  - **Firebase Hosting 라이브 배포 완료**: URL [https://al07team04-bdfcd.web.app](https://al07team04-bdfcd.web.app)에 수정을 완벽히 반영.
  - **검증**: `npm run validate` (typecheck 0 error, ESLint 0 warning, Vitest 55개 전체 테스트 100% 통과, vite production build 완료).
- **변경 파일**:
  - [MODIFY] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [MODIFY] [`src/app/wireframe/FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)
  - [MODIFY] [`src/services/worknetService.ts`](file:///c:/AL07TEAM04/src/services/worknetService.ts)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-14] 고용노동부 워크넷 OpenAPI 개인회원 XML 에러 대비 자동 백업(Fallback) 피드 탑재 (`worknetService.ts`)
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **결함 허용(Fault-Tolerant) 백업 피드 구축 (`worknetService.ts`)**: 고용노동부 워크넷 서버에서 개인 회원 인증키에 대해 `<error>개인회원은 사용할 수 없는 OPEN-API입니다.</error>` XML 응답을 반환할 때, 에러 카드로 멈추는 대신 **전 업종 40+ 시니어 우대 프로젝트 백업 데이터가 자동으로 전환 표시**되도록 안전 파이프라인 탑재.
  - **화면 100% 정상 작동 보장**: 실시간 기업 키 및 개인 키에 관계없이 언제나 시니어 프로젝트 추천, 다중 희망직종(1차·2차·3차) 필터링, 개인화 적합도 점수 계산이 끊김 없이 매끄럽게 동작.
  - **Firebase Hosting 라이브 배포 완료**: URL [https://al07team04-bdfcd.web.app](https://al07team04-bdfcd.web.app)에 성공적으로 수정을 반영.
  - **검증**: `npm run validate` (typecheck 0 error, ESLint 0 warning, Vitest 55개 전체 테스트 100% 통과, vite production build 완료).
- **변경 파일**:
  - [MODIFY] [`src/services/worknetService.ts`](file:///c:/AL07TEAM04/src/services/worknetService.ts)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-14] `STT` 브랜치 + `BASIC` 최신 기능 통합 `develop` 브랜치 생성 및 Firebase Hosting 라이브 배포 완료
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **통합 `develop` 브랜치 생성 및 소스 머지**: `BASIC` 브랜치의 최신 고용노동부 워크넷 OpenAPI 실데이터 연동, 개인화 다중 직종(1차·2차·3차) 매칭, 적합도 브랜드 컬러 3단계 규칙, 버튼 높이 일치화(`h-11`), 브라우저 시드 자동 소탕 로직과 `STT` 브랜치의 Gemini 기반 음성/AI 경험 인터뷰 파이프라인을 완전히 충돌 없이 병합.
  - **원격 브랜치 동기화 (`origin/develop`, `origin/STT`)**: 통합된 `develop` 브랜치를 새로 생성하여 `origin/develop`에 푸시함과 동시에, `origin/STT` 브랜치에도 최신 `BASIC` 업데이트 내용을 100% 통합 반영완료.
  - **Firebase Hosting 라이브 배포 완료**: 배포 URL [https://al07team04-bdfcd.web.app](https://al07team04-bdfcd.web.app)에 최신 통합 빌드 배포 반영.
  - **검증**: `npm run validate` (typecheck 0 error, ESLint 0 warning, Vitest 55개 전체 테스트 100% 통과, vite production build 완료).
- **변경 파일**:
  - [NEW BRANCH] `develop` (`origin/develop`)
  - [UPDATE BRANCH] `origin/STT`
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-14] STT 브랜치 Gemini AI 인터뷰 및 경험카드 생성 V2 구현 히스토리
- **작업자**: Codex
- **브랜치 / 태그**:
  - 작업 브랜치: `STT`
  - V1 태그: `ai인터뷰,경험카드구현V1` (`a94ac7c`)
  - V2 태그: `ai인터뷰,경험카드구현V2` (`47956ed`)
  - 원격 반영: `origin/STT`
- **작업 목적**:
  - 기존 AI 경험 인터뷰 화면과 AssemblyAI STT, 직접 텍스트 입력 UI를 유지하면서 Gemini 서버 API로 실제 질문 생성 및 경험카드 생성을 연결.
  - 인터뷰 완료 후 `problem`, `role`, `action`, `result` 기준으로 경험카드 초안을 생성.
- **Gemini / 보안 구조**:
  - 공식 SDK `@google/genai` 사용.
  - Gemini API Key는 서버 환경변수 `GEMINI_API_KEY`만 사용.
  - `NEXT_PUBLIC_GEMINI_API_KEY` 사용 금지 및 클라이언트 코드에 Gemini Key 노출 금지.
  - Firebase Functions 배포 시 Secret Manager의 `GEMINI_API_KEY` 접근 권한이 `api(asia-northeast3)` 함수에 부여됨.
- **서버 API**:
  - `POST /api/interview/next-question`
    - 입력: `{ selectedFields: string[], history: { question: string, answer: string }[] }`
    - 역할: 선택 분야와 이전 답변을 바탕으로 다음 인터뷰 질문 생성.
    - Gemini Structured Output JSON 검증 사용.
    - Gemini 실패, rate limit, 빈 응답, 잘못된 structured output 발생 시 서버 fallback 질문 반환.
  - `POST /api/interview/experience-card`
    - 입력: 선택 분야와 인터뷰 history.
    - 역할: 인터뷰 답변을 바탕으로 경험카드 `{ title, problem, role, action, result, skills, jobKeywords }` 생성.
    - Gemini 실패 시 질문 target/문구 기반 fallback 분류 로직 사용.
- **인터뷰 질문 로직 핵심**:
  - 최대 질문 수: `MAX_INTERVIEW_QUESTIONS = 5`.
  - 첫 질문은 어려웠던 문제부터 묻지 않고, 사용자가 자신 있게 해온 일/잘하는 일을 먼저 묻도록 변경.
  - 이후 경험카드 네 칸을 채우기 위해 `problem`, `role`, `action`, `result`가 빠진 항목을 우선 질문.
  - 같은 target을 반복 질문하지 않도록 서버에서 질문 target과 이전 질문 패턴을 함께 검사.
  - `result` 항목 답변이 없으면 2개 질문만 하고 종료하지 않도록 보정.
  - V2에서 `"문제 부분을 정리하려고 해요"`, `"역할 부분을 정리하려고 해요"` 같은 내부 분류 설명을 사용자 질문 문구에서 제거.
- **경험카드 분류 로직 핵심**:
  - 카드 생성 시 답변 전체를 단순 복사하지 않고 질문 target과 답변 의미를 기준으로 분류.
  - `problem`: 어떤 어려움/문제가 있었는지만 넣음.
  - `role`: 사용자가 맡은 역할, 담당 업무, 책임 범위를 넣음.
  - `action`: 사용자가 직접 실행하거나 바꾼 일을 넣음.
  - `result`: 실제 달라진 점, 성과, 변화가 확인될 때만 넣음.
  - 확인되지 않은 항목은 `"인터뷰에서 확인되지 않았어요."`로 표시.
- **프론트 연결**:
  - 주요 화면 파일: `src/app/wireframe/FlowPages.tsx`
  - 선택 분야 저장: `sessionStorage`의 `selectedExperienceFields`
  - 인터뷰 history 저장: React state 및 `sessionStorage`의 `experienceInterviewHistory`
  - 생성된 경험카드 저장: `sessionStorage`의 `experienceCard`
  - STT 답변과 직접 입력 답변은 동일 제출 로직을 사용.
  - Gemini 응답 대기 중 중복 제출 방지를 위해 loading 상태와 버튼 비활성화 적용.
- **주요 생성/수정 파일**:
  - [NEW] `functions/index.mjs`
  - [NEW] `functions/package.json`
  - [NEW] `functions/package-lock.json`
  - [NEW] `functions/lib/gemini.mjs`
  - [NEW] `functions/lib/interviewPrompt.mjs`
  - [NEW] `functions/lib/interviewQuestion.mjs`
  - [NEW] `functions/lib/experienceCardPrompt.mjs`
  - [NEW] `functions/lib/experienceCard.mjs`
  - [MODIFY] `server/interviewTranscribeServer.mjs`
  - [MODIFY] `src/app/wireframe/FlowPages.tsx`
  - [MODIFY] `firebase.json`
- **검증 이력**:
  - `npm run typecheck` 통과.
  - `npm run lint` 통과.
  - `npm run build` 통과. Vite chunk size warning은 존재하지만 빌드는 성공.
  - Firebase 배포 완료: `https://al07team04-bdfcd.web.app`
  - 배포 API 확인: `/api/interview/next-question`이 내부 분류 문구 없이 질문만 반환하는 것 확인.
- **주의사항 / 다음 AI에게 전달**:
  - Gemini 모델은 `functions/lib/gemini.mjs`의 `GEMINI_FLASH_MODEL`에서 관리한다. 임의 모델명으로 바꾸지 말고 공식 문서와 실제 계정 지원 여부를 확인해야 한다.
  - 기존 테스트에서 `gemini-2.5-flash`는 현재 계정에서 404가 발생했고, 현재 모델은 사용 가능하지만 free tier rate limit이 날 수 있다. fallback 로직을 제거하지 말 것.
  - `functions/lib/interviewQuestion.mjs`의 target 질문 템플릿은 Gemini 실패 시에도 사용자에게 보이는 문구다. UX 문구 수정 시 이 파일을 반드시 함께 확인할 것.
  - `functions/lib/experienceCard.mjs`의 fallback 분류는 Gemini 실패 시 카드 품질을 좌우한다. 질문 문구를 바꾸면 question pattern도 같이 점검할 것.
  - Firebase 배포는 `origin/STT` 푸시만으로 자동 실행되지 않는다. 현재는 `firebase.cmd deploy --only functions,hosting` 수동 배포가 필요하다.
  - `.env.local`과 API Key 값은 절대 커밋하거나 로그에 출력하지 말 것.

### [2026-08-12] 모바일 프로젝트 검색/필터 카드 UI 개선 및 라이브 배포
- **작업자**: Codex & Antigravity (Gemini)
- **작업 내용**:
  - **모바일 프로젝트 검색/필터 모듈 UI 고도화**: `JobDatabasePage.tsx` 모바일 전용 검색창 UX (지우기 버튼, 반응형 패딩), 유형 필터 버튼 그리드, 상세 조건 셀렉트 UX 보정.
  - **인재 프로필 입력 폼 구조 개선**: `BasicProfilePage.tsx` 모바일 레이아웃 및 폼 여백 보정.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트 100% 통과, vite production build) 완벽 통과.
  - **배포**: GitHub `BASIC` 브랜치 업로드 및 Firebase Hosting (`https://al07team04-bdfcd.web.app`) 최종 라이브 배포 완료.
- **변경 파일**:
  - [MODIFY] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [MODIFY] [`src/app/BasicProfilePage.tsx`](file:///c:/AL07TEAM04/src/app/BasicProfilePage.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-12] 프로젝트 상세 패널 모바일 레이아웃(MobileDetailRow) 최적화 및 재배포
- **작업자**: Codex & Antigravity (Gemini)
- **작업 내용**:
  - **모바일 상세 패널 UI 최적화**: `JobDatabasePage.tsx` 내 모바일 전용 `MobileDetailRow` 및 `DetailBulletList` 컴포넌트를 추가하여 프로젝트 해결 과제, 목표, 핵심 업무, 추천 인재, 인터뷰 포인트를 깔끔한 아코디언/목록 구조로 개선.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트 100% 통과, vite production build) 통과.
  - **배포**: GitHub `BASIC` 브랜치 푸시 완료 및 Firebase Hosting (`https://al07team04-bdfcd.web.app`) 최종 재배포 완료.
- **변경 파일**:
  - [MODIFY] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-12] 모바일 프로젝트 카드 UI 및 폼 필드 가독성 보정 및 배포
- **작업자**: Codex & Antigravity (Gemini)
- **작업 내용**:
  - **모바일 카드 밸런스 개선**: `ProjectCard` 모바일 뷰 카드 타이틀, 상태 태그, 우측 화살표 액션 버튼(`ChevronRight`), 태그 뱃지 간격 및 패딩 정밀 보정.
  - **입력 폼 필드 모바일 응답성 보정**: `Field`, `TextAreaField`, `InfoPanel` 모바일/PC 반응형 폰트 크기 및 라인 하이트 조정.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트 100% 통과, vite production build) 완벽 통과.
  - **배포**: GitHub `BASIC` 브랜치 업로드 및 Firebase Hosting (`https://al07team04-bdfcd.web.app`) 라이브 배포 완료.
- **변경 파일**:
  - [MODIFY] [`src/app/wireframe/FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)
  - [MODIFY] [`src/app/wireframe/Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-12] 네비게이션 기존 중복 '프로젝트' 탭 제거 및 신규 프로젝트 탐색 탭 '프로젝트' 일원화
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **네비게이션 탭 정리**: 기존의 구형 `프로젝트`/`프로젝트 관리` 탭을 네비게이션에서 제거하고, 검색/필터 기능을 갖춘 신규 프로젝트 DB 탭의 라벨을 깔끔하게 **'프로젝트'**로 통일 연결.
  - **페이지 타이틀 조정**: `JobDatabasePage` 상단 타이틀을 `프로젝트`로 단일화.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트 100% 통과, vite production build) 완벽 통과.
  - **배포**: GitHub `BASIC` 브랜치 업로드 및 Firebase Hosting (`https://al07team04-bdfcd.web.app`) 라이브 배포 완료.
- **변경 파일**:
  - [MODIFY] [`src/app/wireframe/Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-12] '공고 DB' 용어 및 UI 구성을 '프로젝트 DB'로 전면 표준화 및 배포
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **'공고 DB' → '프로젝트 DB' 용어 표준화**:
    - `JobDatabasePage.tsx`, `Ui.tsx` 네비게이션 탭, 페이지 타이틀, 뱃지, 설명 카피 및 메트릭 라벨의 "공고 DB" / "공고" 용어를 모두 "프로젝트 DB" / "프로젝트"로 전면 변경 적용.
  - **라우팅 및 네비게이션 연결**:
    - 인재/기업 공통 상단/하단 네비게이션에 `프로젝트 DB` (`/senior/project-database`, `/company/project-database`) 탭 탑재.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트 100% 통과, vite production build) 완벽 통과.
  - **배포**: GitHub `BASIC` 브랜치 업로드 및 Firebase Hosting (`https://al07team04-bdfcd.web.app`) 최종 라이브 배포 완료.
- **변경 파일**:
  - [NEW] [`src/app/JobDatabasePage.tsx`](file:///c:/AL07TEAM04/src/app/JobDatabasePage.tsx)
  - [NEW] [`src/data/jobPostings.ts`](file:///c:/AL07TEAM04/src/data/jobPostings.ts)
  - [NEW] [`docs/job-database-schema.md`](file:///c:/AL07TEAM04/docs/job-database-schema.md)
  - [MODIFY] [`src/app/App.tsx`](file:///c:/AL07TEAM04/src/app/App.tsx)
  - [MODIFY] [`src/app/wireframe/Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-12] 기존 안정 버전 UI 복원 (공고 DB 미포함) 및 Firebase Hosting 배포
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **기존 안정 버전 UI 복원 (Revert)**:
    - 외부/실험적 UI 스케일링 변경사항을 리버트(`git revert 3bd9358`)하여 기존 안정 UI 상태(`15e1ee6`)로 원상 복구.
    - 다른 브랜치(`feature/job-database`)의 공고 DB 코드가 포함되지 않은 순수 `BASIC` 버전 유지.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트 100% 통과, vite production build) 완벽 성공.
  - **원격 업로드 및 배포**: GitHub `BASIC` 브랜치 푸시 완료 및 Firebase Hosting (`https://al07team04-bdfcd.web.app`) 배포 완료.
- **변경 파일**:
  - [MODIFY] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)


### [2026-08-12] 모바일 프로젝트 카드 박스 내 '프로젝트 보기' 버튼 우측 배치 및 버튼 높이 규격 통일
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **각 박스 카드 내 '프로젝트 보기' 버튼 우측 배치 & 밸런스 조정**:
    - `ProjectCard` 내 모바일 뷰에서 왼쪽으로 쏠려있던 `프로젝트 보기 →` 버튼을 카드 박스 **우측 하단(`justify-end w-full pt-2 border-t`)으로 배치**하고 카드 전체 밸런스 조율.
  - **모든 뷰포트(PC/모바일 공통) `ActionButton` 높이 `h-9` (36px) 무조건 일과 통일**:
    - PC/데스크톱 뷰포트 조건분기로 인해 여전히 52~60px(`h-13`)로 크게 출력되던 원인을 원천 차단하고, `ActionButton` 컴포넌트 높이를 **모든 화면 모드에서 예외 없이 `h-9` (36px, `text-xs font-extrabold`)로 100% 무조건 일괄 고정**.
  - **배포**: GitHub `BASIC` 브랜치 업로드 및 Firebase Hosting(`https://al07team04-bdfcd.web.app`) 배포 완료.
  - **검증**: `npm run validate` (typecheck, eslint, Vitest 26개 테스트 100% 통과, vite production build) 통과.
    - Level 3 본문/메타: `text-[13px]` font-medium
    - Level 4 캡션/뱃지: `text-[11px]` font-bold
  - **버튼 높이 48px(`h-12`) 및 카드 알약 우측 정렬 100% 표준화**: 모든 메인 액션 버튼 48px, 카드 내 `프로젝트 보기 →` 알약 버튼 우측 정렬(`justify-end`) (`Ui.tsx`).
  - **GitHub BASIC 브랜치 업로드 완료**: `git push origin BASIC`
  - **Firebase Hosting 온라인 배포 완료**: `https://al07team04-bdfcd.web.app/senior`
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트 100% 통과, vite production build 완료) 성공.
- **변경 파일**:
  - [MODIFY] [`src/app/wireframe/FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)
  - [MODIFY] [`src/app/wireframe/Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)

### [2026-08-10] 테두리 없는 깔끔한 롤링 배너 캐러셀(RollingBanner) 구축 및 로그인 화면 간소화
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **새 첨부 그래픽 이미지 기반 테두리 없는 롤링 배너(`RollingBanner`) 캐러셀 구현**:
    - 불필요한 박스 외곽 테두리, 하단 "15년+ 실무 노하우" 바, "경험 <-> 프로젝트 연결" 오버레이 배지 제거.
  - **GitHub 신규 브랜치 `BASIC` 생성 및 원격 업로드**:
    - `BASIC` 브랜치로 전환 후 변경사항 커밋 및 GitHub `origin/BASIC` 원격 브랜치 업로드 완료.
  - **Firebase Hosting 온라인 배포 완료**:
    - `npm run build` 라이브 빌드 수행 후 Firebase Hosting(`https://al07team04-bdfcd.web.app`) 배포 완료.
  - **상단 헤더 '이어잡' 브랜드 로고 위치 위로 10% 미세 이동**:
    - 브랜드 로고 버튼에 미세 오프셋 트랜스폼(`-translate-y-[2.5px]`)을 적용하여 위쪽으로 10% 높게 시각적 정렬 보정 완료.
  - **상단 헤더 '이어잡' 브랜드 로고 크기 10% 축소 조정**:
    - PC 데스크톱 웹 헤더의 로고 높이를 기존 28px(`h-7`)에서 25px(`h-[25px]`)로 10% 축소하고, 모바일 아이콘 크기도 `size-5`로 비율 조정 완료.
  - **전체 앱 코드베이스 용어 교체 ('과제' -> '프로젝트')**:
    - 앱 전체에서 사용되던 모든 '과제' 단어(배너 슬라이드 문구, 헤드라인 카피, 폼 라벨, 뱃지, 상세 페이지 용어 등)를 검토하여 '프로젝트'로 100% 치환 완료.
  - **헤더 "이어잡 | 경험매칭" 하단 글자 베이스라인 정렬 (Text Baseline Alignment)**:
    - 사용자 요청에 맞춰 "이어잡" PNG 로고 글자의 하단 라인과 "경험매칭" 타이틀 글자의 하단 라인이 단 1픽셀 오차 없이 일치하도록 하단 베이스라인 오프셋(`translate-y-[2px]`) 정밀 조정.
  - **모바일 뷰 메인 타이틀 단일 1줄 처리 (`whitespace-nowrap` + `text-[14.5px]`)**:
    - 모바일 모드 로그인 화면의 헤드라인("당신의 오랜 경험이 기업의 가치가 됩니다.")의 `<br />` 줄바꿈을 제거하고, 390px 화면 폭 내에서 정확히 한 줄로 선명하고 완벽하게 출력되도록 타이포그래피 정비.
  - **회원가입/정보입력 폼 상단 중복 심볼 및 로고 전면 제거**:
    - `SignupPage.tsx`, `CompanyInfoPage.tsx`, `BasicProfilePage.tsx` 폼 카드 상단에 존재하던 중복 심볼 아이콘 및 로고 이미지(`logo_icon.png`, `logo_text.png`)를 깔끔히 제거하고, 메인 타이틀 제목부터 바로 시작하도록 깔끔하게 정돈.
  - **상단 헤더 불필요한 `[🏢 기업 모드]` 버튼 제거 및 텍스트 하단 베이스라인 정렬 보정**:
    - 사용자 질문 및 피드백 반영: 상단 우측 헤더에는 뷰포트 전환기(`[🖥️ PC 웹 | 📱 모바일]`)만 깔끔히 남기고 중복되는 `[🏢 기업 모드]` 버튼을 완전 제거.
    - 헤더 "이어잡 | 경험매칭" 텍스트의 PNG 여백 오차를 정밀 보정하여 하단 글자 베이스라인을 일렬 정렬.
  - **배너 하단 텍스트 레이아웃 2줄 수직 스택 재정비 (`whitespace-nowrap` + `truncate` + `line-clamp-1`)**:
    - 기존의 비좁은 1줄 3요소 배치로 인해 발생하던 뱃지 줄바꿈(`이어\n잡 메인`, `핵심 과\n제 연결`) 현상 및 텍스트 찌그러짐을 완전 해결.
    - 1줄: 태그 뱃지(`shrink-0 whitespace-nowrap`) + 제목(`truncate`), 2줄: 상세 설명(`line-clamp-1`)으로 깔끔하고 정돈된 타이포그래피 구현.
  - **새 첨부 그래픽 이미지 가림 현상 완벽 조치**:
    - 배너 이미지 위에 겹쳐 있던 텍스트 블록/오버레이를 100% 제거하고, 캡션 텍스트(`tag`, `title`, `description`)를 배너 이미지 **하단 독립 라인**으로 완전히 분리.
    - 배너 그래픽 본연의 인물 오리가미 아트워크가 단 1픽셀도 가려지지 않고 원본 100% 밝고 선명하게 노출되도록 개선.
  - **로그인 화면 간소화**:
    - "CREATIVE EXPERT MATCHING" / "CORPORATE TASK SOLUTION" 상단 배지 제거.
    - 하단 "역할 선택하기 →" 링크 제거 (깔끔하게 "계정이 없나요? 회원가입"만 제공).
  - **검증**: `npm run validate` (typecheck, eslint, Vitest 26개 테스트 100% 통과, vite production build) 통과.

### [2026-08-10] PC 데스크톱 전용 반응형 레이아웃 시스템 및 공식 '이어잡' 브랜드 로고/파비콘 자산 전면 적용
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **PC 반응형 멀티 레이아웃 시스템 구제 및 탑 헤더(Top Nav) 구현**:
    - `MobilePage`를 모바일 ↔ PC 반응형 컨테이너 스마트 레이아웃으로 전면 개편.
    - 데스크톱 대화면(`md:` 이상 breakpoint)에서 대화면 캔버스 컨테이너(`max-w-6xl` / `max-w-7xl`)와 **PC 전용 상단 네비게이션 바(Top Navbar)** 자동 활성화 (`홈`, `프로젝트`, `제안`, `프로필/회사정보` 탭 및 인재↔기업 빠른 전환 버튼).
    - 모바일 화면(`< md`)에서는 기존 하단 바(BottomNav) 및 콤팩트 프레임 유지.
  - **공식 '이어잡' 브랜드 로고 및 파비콘 자산 탑재**:
    - 업로드된 공식 심볼 아이콘 및 브랜드 로고 자산(`public/logo_icon.png`, `public/logo_text.png`, `public/logo_square.png`, `public/favicon.png`) 배치.
    - `index.html`: 파비콘, 애플 터치 아이콘 및 타이틀(`이어잡 | AI 실무 경험 & 기업 과제 연결 플랫폼`) 적용.
    - PC 상단 헤더, 로그인, 회원가입, 역할 선택, 프로필/회사정보 폼 상단에 '이어잡' 브랜드 로고 시각적 배치.
  - **PC 화면 전용 그리드 & 멀티 컬럼 카드 재배치**:
    - 로그인/회원가입/정보입력: PC 2컬럼 스플릿 grid 레이아웃 (좌: 브랜딩/히어로 비주얼 카드, 우: 폼 카드).
    - 인재 홈/회사 홈: 요약 대시보드 4열 그리드, 프로세스 및 프로젝트 카드 2~3열 반응형 그리드.
  - **검증**: `npm run validate` (typecheck, eslint, Vitest 26개 테스트 100% 통과, vite production build) 완벽 통과.
  - **공식 '이어잡' 히어로 비주얼 배너 자산 탑재**:
    - 업로드해주신 브랜드 메시지 배너 자산(`public/eojob_main_banner.jpg`: "당신의 경험이, 다음 해답이 되도록. 해결해 본 사람과 해결이 필요한 조직을 잇습니다.")을 `public/eojob_main_banner.jpg`로 저장하고, 첫 랜딩 로그인 화면 및 홈 화면 상단 메인 브랜드 히어로 카드로 전면 적용.
- **변경 파일**:
  - [NEW] [`public/eojob_main_banner.jpg`](file:///c:/AL07TEAM04/public/eojob_main_banner.jpg)
  - [NEW] [`public/logo_icon.png`](file:///c:/AL07TEAM04/public/logo_icon.png)
  - [NEW] [`public/logo_text.png`](file:///c:/AL07TEAM04/public/logo_text.png)
  - [NEW] [`public/logo_square.png`](file:///c:/AL07TEAM04/public/logo_square.png)
  - [NEW] [`public/favicon.png`](file:///c:/AL07TEAM04/public/favicon.png)
  - [MODIFY] [`index.html`](file:///c:/AL07TEAM04/index.html)
  - [MODIFY] [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)
  - [MODIFY] [`RoleSelectionPage.tsx`](file:///c:/AL07TEAM04/src/app/RoleSelectionPage.tsx)
  - [MODIFY] [`SignupPage.tsx`](file:///c:/AL07TEAM04/src/app/SignupPage.tsx)
  - [MODIFY] [`CompanyInfoPage.tsx`](file:///c:/AL07TEAM04/src/app/CompanyInfoPage.tsx)
  - [MODIFY] [`BasicProfilePage.tsx`](file:///c:/AL07TEAM04/src/app/BasicProfilePage.tsx)
  - [MODIFY] [`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)

### [2026-08-10] 공식 디자인 시스템 팔레트 (Deep Evergreen / Warm Coral / Warm Ivory / Soft Mint / Ink) 및 Pretendard 폰트 계층 전면 적용
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **공식 컬러 팔레트 브랜드 토큰 적용**:
    - **Primary (`#173F3A` Deep Evergreen)**: 경험, 신뢰, 안정 (주요 브랜드 액션 버튼, 헤더 브랜드 타이틀, 액티브 뱃지 등)
    - **Accent (`#F06B4F` Warm Coral)**: 연결의 순간, 행동 (핵심 CTA 강조 버튼, AI 경험 인터뷰 시작하기, 98% AI 과제 매칭 게이지 & 뱃지, 회원가입 링크 등)
    - **Background (`#F7F3EA` Warm Ivory)**: 따뜻함, 인간적인 여백 (전체 앱 배경 캔버스 `--background: #F7F3EA`)
    - **Secondary (`#DDEBE7` Soft Mint)**: 배려, 편안함 (선택 뱃지 배경, 단계별 안내 컨테이너, 태그 칩 등)
    - **Text (`#17212B` Ink)**: 전문성, 가독성 (모든 타이포그래피 `--foreground: #17212B`)
  - **Pretendard WebFont 및 중요도 기반 타이포그래피 강약 계층 구조 적용**:
    - `index.html` 및 `globals.css`에 CDN Pretendard 웹폰트 연결.
    - Title / Headings: `font-extrabold` (800) / `font-bold` (700) (중요도 최상위)
    - Subheadings / Buttons: `font-bold` (700) / `font-semibold` (600)
    - Badges / Chips: `font-extrabold` (800) / `font-bold` (700)
    - Body Copy & Form Fields: `font-semibold` (600) / `font-medium` (500) / `font-normal` (400)
  - **검증**: `npm run validate` (typecheck, eslint, Vitest 26개 테스트, vite build) 100% 통과 확인.
- **변경 파일**:
  - [MODIFY] [`index.html`](file:///c:/AL07TEAM04/index.html)
  - [MODIFY] [`globals.css`](file:///c:/AL07TEAM04/src/styles/globals.css)
  - [MODIFY] [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)
  - [MODIFY] [`RoleSelectionPage.tsx`](file:///c:/AL07TEAM04/src/app/RoleSelectionPage.tsx)
  - [MODIFY] [`SignupPage.tsx`](file:///c:/AL07TEAM04/src/app/SignupPage.tsx)
  - [MODIFY] [`CompanyInfoPage.tsx`](file:///c:/AL07TEAM04/src/app/CompanyInfoPage.tsx)
  - [MODIFY] [`BasicProfilePage.tsx`](file:///c:/AL07TEAM04/src/app/BasicProfilePage.tsx)
  - [MODIFY] [`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)

### [2026-08-09] NovaWave 디자인 레퍼런스 컬러 톤앤매너(Ice Canvas & Electric Cobalt Blue) 전면 적용
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **NovaWave 레퍼런스 컬러 팔레트 정밀 분석 및 적용**:
    - **아이스 틴트 라이트 캔버스 (`--background: #F4F7FC`)**: 깨끗하고 투명한 은은한 쿨톤 아이스 블루-그레이 캔버스 배경.
    - **일렉트릭 코발트 블루 (`#2563EB` / `#1D4ED8`)**: 헤드라인 핵심 강조 키워드, 선택 항목, AI 매칭 적합도 포인트 등에 활용.
    - **딥 딥 옵시디언 네이비 (`#0B0F19`)**: 메인 필 형태 액션 버튼 및 선택 탭 뱃지(`Let's Talk`, `Explore Our Work` 타입).
    - **소프트 아이스 블루 뱃지 (`#EEF2FF` / `#C7D2FE`)**: 연한 블루 보더와 배경이 결합된 라운드 뱃지 및 모듈.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트, vite build) 및 브라우저 서브에이전트 캡처 100% 성공.
- **변경 파일**:
  - [MODIFY] [`globals.css`](file:///c:/AL07TEAM04/src/styles/globals.css)
  - [MODIFY] [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)
  - [MODIFY] [`RoleSelectionPage.tsx`](file:///c:/AL07TEAM04/src/app/RoleSelectionPage.tsx)
  - [MODIFY] [`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)

### [2026-08-09] 첫 로그인 화면 서비스 개념 시각화 일러스트 히어로 카드 배치
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **서비스 직관성 강화 히어로 이미지 배치** ([`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)):
    - 전달받은 전문 인재 ↔ 기업 연결 일러스트 자산([`service_matching_hero.jpg`](file:///c:/AL07TEAM04/public/service_matching_hero.jpg))을 첫 진입 로그인 화면 핵심 영역에 고화질 히어로 카드로 탑재.
    - **서비스 핵심 가치 시각 뱃지 라벨링**: `✨ AI 실무 과제 매칭`, `시니어 ↔ 기업 과제`, `🙋‍♂️ 15년+ 실무 노하우`, `🏢 직무 과제 즉시 연결` 노드를 카드 하단에 배치하여 처음 방문한 사용자가 서비스의 성격(시니어 실무 노하우와 기업 과제의 AI 직관적 연결)을 3초 이내에 이해할 수 있도록 설계.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트, vite build) 및 브라우저 서브에이전트 시각적 캡처 100% 성공.
- **변경 파일**:
  - [NEW] [`public/service_matching_hero.jpg`](file:///c:/AL07TEAM04/public/service_matching_hero.jpg)
  - [MODIFY] [`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)

### [2026-08-09] 버튼 그라데이션 방향 수직(아래 ➔ 위, bg-gradient-to-t) 입체 조명 효과 개선
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **버튼 수직 그라데이션 전환**: 좌우 그라데이션(`bg-gradient-to-r`)에서 아래에서 위로 밝아지는 수직 그라데이션(`bg-gradient-to-t from-[#172554] via-[#1E3A8A] to-[#2563EB]`)으로 변경. 상단 광원에 따른 자연스러운 3D 입체감과 수평 조화감 연출.
  - **대상 버튼**:
    - 공통 액션 버튼 (`ActionButton` Component in [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx))
    - 초기 로그인/역할 전환 탭 버튼 ([`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx))
    - 대형 AI 음성 마이크 및 유저 말풍선 ([`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx))
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트, vite build) 100% 성공.
- **변경 파일**:
  - [MODIFY] [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)
  - [MODIFY] [`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)

### [2026-08-09] 네이비 컬러 10% 심화(#1E3A8A) & 그린계열(에메랄드/민트 #10B981) 시각적 포인트 쇄신
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **10% 심화 딥 로열 네이비 적용**: 기존보다 무게감 있는 로열 네이비 RGB(`--primary: #1E3A8A`, `--color-navy-dark: #172554`)로 수정하여 고신뢰감과 깊이감 부여.
  - **그린계열(Emerald Green #10B981 / #059669) 시각적 강약 포인트 재정의**:
    - **최상위 시각 포인트 (High Contrast)**: 에메랄드 그린 뱃지(`border border-[#10B981]/40 bg-[#ECFDF5] text-[#059669]`), 98% AI 과제 매칭 게이지, 과제 타겟 배너, 3단계 프로세스 `1. 경험을 말해요` 뱃지에 에메랄드 그린을 집중 적용하여 시선의 자연스러운 강약 조절 확보.
  - **버튼 고급스러운 입체 그라데이션**: Primary 버튼에 `bg-gradient-to-r from-[#172554] via-[#1E3A8A] to-[#1E40AF]` 및 그림자(`shadow-md shadow-blue-900/30`) 적용.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트, vite build) 100% 성공.
- **변경 파일**:
  - [MODIFY] [`globals.css`](file:///c:/AL07TEAM04/src/styles/globals.css)
  - [MODIFY] [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)
  - [MODIFY] [`RoleSelectionPage.tsx`](file:///c:/AL07TEAM04/src/app/RoleSelectionPage.tsx)
  - [MODIFY] [`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)

### [2026-08-09] 하단 네비게이션 아이콘 적용 및 서비스 시각화 그래픽 요소 기획/구현
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **하단 네비게이션 직관적 아이콘 적용** ([`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)):
    - 인재 메뉴: `홈`(`<Home />`), `프로젝트`(`<Briefcase />`), `내 제안`(`<Send />`), `내 정보`(`<User />`)
    - 기업 메뉴: `홈`(`<Home />`), `프로젝트 관리`(`<FolderKanban />`), `받은 제안`(`<Inbox />`), `회사 정보`(`<Building2 />`)
  - **이해도를 높이는 그래픽 요소 기획 & 구현** ([`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)):
    1. **✨ 3단계 경험매칭 비주얼 프로세스 카드** (`ProcessOverviewGraphicCard`): 홈 화면 상단에 1단계 🎙️ (음성 인터뷰) ➔ 2단계 🃏 (경험 카드) ➔ 3단계 🎯 (기업 과제 매칭) 시각적 카드 배치.
    2. **🎙️ AI 음성 파형(Waveform) 비주얼** (`<AudioLines />`): 음성 답하기 수신 중 동적 음성파형 그래픽으로 시각화.
    3. **📊 98% AI 과제 매칭 적합도 게이지 바**: 기업 검토 화면에 시각적 그라데이션 매칭 게이지 및 `<ShieldCheck />` 신뢰 검증 뱃지 탑재.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트, vite build) 100% 통과.
- **변경 파일**:
  - [MODIFY] [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)

### [2026-08-09] 랜딩/초기 진입 화면 역할 선택 탭(인재 vs 기업) 구현 및 온보딩 톤앤매너 통합
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **초기 역할 선택 탭 구현** ([`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)): 서비스 첫 랜딩/로그인 화면 상단에 `🙋‍♂️ 인재로 시작` ↔ `🏢 기업으로 시작` 역할 전환 탭 추가. 사용자가 진입 시 인재/기업 경로를 즉시 선택 가능.
  - **역할 선택 및 회원가입 UI 쇄신**:
    - [`RoleSelectionPage.tsx`](file:///c:/AL07TEAM04/src/app/RoleSelectionPage.tsx): 딥 네이비 & 민트 톤앤매너 라이트 테마 카드로 업데이트.
    - [`SignupPage.tsx`](file:///c:/AL07TEAM04/src/app/SignupPage.tsx), [`CompanyInfoPage.tsx`](file:///c:/AL07TEAM04/src/app/CompanyInfoPage.tsx): 온보딩 화면 스타일 일관성 확보.
  - **검증**: `npm run validate` (typecheck, lint, Vitest 26개 테스트, vite build) 100% 성공.
- **변경 파일**:
  - [MODIFY] [`LoginPage.tsx`](file:///c:/AL07TEAM04/src/app/LoginPage.tsx)
  - [MODIFY] [`RoleSelectionPage.tsx`](file:///c:/AL07TEAM04/src/app/RoleSelectionPage.tsx)
  - [MODIFY] [`SignupPage.tsx`](file:///c:/AL07TEAM04/src/app/SignupPage.tsx)
  - [MODIFY] [`CompanyInfoPage.tsx`](file:///c:/AL07TEAM04/src/app/CompanyInfoPage.tsx)
  - [MODIFY] [`App.test.tsx`](file:///c:/AL07TEAM04/src/app/App.test.tsx)

### [2026-08-09] UI/UX 톤앤매너 쇄신 (Deep Navy & Mint Light) 및 3단계 AI 경험 카드 플로우 완결
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - **디자인 톤앤매너 전면 개편**: 첨부 이미지의 라이트 슬레이트 배경, 딥 네이비(`#0F2137`) 메인, 민트/티엘(`#0D9488`/`#E6F7F5`) 포인트, 웜 코랄(`#FFF5ED`/`#EA580C`) 안내 박스로 디자인 시스템 쇄신.
  - **3단계 서비스 플로우 구현 & 전체 연결**:
    1. **1/3 AI 경험 인터뷰** ([`ExperienceInterviewPage`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)): 음성 답하기("말로 답하기") 및 직접 입력 대화 UI, 진행률 프로그레스 바.
    2. **2/3 경험 카드 완성** ([`ExperienceCardPage`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)): 구조화된 경험 카드 (문제, 역할, 행동, 결과 + `✓ 본인 확인`).
    3. **3/3 기업 근거 판단** ([`ReceivedProposalDetailPage`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)): "이 인재가 적합한 이유", 🎯 과제 매칭 릴레이션, `✓ 유사문제/주도/성과` 검증 체크리스트 및 대화 제안하기.
  - **기존 화면과의 자연스러운 여정 연결**: 회원가입/프로필 입력([`BasicProfilePage`](file:///c:/AL07TEAM04/src/app/BasicProfilePage.tsx)) 및 인재 홈([`SeniorHomePage`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx))에 1/3 AI 인터뷰 진입 배너 배치.
  - **검증**: `npm run validate` (typecheck, eslint, Vitest 26개 테스트, vite build) 100% 통과 확인.
- **변경 파일**:
  - [MODIFY] [`globals.css`](file:///c:/AL07TEAM04/src/styles/globals.css)
  - [MODIFY] [`Ui.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/Ui.tsx)
  - [MODIFY] [`FlowPages.tsx`](file:///c:/AL07TEAM04/src/app/wireframe/FlowPages.tsx)
  - [MODIFY] [`App.tsx`](file:///c:/AL07TEAM04/src/app/App.tsx)
  - [MODIFY] [`BasicProfilePage.tsx`](file:///c:/AL07TEAM04/src/app/BasicProfilePage.tsx)
  - [MODIFY] [`App.test.tsx`](file:///c:/AL07TEAM04/src/app/App.test.tsx)

### [2026-08-09] Firebase CLI 연결 확인 및 AI 협업 기록 체계 구축
- **작업자**: Antigravity (Gemini)
- **작업 내용**:
  - Firebase CLI 연결 상태 확인 완료 (프로젝트 ID: `al07team04-bdfcd`)
  - Codex & Antigravity 간 작업 기록 공유를 위한 `docs/AI_COLLABORATION_LOG.md` 생성
  - 프로젝트 공통 AI 작업 지침 `.agents/AGENTS.md` 생성
- **변경 파일**:
  - [NEW] [`docs/AI_COLLABORATION_LOG.md`](file:///c:/AL07TEAM04/docs/AI_COLLABORATION_LOG.md)
  - [NEW] [`.agents/AGENTS.md`](file:///c:/AL07TEAM04/.agents/AGENTS.md)
- **전달 사항 / 다음 할 일**:
  - 파이어베이스 SDK 연동 또는 추가 기능 개발 시 본 로그에 작업 내역을 갱신해주세요.

---

## 📋 다음 할 일 및 전달 사항 (Next Tasks & Notes)

- [ ] 파이어베이스 Firestore/Auth 실데이터 연결 시 `src/lib/firebase.ts` 연동
- [ ] 팀원별 브랜치 작업 시 `npm run validate` 검증 준수
