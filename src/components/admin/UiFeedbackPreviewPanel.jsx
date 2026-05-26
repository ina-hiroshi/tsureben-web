import { useUiFeedback } from '../../contexts/UiFeedbackContext';

export default function UiFeedbackPreviewPanel() {
  const { toast, confirm } = useUiFeedback();

  const handleConfirmPreview = async () => {
    const ok = await confirm({
      title: '確認モーダル（通常）',
      message: 'この操作を実行しますか？\nキャンセルまたは OK を選んでください。',
      confirmText: 'OK',
      cancelText: 'キャンセル',
    });
    if (ok) {
      toast.success('確認モーダルで OK が選択されました');
    } else {
      toast.info('確認モーダルでキャンセルされました');
    }
  };

  const handleConfirmDangerPreview = async () => {
    const ok = await confirm({
      title: '確認モーダル（削除）',
      message: 'このデータを削除します。\nこの操作は取り消せません。',
      confirmText: '削除',
      cancelText: 'キャンセル',
      tone: 'danger',
    });
    if (ok) {
      toast.success('削除が確認されました（プレビュー）');
    } else {
      toast.info('削除はキャンセルされました');
    }
  };

  return (
    <div className="border border-[#c4b5a0] rounded-xl p-4 space-y-4 bg-white/50">
      <div>
        <h3 className="font-semibold text-[#5a3e28]">UI プレビュー</h3>
        <p className="text-sm text-gray-600 mt-1">
          共通トースト（画面中央）と確認モーダルの見た目・動作を確認できます。
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#5a3e28] mb-2">トースト</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toast.success('操作が正常に完了しました')}
            className="bg-[#5a3e28] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#7a5639]"
          >
            成功
          </button>
          <button
            type="button"
            onClick={() => toast.error('処理中にエラーが発生しました')}
            className="bg-[#9c4a3a] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#b85a48]"
          >
            エラー
          </button>
          <button
            type="button"
            onClick={() => toast.warning('入力内容を確認してください')}
            className="bg-[#b8860b] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#c9971c]"
          >
            警告
          </button>
          <button
            type="button"
            onClick={() => toast.info('操作はキャンセルされました')}
            className="bg-[#726256] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#85756a]"
          >
            情報
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#5a3e28] mb-2">確認モーダル</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirmPreview}
            className="border border-[#5a3e28] text-[#5a3e28] px-3 py-2 rounded-lg text-sm hover:bg-[#f5ebe0]"
          >
            通常確認
          </button>
          <button
            type="button"
            onClick={handleConfirmDangerPreview}
            className="border border-[#9c4a3a] text-[#9c4a3a] px-3 py-2 rounded-lg text-sm hover:bg-[#fdf0ed]"
          >
            削除確認（danger）
          </button>
        </div>
      </div>
    </div>
  );
}
