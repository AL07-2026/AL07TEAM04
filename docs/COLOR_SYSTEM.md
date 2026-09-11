# 이어잡(EOJOB) 디자인 시스템: 컬러 시스템 가이드 (Color System Specification)

이 문서는 **이어잡(EOJOB)** 서비스의 아이덴티티, 시니어 친화적 웹 접근성(WCAG AA/AAA), B2B/B2C 신뢰도를 바탕으로 구축된 **컬러 시스템(Color System)** 명세서입니다. 다른 프로젝트, 웹/모바일 앱, 피그마(Figma) 등에서 즉시 재사용할 수 있도록 토큰화 및 코드 스니펫을 포함하고 있습니다.

---

## 1. 디자인 철학 (Design Philosophy)

1. **신뢰와 지속 가능성 (Trust & Sustainability - Deep Evergreen)**
   - 메인 키 컬러로 차분하고 깊이 있는 에버그린(`#173F3A`)을 사용하여 공공·B2B 서비스의 신뢰감과 시니어의 지속 가능한 경력 연결을 상징합니다.
2. **따뜻하고 눈이 편안한 캔버스 (Warmth & Comfort - Warm Ivory)**
   - 차가운 순백색 대신 따뜻한 웜 아이보리(`#F7F3EA`)와 소프트 크림(`#FAF7F2`)을 기본 배경으로 활용하여 장시간 화면 응시 시 눈의 피로를 최소화합니다.
3. **직관적인 주의 집중 및 생동감 (Vibrancy & Focus - Accessible Coral)**
   - 핵심 CTA, AI 추천 점수, 마감 임박 알림 등에 고대비 웜 코랄(`#B84734`, `#F06B4F`)을 포인트 컬러로 사용하여 시니어 사용자도 주요 액션을 놓치지 않도록 유도합니다.
4. **철저한 웹 접근성 (WCAG 2.1 AA/AAA Compliance)**
   - 모든 텍스트와 배경의 명도 대비를 4.5:1(일반 텍스트) 및 7:1(시니어 고가독성) 이상으로 보장합니다.

---

## 2. 브랜드 핵심 팔레트 (Brand Core Palette)

| 컬러명 | 토큰명 | HEX | RGB | HSL | 주요 용도 및 역할 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Deep Evergreen** | `--color-evergreen`<br>`--primary` | `#173F3A` | `rgb(23, 63, 58)` | `hsl(173, 47%, 17%)` | 메인 브랜드 컬러, Primary 버튼, 활성 탭, 헤더 강조, 포커스 링 |
| **Accessible Coral** | `--color-coral`<br>`--accent` | `#B84734` | `rgb(184, 71, 52)` | `hsl(9, 56%, 46%)` | Accent 포인트, 마감 임박 뱃지, 중요 알림, 긴급 CTA |
| **Highlight Coral** | `--color-coral-light` | `#F06B4F` | `rgb(240, 107, 79)` | `hsl(10, 84%, 63%)` | AI 적합도 90점 이상 게이지, 생동감 있는 그래픽 요소 |
| **Warm Ivory** | `--color-ivory`<br>`--background` | `#F7F3EA` | `rgb(247, 243, 234)` | `hsl(42, 45%, 94%)` | 전체 서비스 기본 배경 캔버스, 페이지 루트 배경 |
| **Soft Mint** | `--color-mint`<br>`--secondary` | `#DDEBE7` | `rgb(221, 235, 231)` | `hsl(163, 27%, 89%)` | Secondary 배경, 필터 칩/뱃지 배경, 텍스트 셀렉션(Selection) |
| **Deep Ink** | `--color-ink`<br>`--foreground` | `#17212B` | `rgb(23, 33, 43)` | `hsl(210, 30%, 13%)` | 기본 본문 텍스트(Body), 메인 헤드라인, 고대비 다크 서피스 |

---

## 3. 서피스 및 레이어 계층 (Surface & Neutral System)

공간의 깊이감과 시각적 위계를 구성하는 서피스(배경), 보더(경계선), 텍스트 계층입니다.

### 3.1 Surface (배경 및 카드)
| 레벨 / 토큰 | HEX | Tailwind 클래스 | 설명 및 적용처 |
| :--- | :--- | :--- | :--- |
| **Canvas Base** | `#F7F3EA` | `bg-[#F7F3EA]` / `bg-background` | 기본 뷰포트 배경 |
| **Surface Raised** | `#FFFFFF` | `bg-white` / `bg-card` | 공고 카드, 모달 팝업, 폼 입력 카드 |
| **Surface Subtle** | `#FAF7F2` | `bg-[#FAF7F2]` | 보조 컨테이너, 버튼 배경, 입력 필드 인셋 |
| **Surface Mint Tint** | `#DDEBE7` | `bg-[#DDEBE7]` | 추천/선택된 아이템, 단계(Step) 활성 카드 |
| **Surface Coral Tint** | `#FDF0ED` | `bg-[#FDF0ED]` | 마감 임박 공고 배경, 긴급 안내 배너, 80점대 카드 |
| **Surface Muted** | `#EBE5D9` | `bg-[#EBE5D9]` | 비활성 영역, 스켈레톤 UI, 보조 구분 바 |

