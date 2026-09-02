# ECC Rule: TDD & Testing Standards

## 1. Test-Driven Development (TDD) 철학
- **Red-Green-Refactor**: 새로운 비즈니스 로직이나 유틸리티, 서비스 개발 시 테스트 코드를 먼저 작성하거나 구현과 동시에 작성하여 회귀 버그를 방지합니다.
- **Fail-Fast**: 실패해야 하는 상황(잘못된 파라미터, 네트워크 타임아웃, 예외 상황)을 먼저 검증합니다.

## 2. Vitest & Testing Framework 지침
- **Unit Test 위상**: `src/**/*.test.ts`, `src/**/*.test.tsx`, `functions/**/*.test.mjs` 위치에 테스트를 작성합니다.
- **Mocking 격리**:
  - Firebase SDK 및 외부 API 호출은 실제 서버를 치지 않도록 `vi.mock` 또는 인메모리 테스트 하네스(`src/test/harness.ts`)를 사용하여 철저히 격리합니다.
  - 시간/타이머 의존 로직은 `vi.useFakeTimers()`를 사용합니다.
- **100% Pass 필수**:
  - 단 하나의 테스트 실패도 용납하지 않습니다. 변경 사항 발생 시 `npm run test`를 실행하여 모든 테스트가 통과하는지 확인합니다.

## 3. 테스트 케이스 설계 체크리스트
1. **정상 경로 (Happy Path)**: 올바른 입력과 정상 시나리오 검증
2. **엣지 케이스 (Edge Cases)**: 빈 배열(`[]`), `null`/`undefined`, 특수문자, 극단적으로 긴 텍스트 입력
3. **오류 처리 (Error Handling)**: API 실패, 404, 500, 권한 부족 시 Fallback 및 에러 핸들링 검증
