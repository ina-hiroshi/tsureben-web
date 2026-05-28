const MATE_INVITE_PATH = /\/mate-invite\/([^/?#]+)/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * QR / リンク / 生テキストから mate-invite の token を抽出する。
 * @param {string} raw
 * @returns {string | null}
 */
export function parseMateInviteToken(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(MATE_INVITE_PATH);
    if (match?.[1]) return match[1];
  } catch {
    // not an absolute URL
  }

  const pathMatch = trimmed.match(MATE_INVITE_PATH);
  if (pathMatch?.[1]) return pathMatch[1];

  if (UUID_PATTERN.test(trimmed)) return trimmed;

  return null;
}
