export function handleApplicationEmailUnavailable(_request, response) {
  response.set('Cache-Control', 'private, no-store');
  return response.status(503).json({
    emailSent: false,
    error: '담당자 메일 발송 설정을 준비 중입니다. 지원 이력은 이어잡에 안전하게 저장되었습니다.',
    retryable: false,
  });
}
