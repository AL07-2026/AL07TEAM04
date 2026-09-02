# Workspace AI Instructions & ECC Harness (Codex & Antigravity)

이 프로젝트는 **Everything Claude Code (ECC)** 엔지니어링 하네스 및 멀티 AI 협업 프로토콜을 따릅니다.
모든 AI 어시스턴트(Codex, Antigravity)는 아래 표준과 워크플로우를 반드시 준수해야 합니다.

---

## 1. AI Collaboration Protocol (협업 규칙)
1. **작업 시작 전**:
   - `docs/AI_COLLABORATION_LOG.md`를 먼저 읽고 최근 변경 사항, 설계 결정, 다음 할 일/전달 사항을 확인합니다.
2. **작업 완료 후**:
   - `docs/AI_COLLABORATION_LOG.md` 상단에 작업 날짜, 작업자, 수정한 파일 목록, 주요 변경 내용, 다음 전달 사항을 명시합니다.
3. **무결점 검증 필수**:
   - 코드 변경 후 항상 `npm run validate` (typecheck, lint, test, build)를 수행하여 빌드 파이프라인을 100% 통과시킵니다.

---

## 2. ECC Harness Rules & Architecture
`.agents/rules/` 디렉터리에 정의된 상시 규칙을 엄격히 적용합니다:
- **`01-code-quality.md`**: 엄격한 TypeScript(No `any`), 불변성, 조기 반환, 명시적 반환 타입.
- **`02-architecture-patterns.md`**: 3계층 관심사 분리(UI Presentation ➔ Hooks ➔ Services/Data).
- **`03-tdd-testing-standards.md`**: Vitest 기반 TDD 원칙, 격리된 모킹, 엣지 케이스 및 회귀 방지.
- **`04-security-data-integrity.md`**: Firebase Auth/Firestore 보안, 시크릿 하드코딩 금지, 입력값 검증.
- **`05-frontend-performance-a11y.md`**: 시니어 타깃 고가독성/접근성(WCAG), 터치 타깃 확보, 렌더링 최적화.
- **`06-verification-and-collaboration.md`**: 무결점 빌드 파이프라인(`npm run validate`) 및 원자적 커밋.

---

## 3. Specialized Skills (.agents/skills/)
상황에 맞추어 전문 스킬을 능동적으로 활용합니다:
- **`ecc-system-architect`**: 신규 기능 설계, 아키텍처 영향도 분석, 데이터 모델링
- **`ecc-code-reviewer`**: 안티패턴 탐지, 타입 안전성, 보안/성능/엣지케이스 정밀 검토
- **`ecc-tdd-workflow`**: 단위 테스트 우선 설계 및 Vitest 테스트 케이스 구현
- **`ecc-build-debugger`**: TS/Vite/ESLint/Vitest/Firebase 오류 신속 격리 및 근본 원인 해결
- **`context7`**: 최신 라이브러리(React 19, Tailwind v4, Vite 8, Firebase 12 등) 공식 문서/API 실시간 조회 및 환각 방지
- **`task-observer`**: 세션 관찰을 통한 반복 패턴 감지, 피드백 학습 및 스킬 자가 개선
- **`design-taste` & `awesome-design`**: 모던하고 세련된 UI/UX 디자인 시스템 준수
- **`web-design-guidelines`**: 웹 표준 및 인터페이스 가이드라인 준수

---

## 4. Standard Development Lifecycle
모든 작업은 아래 5단계 생명주기를 따릅니다:
1. **[Plan & Analyze]**: 요구사항 및 영향도 분석 (`ecc-system-architect`)
2. **[Test & Implement]**: 테스트 설계 및 클린 코드 작성 (`ecc-tdd-workflow`, `01-code-quality`)
3. **[Review & Polish]**: 코드 리뷰 및 스타일/접근성 점검 (`ecc-code-reviewer`, `design-taste`)
4. **[Validate]**: `npm run validate` 전체 파이프라인 무결점 통과 확인
5. **[Document]**: `docs/AI_COLLABORATION_LOG.md`에 변경 사항 및 다음 작업자 전달 사항 기록
