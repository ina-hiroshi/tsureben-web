import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import SuggestInput from './ui/SuggestInput';
import { saveEntry } from '../services/firestore/planService';
import { updateSubjectCatalog } from '../services/firestore/logService';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { SUBJECTS } from '../constants/subjects';

export default function TimeInputDialog({
  open,
  onClose,
  email,
  dateKey,
  entry,
  subjectCatalog = {},
  onSaved,
  onDelete,
}) {
  const { toast } = useUiFeedback();
  const [form, setForm] = useState({
    start: '09:00',
    end: '10:00',
    subject: '',
    topic: '',
    book: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setForm({
        start: entry.start || '09:00',
        end: entry.end || '10:00',
        subject: entry.subject || '',
        topic: entry.topic || '',
        book: entry.book || '',
        content: entry.content || '',
      });
    } else {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const defaultTime = `${h}:00`;
      setForm({
        start: defaultTime,
        end: defaultTime,
        subject: '',
        topic: '',
        book: '',
        content: '',
      });
    }
  }, [open, entry]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleStartChange = (e) => {
    const newStart = e.target.value;
    setForm((f) => ({
      ...f,
      start: newStart,
      end: f.end === f.start ? newStart : f.end,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.topic) {
      toast.warning('教科と科目は必須です');
      return;
    }
    setSaving(true);
    try {
      await saveEntry(email, dateKey, form, entry?.id);
      await updateSubjectCatalog(email, form);
      toast.success('保存しました');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={entry ? '計画を編集' : '計画を追加'}>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Input label="開始" type="time" value={form.start} onChange={handleStartChange} required />
          <Input label="終了" type="time" value={form.end} onChange={set('end')} required />
        </div>
        <SuggestInput label="教科 *" value={form.subject} onChange={(v) => setForm((f) => ({ ...f, subject: v }))} suggestions={SUBJECTS} />
        <SuggestInput
          label="科目 *"
          value={form.topic}
          onChange={(v) => setForm((f) => ({ ...f, topic: v }))}
          suggestions={Object.keys(subjectCatalog[form.subject] || {})}
        />
        <SuggestInput
          label="問題集"
          value={form.book}
          onChange={(v) => setForm((f) => ({ ...f, book: v }))}
          suggestions={(subjectCatalog[form.subject]?.[form.topic] || [])}
        />
        <Input label="内容" value={form.content} onChange={set('content')} />
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
        {onDelete && (
          <Button type="button" variant="danger" className="w-full" onClick={onDelete}>
            削除
          </Button>
        )}
      </form>
    </Modal>
  );
}
