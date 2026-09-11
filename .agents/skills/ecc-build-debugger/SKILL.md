---
name: ecc-build-debugger
description: ECC 빌드 디버거 스킬. TypeScript 컴파일, Vite 번들링, ESLint, Vitest, Firebase 환경의 빌드 및 런타임 오류를 신속히 분석하고 해결합니다.
---

# ECC Build Debugger Skill

TypeScript 컴파일 오류, Vite 번들링 실패, ESLint 위반, 테스트 실패 및 Firebase 환경 오류 발생 시 근본 원인(RCA)을 분석하고 해결하는 스킬입니다.

## 1. 디버깅 단계별 절차
1. **오류 격리 (Error Isolation)**:
   - 오류 발생 단계 파악: Typecheck (`tsc`), Lint (`eslint`), Test (`vitest`), 또는 Build (`vite build`)
   - 정확한 파일 경로와 라인 번호, 에러 스택 트레이스 추적
2. **원인 분석 (Root Cause Analysis)**:
   - 타입 불일치 (Type Mismatch)
   - 순환 참조 (Circular Dependency)
   - 번들링 시 dynamic import 또는 SSR/CORS 문제
   - Mocking 누락 또는 비동기 타이밍 이슈
3. **최소 침습적 수정 (Surgical Fix)**:
   - 관련 없는 코드를 흔들지 않고, 근본 원인을 해소하는 가장 깔끔하고 안전한 수정 적용
4. **전체 파이프라인 재검증**:
   - `npm run validate`를 실행하여 모든 단계가 완벽히 통과하는지 확인

## 2. 자주 발생하는 문제 해결 가이드
- **TypeScript 타입 에러**: 불필요한 타입 단언(`as`) 대신 타입 가드 또는 유니온 타입 정제 적용
- **ESLint 규칙 위반**: `eslint . --fix` 활용 및 미사용 변수/임포트 정리
- **Vitest 비동기 타임아웃**: `waitFor` 또는 비동기 `Promise` 완료 대기 패턴 점검
