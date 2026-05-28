const POST_LOGIN_RETURN_URL_KEY = 'postLoginReturnUrl';

export function setPostLoginReturnUrl(url) {
  if (url) {
    sessionStorage.setItem(POST_LOGIN_RETURN_URL_KEY, url);
  }
}

export function consumePostLoginReturnUrl(fallback = '/home') {
  const url = sessionStorage.getItem(POST_LOGIN_RETURN_URL_KEY) || fallback;
  sessionStorage.removeItem(POST_LOGIN_RETURN_URL_KEY);
  return url;
}

export function peekPostLoginReturnUrl() {
  return sessionStorage.getItem(POST_LOGIN_RETURN_URL_KEY);
}
