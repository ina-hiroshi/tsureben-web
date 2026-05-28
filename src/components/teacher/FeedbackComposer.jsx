import { useState } from 'react';
import { Send } from 'lucide-react';
import Button from '../ui/Button';
import AppIcon from '../ui/AppIcon';

export default function FeedbackComposer({
  placeholder = 'コメントを入力...',
  submitLabel = '送信',
  disabled = false,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled || submitting}
        className="w-full rounded-xl border border-tsure-border bg-tsure-surface px-3 py-2 text-sm text-tsure-primary placeholder:text-tsure-muted resize-y min-h-[4.5rem] disabled:opacity-50"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={disabled || submitting || !body.trim()}
          className="inline-flex items-center gap-1.5"
        >
          <AppIcon icon={Send} size="sm" />
          {submitting ? '送信中...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
