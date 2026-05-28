import { useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { getSubjectList } from '../../constants/subjects';
import {
  addBook,
  addTopic,
  deleteBook,
  deleteTopic,
  renameBook,
  renameTopic,
} from '../../services/firestore/userService';
import { useUiFeedback } from '../../contexts/UiFeedbackContext';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import AppIcon from '../ui/AppIcon';

export default function SubjectCatalogPanel({ email, catalog, onCatalogChange }) {
  const { confirm, toast } = useUiFeedback();
  const subjects = useMemo(() => getSubjectList(catalog), [catalog]);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || '国語');
  const [modal, setModal] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const activeSubject = subjects.includes(selectedSubject) ? selectedSubject : subjects[0];
  const topics = catalog[activeSubject] || {};
  const topicNames = Object.keys(topics);
  const hasAnyCatalog = Object.keys(catalog).some(
    (subject) => Object.keys(catalog[subject] || {}).length > 0
  );

  const openAddModal = (type, topicName = '') => {
    setModal({ type, mode: 'add', topicName });
    setInputValue('');
  };

  const openEditModal = (type, name, topicName = '') => {
    setModal({ type, mode: 'edit', name, topicName });
    setInputValue(name);
  };

  const closeModal = () => {
    setModal(null);
    setInputValue('');
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      toast.warning('名前を入力してください');
      return;
    }
    setSaving(true);
    try {
      let next = null;
      if (modal.mode === 'add') {
        if (modal.type === 'topic') {
          if (topics[trimmed]) {
            toast.warning('同じ科目名が既にあります');
            return;
          }
          next = await addTopic(email, activeSubject, trimmed);
        } else {
          const books = topics[modal.topicName] || [];
          if (books.includes(trimmed)) {
            toast.warning('同じ問題集名が既にあります');
            return;
          }
          next = await addBook(email, activeSubject, modal.topicName, trimmed);
        }
      } else if (modal.type === 'topic') {
        if (trimmed !== modal.name && topics[trimmed]) {
          toast.warning('同じ科目名が既にあります');
          return;
        }
        next = await renameTopic(email, activeSubject, modal.name, trimmed);
      } else {
        const books = topics[modal.topicName] || [];
        if (trimmed !== modal.name && books.includes(trimmed)) {
          toast.warning('同じ問題集名が既にあります');
          return;
        }
        next = await renameBook(email, activeSubject, modal.topicName, modal.name, trimmed);
      }
      if (next) onCatalogChange(next);
      toast.success('保存しました');
      closeModal();
    } catch (err) {
      toast.error(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (topic) => {
    const ok = await confirm({
      title: '科目を削除',
      message: `「${topic}」とその問題集の候補を削除します。\n過去の計画・記録は変更されません。`,
      confirmText: '削除',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const next = await deleteTopic(email, activeSubject, topic);
      if (next) onCatalogChange(next);
      toast.success('削除しました');
    } catch (err) {
      toast.error(err.message || '削除に失敗しました');
    }
  };

  const handleDeleteBook = async (topic, book) => {
    const ok = await confirm({
      title: '問題集を削除',
      message: `「${book}」の候補を削除します。\n過去の計画・記録は変更されません。`,
      confirmText: '削除',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const next = await deleteBook(email, activeSubject, topic, book);
      if (next) onCatalogChange(next);
      toast.success('削除しました');
    } catch (err) {
      toast.error(err.message || '削除に失敗しました');
    }
  };

  const modalTitle =
    modal?.mode === 'add'
      ? modal.type === 'topic'
        ? '科目を追加'
        : '問題集を追加'
      : modal?.type === 'topic'
        ? '科目名を変更'
        : '問題集名を変更';

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {subjects.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => setSelectedSubject(subject)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold min-h-touch transition ${
              activeSubject === subject
                ? 'bg-tsure-primary text-tsure-on-primary shadow-tsure-chip'
                : 'bg-white border border-tsure-border text-tsure-primary hover:bg-tsure-surface-hover'
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      {!hasAnyCatalog && topicNames.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="候補がまだありません"
          description="科目や問題集を追加するか、学習記録を追加すると候補が自動で増えます。"
          compact
        />
      ) : topicNames.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={`${activeSubject}の候補がありません`}
          description="科目を追加して、よく使う問題集を登録しましょう。"
          compact
          action={
            <Button size="sm" onClick={() => openAddModal('topic')}>
              科目を追加
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {topicNames.map((topic) => (
            <li
              key={topic}
              className="rounded-xl border border-tsure-border bg-white/60 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-tsure-surface-hover/50">
                <span className="font-semibold text-tsure-primary truncate">{topic}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal('topic', topic)}
                    className="p-2 rounded-lg text-tsure-muted hover:text-tsure-primary hover:bg-white min-h-touch min-w-touch inline-flex items-center justify-center"
                    aria-label={`${topic}を編集`}
                  >
                    <AppIcon icon={Pencil} size="sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTopic(topic)}
                    className="p-2 rounded-lg text-tsure-muted hover:text-red-700 hover:bg-white min-h-touch min-w-touch inline-flex items-center justify-center"
                    aria-label={`${topic}を削除`}
                  >
                    <AppIcon icon={Trash2} size="sm" />
                  </button>
                </div>
              </div>
              {(topics[topic] || []).length > 0 ? (
                <ul className="divide-y divide-tsure-border/60">
                  {(topics[topic] || []).map((book) => (
                    <li
                      key={book}
                      className="flex items-center justify-between gap-2 px-3 py-2 pl-6 text-sm text-tsure-primary"
                    >
                      <span className="truncate">{book}</span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal('book', book, topic)}
                          className="p-2 rounded-lg text-tsure-muted hover:text-tsure-primary hover:bg-tsure-surface-hover min-h-touch min-w-touch inline-flex items-center justify-center"
                          aria-label={`${book}を編集`}
                        >
                          <AppIcon icon={Pencil} size="sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(topic, book)}
                          className="p-2 rounded-lg text-tsure-muted hover:text-red-700 hover:bg-tsure-surface-hover min-h-touch min-w-touch inline-flex items-center justify-center"
                          aria-label={`${book}を削除`}
                        >
                          <AppIcon icon={Trash2} size="sm" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 pl-6 text-xs text-tsure-muted">問題集の候補なし</p>
              )}
              <div className="px-3 py-2 border-t border-tsure-border/60">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="inline-flex items-center gap-1.5"
                  onClick={() => openAddModal('book', topic)}
                >
                  <AppIcon icon={Plus} size="sm" />
                  問題集を追加
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {topicNames.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4 inline-flex items-center gap-1.5"
          onClick={() => openAddModal('topic')}
        >
          <AppIcon icon={Plus} size="sm" />
          科目を追加
        </Button>
      )}

      <Modal open={!!modal} onClose={closeModal} title={modalTitle}>
        <form onSubmit={handleSaveModal} className="space-y-4">
          <Input
            label={modal?.type === 'topic' ? '科目名' : '問題集名'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            required
          />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
