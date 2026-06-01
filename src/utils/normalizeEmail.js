/** メールアドレスを正規化する（前後空白を除去し小文字化）。
 *  Firestore のドキュメント ID（users/{email} 等）と認証トークンの email を
 *  一致させるために、クライアント・Functions 双方で同じ正規化を行う。 */
export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}
