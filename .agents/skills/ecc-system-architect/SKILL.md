---
name: ecc-system-architect
description: ECC 시스템 아키텍트 스킬. 대규모 기능 설계, 기술 영향도 분석, 데이터 모델링 및 의존성 분석을 체계적으로 수행합니다.
---

# ECC System Architect Skill

복잡한 요구사항이나 새로운 시스템 기능을 도입할 때 전체 아키텍처 관점에서 문제를 분석하고 무결점 구현 계획을 수립하는 스킬입니다.

## 1. 아키텍처 분석 절차
1. **요구사항 분해 (Requirements Breakdown)**:
   - 핵심 기능, 예외 케이스, 데이터 흐름 파악
   - 시니어 사용자 UX / 기업 사용자 UX 요구사항 분리
2. **영향도 분석 (Impact Analysis)**:
   - 기존 서비스 레이어(`src/services/`), 전역 상태(`src/lib/`), 데이터베이스 스키마(Firestore) 영향도 조사
   - 변경 시 발생 가능한 사이드 이펙트 사전 차단
3. **계층형 설계 수립**:
   - 데이터 모델 (`interfaces`, `types`) 정의
   - 서비스 인터페이스 정의
   - UI 컴포넌트 구조 및 라우팅 설계

## 2. 설계 원칙
- **Clean Architecture & SRP**: UI와 비즈니스 로직, 데이터 레이어의 결합도를 최소화합니다.
- **점진적 릴리즈 (Backward Compatibility)**: 기존 API나 로컬 스토리지 캐시, Firestore 스키마와의 하위 호환성을 유지합니다.
- **Fall-back First**: 외부 API나 네트워크 지연 시 사용자 경험을 훼손하지 않는 클라이언트 Fallback 설계를 포함합니다.
