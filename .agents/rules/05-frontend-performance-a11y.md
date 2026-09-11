# ECC Rule: Frontend Performance & Senior Accessibility (a11y)

## 1. Senior Accessibility (시니어 특화 접근성 - WCAG)
- **High Readability**:
  - 본문 텍스트는 충분한 폰트 크기(최소 15px~16px 이상)와 적절한 줄간격(`leading-relaxed`, `leading-normal`)을 유지합니다.
  - 단어 쪼개짐 방지를 위해 중요한 버튼/탭에는 `whitespace-nowrap`, `break-keep`을 적용합니다.
- **Color Contrast**: 텍스트와 배경 사이의 명도 대비는 최소 4.5:1 이상을 확보하여 시인성을 극대화합니다.
- **Touch Target**: 모바일/터치 기기 환경에서 버튼 및 인터랙션 요소의 최소 터치 영역은 44x44px 이상을 권장합니다.

## 2. Rendering & Performance Optimization
- **불필요한 Re-render 방지**: 빈번하게 렌더링되는 컴포넌트의 고비용 연산은 `useMemo`, 콜백은 `useCallback`을 적절히 적용합니다.
- **코드 분할 (Code Splitting)**: 라우트 단위 `lazy()` 로딩을 유지하여 초기 번들 크기를 최적화합니다.
- **CLS (Cumulative Layout Shift) 방지**: 이미지 및 비동기 카드 영역에는 스켈레톤(Skeleton) 로더나 명시적 최소 높이(`min-h-*`)를 지정하여 레이아웃 밀림을 방지합니다.
- **자산 최적화**: WebP/SVG 포맷을 사용하고 이미지 크기를 최적화합니다.
