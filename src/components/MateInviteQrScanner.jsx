import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseMateInviteToken } from '../utils/parseMateInviteToken';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

const SCANNER_ELEMENT_ID = 'mate-invite-qr-reader';

function cameraErrorMessage(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('notallowed') || msg.includes('permission')) {
    return 'カメラの使用が許可されていません。ブラウザの設定を確認してください。';
  }
  if (msg.includes('notfound') || msg.includes('no camera')) {
    return 'カメラが見つかりません。';
  }
  if (msg.includes('notreadable') || msg.includes('in use')) {
    return 'カメラを使用中のため起動できません。';
  }
  return 'カメラの起動に失敗しました。';
}

export default function MateInviteQrScanner({ onSuccess, onClose }) {
  const { toast } = useUiFeedback();
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  useEffect(() => {
    let active = true;
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    const handleScan = (decodedText) => {
      if (handledRef.current) return;
      const token = parseMateInviteToken(decodedText);
      if (!token) {
        toast.error('招待QRではありません');
        return;
      }
      handledRef.current = true;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          onSuccess(token);
        });
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      )
      .catch((err) => {
        if (!active) return;
        toast.error(cameraErrorMessage(err));
        onClose?.();
      });

    return () => {
      active = false;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (!instance) return;
      instance
        .stop()
        .then(() => instance.clear())
        .catch(() => instance.clear().catch(() => {}));
    };
  }, [onSuccess, onClose, toast]);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-tsure-muted text-center">
        相手の招待QRを枠内に合わせてください
      </p>
      <div
        id={SCANNER_ELEMENT_ID}
        className="w-full max-w-sm overflow-hidden rounded-xl bg-black"
      />
    </div>
  );
}