### 3.2 Border & Divider (경계선)
| 토큰 | HEX | Tailwind 클래스 | 설명 |
| :--- | :--- | :--- | :--- |
| **Border Default** | `#E0D9C8` | `border-[#E0D9C8]` | 카드 및 컨테이너 기본 테두리 |
| **Border Subtle** | `#E7DFCB` | `border-[#E7DFCB]` | 헤더 하단 라인, 연한 섹션 디바이더 |
| **Border Mint** | `#BBD5CE` | `border-[#BBD5CE]` | 민트 뱃지 및 필터 태그 외곽선 |
| **Border Coral Tint** | `#F06B4F`/30 | `border-[#F06B4F]/30` | 주의/임박 카드 전용 테두리 |

### 3.3 Typography & Text Color (텍스트)
| 레벨 | HEX | Tailwind 클래스 | 설명 |
| :--- | :--- | :--- | :--- |
| **Text Primary (Ink)** | `#17212B` | `text-[#17212B]` / `text-foreground` | 제목, 본문, 필수 레이블 (최고 가독성) |
| **Text Brand (Evergreen)** | `#173F3A` | `text-[#173F3A]` / `text-primary` | 브랜드 링크, 활성 탭 텍스트, 브랜드 타이틀 |
| **Text Secondary (Slate)** | `#45556C` | `text-[#45556C]` / `text-muted-foreground` | 설명글, 보조 캡션, 날짜/메타데이터 |
| **Text Tertiary (Subtle)** | `#7A8A99` | `text-[#7A8A99]` | 플레이스홀더, 비활성 아이콘 |
| **Text Inverse** | `#FFFFFF` | `text-white` | Primary 버튼 및 다크 뱃지 내부 텍스트 |

---

## 4. 데이터 시각화 및 상태 컬러 (Functional & Semantic Colors)

### 4.1 AI 적합도 / 매칭 점수 시스템 (Fit Score Tones)
시니어 사용자에게 매칭 점수의 신뢰도를 직관적으로 전달하기 위한 4단계 점수 팔레트입니다.

| 구간 (Score) | 등급 | Bar Color | Container Background | Text & Score Color |
| :--- | :--- | :--- | :--- | :--- |
| **90점 이상** | 매우 높음 | `#F06B4F` (Coral) | `#F06B4F` (Solid Coral) | `text-white` (백색 강조) |
| **80 ~ 89점** | 높음 | `#F06B4F` (Coral) | `#FDF0ED` (Soft Coral) | 레이블 `#7F3427` / 점수 `#A94230` |
| **70 ~ 79점** | 보통 | `#A9934A` (Warm Gold) | `#F7F3E7` (Soft Gold) | 레이블 `#5C512D` / 점수 `#6E5E2F` |
| **70점 미만** | 참고 | `#64748B` (Slate 500) | `#F1F5F9` (Slate 100) | `text-slate-700` |

### 4.2 시스템 상태 컬러 (System Status)
| 상태 | Foreground (Text/Icon) | Background (Surface) | Border |
| :--- | :--- | :--- | :--- |
| **Success (성공/인증)** | `#173F3A` (Deep Evergreen) | `#DDEBE7` (Soft Mint) | `#BBD5CE` |
| **Warning (주의/안내)** | `#854D0E` (Amber 800) | `#FEF3C7` (Amber 100) | `#FDE68A` |
| **Danger (오류/긴급)** | `#7F3427` (Deep Coral) | `#FDF0ED` (Light Coral) | `#F06B4F`/50 |
| **Info (정보/공지)** | `#1E40AF` (Blue 800) | `#EFF6FF` (Blue 50) | `#BFDBFE` |

---

## 5. 인터랙션 및 상태 토큰 (Interaction Tokens)

| 인터랙션 상태 | 스타일 명세 | 용도 |
| :--- | :--- | :--- |
| **Focus Visible Ring** | `outline: 3px solid #173F3A; outline-offset: 3px;` | 키보드 내비게이션 접근성 포커스 링 |
| **Primary Hover** | Background `#173F3A` ➔ `#21544E` (`#235851`) | Primary 버튼 마우스 호버 |
| **Secondary Hover** | Background `#FAF7F2` ➔ `#FFFFFF` (`text-[#17212B]`) | 아웃라인/서브 버튼 호버 |
| **Active Click** | `transform: scale(0.98)` / `active:scale-95` | 버튼 클릭 물리적 피드백 |
| **Selection** | `background: #DDEBE7; color: #173F3A;` | 텍스트 드래그 선택 영역 |

---

## 6. 개발 플랫폼별 코드 스니펫 (Code Snippets)

