# 4팀 Git 협업 실습

## 목표

각 팀원이 `main`에서 개인 브랜치를 만든 뒤 담당 부분만 수정하고 GitHub에 올립니다.
부리더는 Pull Request(PR)를 검토한 후 충돌을 해결하고 `main`에 합칩니다.

## 역할표

| 팀원 | 담당 기능/화면 | 주 작업 파일 | 브랜치 예시 | 상태 |
| --- | --- | --- | --- | --- |
| 박현정 | 정하기 | 정하기 | `feature/hyeonjeong-담당기능` | 예정 |
| 윤중심 | 정하기 | 정하기 | `feature/jungsim-담당기능` | 예정 |
| 유재열 | 정하기 | 정하기 | `feature/jaeyeol-담당기능` | 예정 |
| 이동욱 | 정하기 | 정하기 | `feature/dongwook-담당기능` | 예정 |
| 최동일 | 정하기 | 정하기 | `feature/dongil-담당기능` | 예정 |

담당 기능과 파일을 먼저 정하면 같은 파일을 동시에 수정해 생기는 충돌을 크게 줄일 수 있습니다.

## 팀원 작업 순서

PowerShell에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
cd C:\AL07TEAM04
git switch main
git pull origin main
git switch -c feature/내이름-담당기능
```

담당 코드를 수정한 뒤 검증합니다.

```powershell
npm run validate
git status
git add 담당한파일
git commit -m "feat: 담당 기능 구현"
git push -u origin feature/내이름-담당기능
```

GitHub에서 `feature/내이름-담당기능`에서 `main`으로 향하는 PR을 생성하고 아래 내용을 적습니다.

- 구현한 기능
- 변경한 파일
- 확인 방법
- 남은 문제
- 화면 변경이 있으면 캡처 이미지

## 부리더 통합 순서

1. PR의 변경 파일과 담당 범위를 확인합니다.
2. CI와 `npm run validate` 결과를 확인합니다.
3. 다른 팀원 파일을 불필요하게 수정하지 않았는지 확인합니다.
4. 충돌이 없으면 PR을 병합합니다.
5. 충돌이 있으면 담당자와 수정 방향을 합의한 뒤 브랜치에서 해결합니다.
6. 병합 후 팀원들에게 `git switch main`, `git pull origin main`을 안내합니다.

## 충돌 방지 원칙

- `main`에서 직접 코드를 수정하거나 푸시하지 않습니다.
- 한 기능 또는 화면의 주 소유자는 한 명으로 정합니다.
- `src/app/App.tsx`, 전역 스타일, 공통 타입처럼 공유 파일을 바꿀 때는 먼저 팀에 알립니다.
- 한 PR에는 한 사람의 한 가지 담당 작업만 담습니다.
- 다른 팀원의 코드를 정리한다는 이유로 함께 리팩터링하지 않습니다.
- PR이 병합되기 전 다음 작업을 시작하면 최신 `main`을 먼저 반영합니다.

## 박현정 실습 체크리스트

- [ ] 담당 기능과 수정 파일을 역할표에 기록
- [ ] 최신 `main`에서 개인 브랜치 생성
- [ ] 담당 파일만 수정
- [ ] `npm run validate` 통과
- [ ] 커밋 후 GitHub에 푸시
- [ ] PR 작성 및 부리더에게 공유
- [ ] 부리더 병합 후 최신 `main` 다시 받기

## 디자인 확인

구현 전에 [FigJam 디자인 참고자료](./figma/README.md)와 원본 FigJam의 최신 댓글을 확인합니다.
