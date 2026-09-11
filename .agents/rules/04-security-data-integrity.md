# ECC Rule: Security & Data Integrity

## 1. Secrets & Credentials Management
- **API Key 노출 금지**: OpenAI/Gemini/AssemblyAI/Firebase Admin 등 서버 전용 비밀키는 클라이언트 코드에 하드코딩하지 않습니다.
- **Environment Variables**: 모든 시크릿은 `.env` 또는 Cloud Functions Secrets / Parameter Store를 통해 안전하게 주입받습니다.

## 2. Firebase Security & Permission
- **Firestore Security Rules**: 클라이언트에서 직접 수정 가능한 필드와 서버(Admin SDK)에서만 수정해야 하는 필드(역할 권한, 결제, 상태 검증 등)를 명확히 구분합니다.
- **사용자 권한 검증**: 본인 계정의 데이터만 조회/수정할 수 있도록 `auth.uid` 일치 여부를 항상 검증합니다.

## 3. Data Sanitization & Validation
- **XSS 방지**: React 기본 이스케이프를 우회하는 `dangerouslySetInnerHTML`의 무분별한 사용을 금지합니다. 불가피한 경우 DOMPurify 등으로 새니타이즈합니다.
- **Payload 정규화**: 서버로 전송되거나 로컬 저장소에 캐시되는 데이터는 트림(`trim()`), 타입 변환, 허용된 enum 필드 검증을 거친 후 처리합니다.
