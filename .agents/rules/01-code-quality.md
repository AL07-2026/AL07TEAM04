# ECC Rule: Code Quality & Strict TypeScript

## 1. TypeScript Strictness
- **No `any`**: 절대 `any` 타입을 사용하지 않습니다. 타입을 알 수 없는 경우 `unknown`을 사용하고 타입 가드(Type Guard) 또는 Zod/커스텀 검증 함수로 타입을 좁힙니다.
- **Explicit Function Signatures**: 내보내는(export) 함수, 서비스 메서드, 커스텀 훅은 반환 타입(`Promise<Result>`, `JSX.Element` 등)을 명시합니다.
- **Strict Null Checks**: 옵셔널 체이닝(`?.`) 및 널 병합 연산자(`??`)를 적극 활용하여 런타임 `undefined` / `null` 에러를 원천 차단합니다.

## 2. Clean Code & Defensive Programming
- **단일 책임 원칙 (SRP)**: 하나의 함수/컴포넌트는 하나의 역할만 담당하며, 50줄 이상의 복잡한 함수는 작은 하위 유틸리티로 분리합니다.
- **불변성 유지 (Immutability)**: 상태나 객체/배열 변형 시 원본 객체를 직접 변경(mutation)하지 않고 스프레드 연산자(`...`), `map`, `filter` 등을 사용하여 항상 새로운 불변 객체를 반환합니다.
- **조기 반환 (Early Return)**: 깊은 중첩(Nested if)을 지양하고 가드 클로즈(Guard Clause)를 최상단에 배치하여 가독성을 높입니다.
- **의미 있는 명명 (Naming Conventions)**:
  - 컴포넌트: `PascalCase` (예: `JobPostingCard.tsx`)
  - 훅: `camelCase` with `use` prefix (예: `useJobFilter.ts`)
  - 상수: `UPPER_SNAKE_CASE` (예: `MAX_RECOMMENDED_JOBS`)
  - 불리언 변수: `is`, `has`, `should` 접두어 사용 (예: `isLoading`, `hasPermission`)

## 3. Error Handling
- 모든 비동기 작업(API 호출, Firestore 접근 등)은 `try-catch`로 감싸고 사용자 친화적인 폴백(Fallback) 또는 에러 메시지를 제공합니다.
- 콘솔에 민감한 개인정보(비밀번호, 토큰 등)가 로깅되지 않도록 방어합니다.
