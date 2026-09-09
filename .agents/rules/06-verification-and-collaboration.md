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

## 3. Branch & Deployment Policy (브랜치 및 배포 정책)
- **작업 브랜치 원칙**:
  - 사용자가 특별히 `develop`에 배포/작업해달라고 지정하기 전까지는, 모든 작업은 **`leedongwook` 브랜치**에서만 수행합니다.
- **배포 주소 원칙**:
  - 배포는 **오직 `leedongwook` 배포 채널**로만 수행합니다:
    ```bash
    npm run deploy:leedongwook
    # (내부적으로 npx firebase-tools hosting:channel:deploy leedongwook 실행)
    ```
  - **`leedongwook` 배포 주소**:
    - `https://al07team04-bdfcd--leedongwook-78lkswcx.web.app`
  - 사용자의 명시적 요청 없이 메인 운영 주소(`https://al07team04-bdfcd.web.app`)로 배포하거나 `develop` 브랜치로 병합/배포하지 않습니다.

## 4. One-Stop Autonomous Execution (원스톱 자율 완결 원칙)
- **추가 승인 버튼 요구 최소화**:
  - 사용자가 계획(Plan)을 승인하거나 작업을 지시하면, 중간에 사소한 확인이나 추가 승인 버튼을 요구하지 않고 **최종 배포 및 정리까지 단일 턴/흐름 내에서 원스톱으로 완결**합니다.
  - **원스톱 실행 파이프라인**:
    1. 코드 구현 및 단위 테스트 작성/수정
    2. 무결점 검증 (`npm run validate`: typecheck, lint, test, build 100% 통과)
    3. Git 커밋 및 원격 푸시 (`git commit` ➔ `git push origin leedongwook`)
    4. 채널 배포 (`npm run deploy:leedongwook`)
    5. 협업 로그 작성 (`docs/AI_COLLABORATION_LOG.md`)
    6. 최종 완료 상태 및 배포 URL 요약 보고
  - 비가역적 데이터 삭제와 같은 중대한 파괴적 위험이 없는 한, 중간 단계마다 질문하거나 멈추지 않고 끝까지 완결하여 사용자의 승인 피로도를 최소화합니다.
