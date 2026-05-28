import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import SuggestInput from './ui/SuggestInput';
import { SUBJECTS } from '../constants/subjects';

export default function StudyContentModal({
  open,
  mode = 'create',
  initial = {},
  subjectCatalog = {},
  onSave,
  onClose,
}) {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [book, setBook] = useState('');
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState('');
  const [startTime, setStartTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(initial.subject || '');
    setTopic(initial.topic || '');
    setBook(initial.book || '');
    setContent(initial.content || '');
    setDuration(initial.duration != null ? String(initial.duration) : '');
    setStartTime(initial.startTime || '');
  }, [open, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !topic.trim()) return;
    if (mode === 'manual' && (!duration || Number(duration) < 1)) return;
    setSaving(true);
    try {
      const saved = await onSave({
        subject: subject.trim(),
        topic: topic.trim(),
        book: book.trim(),
        content: content.trim(),
        duration: duration ? Number(duration) : initial.duration,
        startTime: mode === 'manual' || mode === 'edit' ? startTime.trim() : initial.startTime,
      });
      if (saved !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  const title =
    mode === 'edit'
      ? '学習記録を編集'
      : mode === 'manual'
        ? '計測漏れを追加'
        : '学習内容を登録';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'manual' && (
          <p className="text-sm text-tsure-muted leading-relaxed">
            タイマーで記録できなかった学習を、選択中の日付に追加できます。
          </p>
        )}
        <SuggestInput
          label="教科 *"
          value={subject}
          onChange={setSubject}
          suggestions={SUBJECTS}
        />
        <SuggestInput
          label="科目 *"
          value={topic}
          onChange={setTopic}
          suggestions={Object.keys(subjectCatalog[subject] || {})}
        />
        <SuggestInput
          label="問題集"
          value={book}
          onChange={setBook}
          suggestions={(subjectCatalog[subject]?.[topic] || [])}
        />
        <Input
          label="学習内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {(mode === 'manual' || mode === 'edit') && (
          <Input
            label="開始時刻（任意）"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        )}
        {(mode === 'edit' || mode === 'manual' || initial.showDuration) && (
          <Input
            label="学習時間（分）"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required={mode === 'edit' || mode === 'manual'}
          />
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" variant="primary" size="lg" disabled={saving} className="w-full">
            {saving ? '保存中…' : '保存'}
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            キャンセル
          </Button>
        </div>
      </form>
    </Modal>
  );
}
