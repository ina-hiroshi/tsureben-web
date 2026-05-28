import { Capacitor } from '@capacitor/core';

function buildSharePayload(inviteUrl, inviterName) {
  const title = '連れ勉の招待';
  const text = inviterName
    ? `${inviterName}さんから連れ勉仲間の招待が届いています`
    : '連れ勉仲間の招待';
  return { title, text, url: inviteUrl };
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export async function shareMateInvite({ inviteUrl, inviterName, onCopied }) {
  const payload = buildSharePayload(inviteUrl, inviterName);

  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    await Share.share(payload);
    return 'shared';
  }

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') {
        return 'cancelled';
      }
      throw err;
    }
  }

  await copyToClipboard(inviteUrl);
  onCopied?.();
  return 'copied';
}

export async function copyMateInviteLink(inviteUrl, onCopied) {
  await copyToClipboard(inviteUrl);
  onCopied?.();
  return 'copied';
}
