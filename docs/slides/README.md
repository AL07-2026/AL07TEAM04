# 📑 이어잡(EOJOB) 인사담당자 맞춤형 B2B 서비스 소개서 슬라이드 덱

이 디렉토리에는 기업 인사담당자(HR Manager, 채용총괄, CEO)에게 이메일로 발송하거나 미팅에서 프레젠테이션할 수 있도록 제작된 **3대 웹 프레젠테이션 엔진(Reveal.js, Marp, Slidev)** 슬라이드 파일이 포함되어 있습니다.

---

## 📂 파일 구성 및 특징

| 구분 | 방식 | 파일 경로 | 특징 및 용도 |
| :--- | :--- | :--- | :--- |
| **Native PPTX (권장)** | `docs/slides/eojob-intro.pptx` | **slide-master 원칙 적용**. 모든 텍스트, 도형, 표, 이미지가 파워포인트에서 개별 클릭/수정 가능한 100% 네이티브 개체 |
| **Reveal.js (웹)** | `docs/slides/reveal-eojob.html` | 3D 큐브 전환, 글래스모피즘, 실시간 지원금 계산기 슬라이더 위젯 내장 웹 프레젠테이션 |
| **Marp (경량)** | `docs/slides/marp-eojob.md` | 마크다운 기반 8개 슬라이드 완결판, Marp CLI 변환용 |

---

## ⚡ 빠른 실행 명령어

```bash
# 1. [가장 추천] 100% 네이티브 파워포인트 열기 (글자/도형/표 수정 가능)
npm run slide:pptx

# 2. 파이썬으로 네이티브 PPTX 즉시 재생성
npm run slide:native

# 3. 3D 인터랙티브 Reveal.js 브라우저 열기
npm run slide:reveal

# 4. Marp 웹 슬라이드 열기
npm run slide:marp:open

# 5. Slidev 실시간 개발 서버 구동 (브라우저 자동 열림)
npm run slide:slidev

# 6. Marp 실시간 미리보기 서버 구동
npm run slide:marp
```

---

## 🎯 인사담당자(HR) 타깃 핵심 소구 포인트

1. **연 720만원(월 60만원) 정부 고용촉진장려금 실시간 리포트**:
   - 국민취업지원제도 이수 시니어 인재 채용 시 채용 1인당 연 최대 720만원 정부 환급.
   - `reveal-eojob.html` 4페이지에서 **채용 인원별 실시간 절감액 슬라이더 계산기** 직접 체험 가능.
2. **AI 경험 카드 (사전 스크리닝)**:
   - 음성 심층 인터뷰로 추출된 수치 중심 성과 요약(불량률 감축, R&D 수주 등)으로 서류 검토 시간 80% 단축.
3. **초유연 고용 계약 모델**:
   - 정규직, 주 2~3일 반일제, 시간제, 단기 프로젝트 자문 등 기업 맞춤형 유연 고용 지원.
4. **감각적인 비주얼 시스템**:
   - 이어잡 공식 텍스트 로고 및 브랜드 키 컬러(Deep Evergreen `#173F3A`, Warm Ivory `#F7F3EA`, Accessible Coral `#F06B4F`), 고화질 오피스 및 3D UI 카드 그래픽 완벽 적용.
