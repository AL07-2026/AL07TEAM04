# OmniRoute 무손실(Lossless) 고품질 연동 가이드

이 문서는 **OmniRoute**를 활용하여 코드 품질 저하 없이 여러 AI 계정(Claude, GPT, Gemini 등)의 사용량 제한을 우회하고, 모델 전환 알림을 받는 최적의 설정 방법을 정리한 가이드입니다.

---

## 1. 개요 및 동작 원리
- **엔드포인트**: `http://localhost:20128/v1`
- **역할**: 로컬에서 백그라운드로 구동되며, AI 코딩 도구(Claude Code, Cursor, Codex 등)의 요청을 계정별 가용 쿼터에 따라 스마트하게 분배합니다.

---

## 2. ⚡ 퀄리티 무손실(Lossless) 핵심 3대 설정

대시보드(`http://localhost:20128`)에 접속하여 아래 설정을 필수로 적용합니다:

### 1) 토큰 압축 기능 완전 비활성화 (OFF)
- **Settings ➔ RTK (Input Token Compression)**: `OFF` (비활성화)
- **Settings ➔ Caveman Mode (Output Compression)**: `OFF` (비활성화)
- *이유: 프롬프트 압축 시 미세한 비즈니스 로직, 타입 정의, 프로젝트 룰이 유실되어 코드 품질이 급락하는 현상을 100% 방지합니다.*

### 2) 동일 티어(Tier-1) 플래그십 전용 폴백 체인 구성
- 하위 경량 모델(Haiku, Flash-Lite, 소형 로컬 LLM 등)은 코딩 폴백 체인에서 **완전 제외**합니다.
- **권장 체인**:
  1. `Claude 3.7 Sonnet (주 계정)` (우선순위 1)
  2. `Claude 3.7 Sonnet (보조 계정)` (우선순위 2)
  3. `Gemini 2.0 Pro` 또는 `GPT-4o` (우선순위 3)

### 3) Tool Calling 원형 보존 (Strict Mode)
- 에이전트의 파일 조작 및 터미널 실행 JSON 스키마를 원형 그대로 통과(Pass-through)하도록 설정합니다.

---

## 3. 🔔 모델/계정 전환 알림 확인 방법

1. **실시간 대시보드 텔레메트리 (`http://localhost:20128/logs`)**:
   - 현재 요청이 어떤 계정과 모델로 라우팅되고 있는지 초록/주황 인디케이터로 실시간 표시됩니다.
2. **응답 메타데이터**:
   - 응답 헤더의 `x-omniroute-provider` 및 `x-omniroute-model`을 통해 전환 내역을 모니터링할 수 있습니다.

---

## 4. 🚀 실행 및 연동 3단계

### 1단계: 독립 터미널에서 OmniRoute 실행
OmniRoute는 독립된 백그라운드 프로세스로 실행합니다:
```bash
# 글로벌 설치 (최초 1회)
npm install -g omniroute

# 서버 시작 (기본 포트: 20128)
omniroute
```
*(또는 Docker 환경: `docker run -d -p 20128:20128 diegosouzapw/omniroute`)*

### 2단계: 대시보드에서 API 키 등록 & 무손실 설정
1. 브라우저로 `http://localhost:20128` 접속
2. 보유한 AI 계정(Anthropic, OpenAI, Google) API 키 등록
3. 위 2번 항목의 **무손실 설정(압축 OFF, Tier-1 체인)** 적용

### 3단계: 코딩 도구에 OmniRoute 엔드포인트 연결
- **Claude Code**:
  ```bash
  export ANTHROPIC_BASE_URL="http://localhost:20128/v1"
  export ANTHROPIC_API_KEY="omniroute에서_발급받은_로컬키"
  ```
- **Cursor / 에이전트**:
  - `Base URL`: `http://localhost:20128/v1`
  - `API Key`: `omniroute_local_key`
