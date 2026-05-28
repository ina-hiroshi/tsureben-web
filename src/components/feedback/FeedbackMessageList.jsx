import { useState } from 'react';
import dayjs from 'dayjs';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import AppIcon from '../ui/AppIcon';
import Button from '../ui/Button';

function formatTimestamp(value) {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dayjs(date).format('M/D HH:mm');
}

function formatMessageTime(message) {
  const ts = message.updatedAt || message.createdAt;
  const label = formatTimestamp(ts);
  return message.updatedAt ? `${label}（編集済）` : label;
}

export default function FeedbackMessageList({
  messages = [],
  currentUserEmail,
  onEditMessage,
  onDeleteMessage,
  busyMessageId = null,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');

  const startEdit = (message) => {
    setEditingId(message.id);
    setEditBody(message.body || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody('');
  };

  const saveEdit = async (messageId) => {
    const trimmed = editBody.trim();
    if (!trimmed || !onEditMessage) return;
    const ok = await onEditMessage(messageId, trimmed);
    if (ok !== false) cancelEdit();
  };

  if (!messages.length) {
    return (
      <p className="text-sm text-tsure-muted text-center py-6">
        まだメッセージはありません
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((message) => {
        const isOwn = message.authorEmail === currentUserEmail;
        const isTeacher = message.authorRole === 'teacher';
        const isEditing = editingId === message.id;
        const isBusy = busyMessageId === message.id;

        return (
          <li
            key={message.id}
            className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[85%] rounded-2xl px-3 py-2.5 border bg-white border-tsure-border text-tsure-primary">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                <span className="text-xs font-semibold">
                  {message.authorName || (isTeacher ? '教員' : '生徒')}
                </span>
                <span className="text-[11px] text-tsure-muted tabular-nums">
                  {formatMessageTime(message)}
                </span>
                {isTeacher && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-tsure-primary/10 text-tsure-primary">
                    教員
                  </span>
                )}
                {isOwn && !isEditing && onEditMessage && onDeleteMessage && (
                  <span className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => startEdit(message)}
                      disabled={Boolean(busyMessageId)}
                      className="min-w-8 min-h-8 flex items-center justify-center rounded-md text-tsure-muted hover:text-tsure-primary hover:bg-tsure-surface-hover disabled:opacity-50"
                      aria-label="コメントを編集"
                    >
                      <AppIcon icon={Pencil} size="sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(message)}
                      disabled={Boolean(busyMessageId)}
                      className="min-w-8 min-h-8 flex items-center justify-center rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-50"
                      aria-label="コメントを削除"
                    >
                      <AppIcon icon={Trash2} size="sm" />
                    </button>
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    disabled={isBusy}
                    className="w-full rounded-lg border border-tsure-border bg-white px-2.5 py-2 text-sm text-tsure-primary resize-y min-h-[4rem] disabled:opacity-50"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1"
                    >
                      <AppIcon icon={X} size="sm" />
                      キャンセル
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveEdit(message.id)}
                      disabled={isBusy || !editBody.trim()}
                      className="inline-flex items-center gap-1"
                    >
                      <AppIcon icon={Check} size="sm" />
                      {isBusy ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
