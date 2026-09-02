# ECC Rule: Architecture Patterns & Separation of Concerns

## 1. 3계층 아키텍처 (3-Tier Layering)
이 프로젝트는 철저한 관심사 분리(SoC)를 따릅니다:

1. **Presentation Layer (`src/app/`, `src/components/`)**:
   - 순수 UI 렌더링, 사용자 인터랙션 이벤트 수신, 레이아웃 표현에만 집중합니다.
   - 직접적인 외부 네트워크 API 호출이나 비즈니스 정책 계산을 지양하고 Hook 또는 Service에 위임합니다.

2. **Application / Hook Layer (`src/hooks/`, `src/lib/`)**:
   - UI와 데이터 레이어 사이의 상태 조율, 뷰 상태(UI State), 캐시, 전역 컨텍스트(Auth 등)를 관리합니다.

3. **Data / Service Layer (`src/services/`, `functions/`)**:
   - Firestore CRUD, Cloud Functions 호출, 외부 API(고용24, Gemini LLM 등)와의 인터페이스를 캡슐화합니다.
   - 입력값 정규화(Normalization), 데이터 모델 매핑, 캐싱 로직을 담당합니다.

## 2. Component Design Principles
- **Container / Presentational Pattern**: 데이터 조회 및 복잡한 상태 관리를 담당하는 컨테이너와 순수 시각적 UI를 그리는 프레젠테이션 컴포넌트를 분리합니다.
- **No Prop Drilling**: 3단계 이상의 깊은 Props 전달이 필요한 경우 Context 또는 컴포넌트 합성(Composition)을 활용합니다.
- **Single Source of Truth**: 동일한 데이터 상태가 여러 곳에 중복 관리되어 불일치(Sync) 문제가 발생하지 않도록 상위 단일 원천에서 관리합니다.
