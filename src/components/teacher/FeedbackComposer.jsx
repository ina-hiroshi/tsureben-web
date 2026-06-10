import { useState } from 'react';
import { Send } from 'lucide-react';
import Button from '../ui/Button';
import AppIcon from '../ui/AppIcon';

export default function FeedbackComposer({
  placeholder = 'コメントを入力...',
  submitLabel = '送信',
  disabled = false,
  showDisclaimer = true,
  onSubmit,
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting || disabled) return;

    setSubmitting(true);
    try {
      const ok = await onSubmit(trimmed);
      if (ok !== false) setBody('');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !disabled && !submitting && !!body.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {showDisclaimer && (
        <p className="text-xs text-tsure-muted leading-relaxed rounded-lg border border-tsure-border/80 bg-[#faf6f0] px-3 py-2">
          このコメントは学校管理者が確認できる場合があります。生徒への指導目的でご利用ください。
          削除したコメントも、学校管理者の履歴には残ります。
        </p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled || submitting}
        className="w-full rounded-xl border border-tsure-border bg-white px-3 py-2 text-base sm:text-sm text-tsure-primary placeholder:text-tsure-muted resize-y min-h-[4.5rem] disabled:opacity-50"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          variant={canSubmit ? 'surface' : 'primary'}
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5"
        >
          <AppIcon icon={Send} size="sm" />
          {submitting ? '送信中...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
