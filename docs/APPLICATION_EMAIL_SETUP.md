# 지원서 자동 이메일 발송 설정

기업이 직접 등록한 프로젝트에 인재가 지원하면 다음 순서로 처리된다.

1. 인재의 지원 기록과 이력서·포트폴리오를 Firestore와 Firebase Storage에 저장한다.
2. `POST /api/applications/send`가 Firebase 로그인 토큰과 해당 사용자의 지원 기록을 검증한다.
3. 프로젝트 소유자의 `company_profiles` 문서에서 담당자 이메일을 읽는다. 클라이언트가 보낸 수신 주소는 사용하지 않는다.
4. 서버가 Storage에 저장된 해당 지원자의 파일만 읽어 Resend 트랜잭션 메일에 첨부한다.
5. 지원 ID를 Resend `Idempotency-Key`로 사용하고, 발송 결과를 지원 문서의 `emailDelivery`에 저장해 중복 발송을 막는다.

## 운영 설정

Resend에서 발급한 API 키와 검증된 도메인의 발신 주소가 필요하다. 값은 소스코드나 `.env`에 저장하지 않고 Firebase Secret Manager에 등록한다.

```powershell
npm exec --yes --package=firebase-tools -- firebase functions:secrets:set RESEND_API_KEY
npm exec --yes --package=firebase-tools -- firebase functions:secrets:set APPLICATION_FROM_EMAIL
```

`APPLICATION_FROM_EMAIL`은 `이어잡 <apply@검증된-도메인>` 형식으로 입력한다. 도메인이 검증되지 않으면 임의의 기업 담당자에게 운영 메일을 발송할 수 없다.

설정 후 Functions와 Hosting을 배포한다.

```powershell
npm exec --yes --package=firebase-tools -- firebase deploy --only functions:api,hosting
```

## 실제 수신 테스트

1. 기업 테스트 계정의 담당자 이메일을 수신 가능한 테스트 주소로 저장한다.
2. 해당 기업 계정으로 공개 프로젝트를 하나 등록한다.
3. 인재 테스트 계정으로 이력서 PDF를 첨부하고 지원한다.
4. 화면에 `기업 지원 및 이메일 전송 완료`가 표시되는지 확인한다.
5. 담당자 메일함에서 제목, 지원자 답장 주소, AI 경험 요약, 첨부파일을 확인한다.
6. 같은 프로젝트에 다시 지원해도 메일이 중복 발송되지 않는지 확인한다.

고용24·서울시·공공 공고는 외부 채용 시스템이 최종 접수처이므로 자동 메일 발송 대상이 아니다.