### 6.1 Tailwind CSS v4 (`@theme` 인라인 정의)
```css
@import "tailwindcss";

@theme inline {
  --color-evergreen: #173f3a;
  --color-coral: #b84734;
  --color-coral-light: #f06b4f;
  --color-ivory: #f7f3ea;
  --color-mint: #ddebe7;
  --color-ink: #17212b;
  
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-surface-subtle: var(--surface-subtle);
  --color-surface-raised: var(--surface-raised);
}

:root {
  --background: #f7f3ea;
  --foreground: #17212b;
  --card: #ffffff;
  --primary: #173f3a;
  --primary-foreground: #ffffff;
  --accent: #b84734;
  --accent-foreground: #ffffff;
  --secondary: #ddebe7;
  --secondary-foreground: #173f3a;
  --muted: #ebe5d9;
  --muted-foreground: #45556c;
  --border: #e0d9c8;
  --surface-subtle: #faf7f2;
  --surface-raised: #ffffff;
  --focus-ring: #173f3a;
}
```

### 6.2 Tailwind CSS v3 (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        evergreen: {
          DEFAULT: '#173F3A',
          hover: '#21544E',
          active: '#102E2A',
        },
        coral: {
          DEFAULT: '#B84734',
          light: '#F06B4F',
          soft: '#FDF0ED',
          dark: '#7F3427',
        },
        ivory: {
          DEFAULT: '#F7F3EA',
          subtle: '#FAF7F2',
          muted: '#EBE5D9',
        },
        mint: {
          DEFAULT: '#DDEBE7',
          border: '#BBD5CE',
          light: '#EDF6F2',
        },
        ink: {
          DEFAULT: '#17212B',
          muted: '#45556C',
          subtle: '#7A8A99',
        },
        gold: {
          DEFAULT: '#A9934A',
          soft: '#F7F3E7',
          border: '#CDBF8C',
          dark: '#5C512D',
        }
      }
    }
  }
};
```

### 6.3 TypeScript / JavaScript 토큰 상수 (`colors.ts`)
```typescript
export const COLOR_TOKENS = {
  brand: {
    evergreen: '#173F3A',
    evergreenHover: '#21544E',
    coral: '#B84734',
    coralLight: '#F06B4F',
    coralSoft: '#FDF0ED',
    coralDark: '#7F3427',
    ivory: '#F7F3EA',
    mint: '#DDEBE7',
    mintBorder: '#BBD5CE',
    ink: '#17212B',
  },
  surface: {
    canvas: '#F7F3EA',
    card: '#FFFFFF',
    subtle: '#FAF7F2',
    muted: '#EBE5D9',
  },
  border: {
    default: '#E0D9C8',
    subtle: '#E7DFCB',
    mint: '#BBD5CE',
  },
  text: {
    primary: '#17212B',
    secondary: '#45556C',
    tertiary: '#7A8A99',
    brand: '#173F3A',
    inverse: '#FFFFFF',
  },
  fitScore: {
    highPlus: {
      bg: '#F06B4F',
      text: '#FFFFFF',
      bar: '#F06B4F',
    },
    high: {
      bg: '#FDF0ED',
      text: '#7F3427',
      score: '#A94230',
      bar: '#F06B4F',
      border: 'rgba(240, 107, 79, 0.55)',
    },
    medium: {
      bg: '#F7F3E7',
      text: '#5C512D',
      score: '#6E5E2F',
      bar: '#A9934A',
      border: '#CDBF8C',
    },
    reference: {
      bg: '#F1F5F9',
      text: '#334155',
      score: '#334155',
      bar: '#64748B',
      border: '#CBD5E1',
    },
  },
} as const;
```

---

## 7. 접근성 검증 체크리스트 (Accessibility Matrix)

| 조합 (텍스트 / 배경) | 명도 대비 비율 (Contrast) | WCAG 2.1 AA | WCAG 2.1 AAA | 권장 용도 |
| :--- | :--- | :--- | :--- | :--- |
| **Deep Ink (`#17212B`) on Warm Ivory (`#F7F3EA`)** | **14.8 : 1** | 통과 (Pass) | 통과 (Pass) | 본문 일반 텍스트, 모든 크기 |
| **Deep Ink (`#17212B`) on White (`#FFFFFF`)** | **16.5 : 1** | 통과 (Pass) | 통과 (Pass) | 카드 내부 본문 |
| **Deep Evergreen (`#173F3A`) on Warm Ivory (`#F7F3EA`)** | **9.2 : 1** | 통과 (Pass) | 통과 (Pass) | 브랜드 제목, 핵심 강조 링크 |
| **White (`#FFFFFF`) on Deep Evergreen (`#173F3A`)** | **10.5 : 1** | 통과 (Pass) | 통과 (Pass) | Primary 버튼, 다크 뱃지 |
| **White (`#FFFFFF`) on Accessible Coral (`#B84734`)** | **5.3 : 1** | 통과 (Pass) | 대형 텍스트 통과 | Accent CTA 버튼, 알림 뱃지 |
| **Deep Coral (`#7F3427`) on Light Coral (`#FDF0ED`)** | **7.8 : 1** | 통과 (Pass) | 통과 (Pass) | 80점대 적합도 카드 텍스트 |
| **Slate (`#45556C`) on Warm Ivory (`#F7F3EA`)** | **5.8 : 1** | 통과 (Pass) | 대형 텍스트 통과 | 보조 설명 텍스트 (Secondary) |
