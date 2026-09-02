# ECC Rule: Verification Pipeline & AI Collaboration Protocol

## 1. Zero-Defect Validation Pipeline
- 코드를 변경하거나 기능을 추가한 후에는 반드시 프로젝트 검증 명령어를 실행합니다:
  ```bash
  npm run validate
  ```
  *(내부적으로 `typecheck` -> `lint` -> `test` -> `build` 4단계를 순차적으로 실행하여 무결성을 검증합니다.)*
- 빌드 파이프라인(`npm run validate`)이 단 1개의 경고나 에러도 없이 100% 통과할 때만 작업을 완료로 간주합니다.

## 2. Multi-AI Collaboration Protocol (Codex & Antigravity)
- **작업 시작 전**:
  - `docs/AI_COLLABORATION_LOG.md` 상단의 최신 작업 내역과 `다음 할 일 / 전달 사항`을 확인합니다.
- **작업 완료 후**:
  - `docs/AI_COLLABORATION_LOG.md` 상단에 새로운 작업 로그(날짜, 작업자, 주요 변경 내용, 검증 결과, 변경 파일 목록, 다음 전달 사항)를 명시합니다.
- **원자적 변경 (Atomic Changes)**:
  - 한 번의 작업에 단일 목적의 변경 사항만 포함하며, 관련 없는 코드나 서식을 불필요하게 수정하지 않습니다.
