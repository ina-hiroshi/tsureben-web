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

async function releaseScanner(instance, shouldStop) {
  if (!instance) return;
  if (shouldStop) {
    try {
      await instance.stop();
    } catch {
      // stop() は未起動時に同期 throw することがある
    }
  }
  try {
    await instance.clear();
  } catch {
    // clear 失敗は握りつぶす
  }
}

export default function MateInviteQrScanner({ onSuccess, onClose }) {
  const { toast } = useUiFeedback();
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  // 最新のコールバックを ref で保持し、初期化エフェクトの依存から外す。
  // これにより親の再レンダリングでスキャナーが再起動（ちらつき）しなくなる。
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);
  const toastRef = useRef(toast);
  onSuccessRef.current = onSuccess;
  onCloseRef.current = onClose;
  toastRef.current = toast;

  useEffect(() => {
    let active = true;
    let started = false;
    let released = false;
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    const releaseOnce = (shouldStop) => {
      if (released) return Promise.resolve();
      released = true;
      if (shouldStop) started = false;
      return releaseScanner(scanner, shouldStop);
    };

    const handleScan = (decodedText) => {
      if (handledRef.current) return;
      const token = parseMateInviteToken(decodedText);
      if (!token) {
        toastRef.current.error('招待QRではありません');
        return;
      }
      handledRef.current = true;
      releaseOnce(true).finally(() => {
        onSuccessRef.current(token);
      });
    };

    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      )
      .then(() => {
        started = true;
      })
      .catch((err) => {
        if (!active) return;
        toastRef.current.error(cameraErrorMessage(err));
        onCloseRef.current?.();
      });

    return () => {
      active = false;
      scannerRef.current = null;
      if (started) {
        releaseOnce(true);
        return;
      }
      startPromise.finally(() => {
        releaseOnce(started);
      });
    };
    // マウント時に一度だけ初期化する（コールバックは ref 経由で最新を参照）
  }, []);

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
