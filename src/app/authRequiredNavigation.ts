export const LOGIN_REQUIRED_MESSAGE = '로그인 후 이용할 수 있어요.';

export const LOGIN_REQUIRED_NAVIGATION_STATE = {
  loginRequiredMessage: LOGIN_REQUIRED_MESSAGE,
} as const;

export function createLoginRedirectPath(destination: string) {
  return `/login?redirect=${encodeURIComponent(destination)}`;
}

export function getLoginRequiredMessage(state: unknown) {
  if (!state || typeof state !== 'object' || !('loginRequiredMessage' in state)) return '';
  const message = state.loginRequiredMessage;
  return typeof message === 'string' ? message : '';
}
