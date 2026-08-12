# 시니어 채용 공고 데이터베이스 스키마

이 문서는 `feature/job-database` 브랜치에서 구축한 공고 데이터의 기준입니다. 목적은 일반 채용사이트 공고를 그대로 복사하는 것이 아니라, 이어잡 서비스의 핵심 흐름인 `회사 프로젝트 등록 → 인재 추천 → AI 인터뷰 → 경험 카드 요약`에 연결하기 쉬운 형태로 공고를 재정의하는 것입니다.

## 데이터 위치

- 시드 데이터: `src/data/jobPostings.ts`
- 화면: `src/app/JobDatabasePage.tsx`
- 접근 경로:
  - 기업 관점: `/company/job-database`
  - 인재 관점: `/senior/job-database`

## 핵심 엔티티

### JobPosting

| 필드 | 의미 | 연결 기능 |
| --- | --- | --- |
| `id` | 공고 고유 ID | 상세/매칭 결과 식별 |
| `companyName` | 회사명 | 채용사이트 기본 정보 |
| `industry` | 산업군 | 필터/추천 조건 |
| `companySize` | 회사 규모 | 시니어 적합도 보조 기준 |
| `title` | 공고 제목 | 목록/상세 제목 |
| `category` | 프로젝트 문제 유형 | 추천/필터 핵심 축 |
| `seniority` | 요구 시니어 레벨 | 인재 경력 수준 매칭 |
| `employmentType` | 고용 형태 | 정규직/계약/자문/프로젝트 구분 |
| `hiringStage` | 채용 단계 | 공고 우선순위 표시 |
| `workType` | 근무 형태 | 원격/하이브리드/오피스 필터 |
| `location` | 지역 | 지역 필터 |
| `experienceYears` | 요구 경력 | 인재 프로필 매칭 |
| `salaryRange` | 보상 범위 | 채용사이트 기본 정보 |
| `deadline` | 마감일 | 마감 임박 표시 |
| `projectDuration` | 프로젝트 기간 | 프로젝트형 매칭 조건 |
| `collaborationTargets` | 협업 대상 | 인터뷰 질문/역할 적합도 |
| `coreResponsibilities` | 핵심 업무 | 공고 상세 |
| `qualifications` | 자격 요건 | 기본 매칭 조건 |
| `benefits` | 혜택 | 공고 상세 |
| `problemStatement` | 해결해야 할 회사 문제 | 이어잡 차별화 핵심 필드 |
| `projectGoal` | 프로젝트 목표 | 제안/매칭 근거 |
| `successMetrics` | 성공 기준 | AI 인터뷰 평가 기준 |
| `requiredSkills` | 필수 역량 | 키워드 검색/매칭 |
| `preferredSkills` | 우대 역량 | 가산점 기준 |
| `matchingSignals` | 매칭 신호 | 인재 경험 카드와 연결 |
| `recommendedTalentType` | 추천 인재 유형 | 추천 결과 설명 문구 |
| `matchingScoreCriteria` | 점수 산정 기준 | 매칭 로직 투명성 |
| `interviewFocus` | AI 인터뷰 확인 포인트 | 질문 생성 후보 |
| `seniorFitScore` | 시니어 적합도 점수 | 목록 우선순위 |
| `postedAt` | 등록일 | 최신순 정렬 |

## 프로젝트 유형

- `operations`: 운영 효율화
- `growth`: 성장/그로스
- `legacy-modernization`: 레거시 개선
- `data-platform`: 데이터 플랫폼
- `ai-automation`: AI 자동화
- `security`: 보안/리스크

## 다음 연결 아이디어

1. 회사의 `프로젝트 등록` 폼에서 입력한 문제를 `problemStatement`, `projectGoal`, `successMetrics`로 저장합니다.
2. 인재의 AI 인터뷰 결과 카드에서 `matchingSignals`, `requiredSkills`, `interviewFocus`와 겹치는 항목을 찾아 추천 점수를 계산합니다.
3. 기업 제안 상세 화면에서 `matchingScoreCriteria`를 설명 가능한 매칭 근거로 표시합니다.
4. 실제 DB를 붙일 경우 `JobPosting` 타입을 기준으로 Firestore 또는 Supabase 테이블을 만들면 됩니다.
