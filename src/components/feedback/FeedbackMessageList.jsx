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
      <p className="text-sm text-tsure-muted text-center py-8">
        まだメッセージはありません
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {messages.map((message, index) => {
        const isOwn = message.authorEmail === currentUserEmail;
        const isTeacher = message.authorRole === 'teacher';
        const isEditing = editingId === message.id;
        const isBusy = busyMessageId === message.id;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showAuthor =
          !prevMessage || prevMessage.authorEmail !== message.authorEmail;
        const authorLabel =
          message.authorName || (isTeacher ? '先生' : '生徒');

        return (
          <li
            key={message.id}
            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
          >
            {showAuthor && (
              <div
                className={`flex items-center gap-1.5 mb-1 px-1 ${
                  isOwn ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <span className="text-xs font-semibold text-tsure-primary">
                  {authorLabel}
                </span>
                {isTeacher && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tsure-accent/20 text-tsure-primary font-medium">
                    先生
                  </span>
                )}
              </div>
            )}

            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                isOwn
                  ? 'bg-tsure-primary text-tsure-on-primary rounded-br-md'
                  : 'bg-white border border-tsure-border text-tsure-primary rounded-bl-md'
              }`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    disabled={isBusy}
                    className="w-full rounded-lg border border-tsure-border bg-white px-2.5 py-2 text-base sm:text-sm text-tsure-primary resize-y min-h-[4rem] disabled:opacity-50"
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
                <>
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.body}
                  </p>
                  {isOwn && onEditMessage && onDeleteMessage && (
                    <div className="flex justify-end gap-0.5 mt-1.5 -mr-1">
                      <button
                        type="button"
                        onClick={() => startEdit(message)}
                        disabled={Boolean(busyMessageId)}
                        className={`min-w-7 min-h-7 flex items-center justify-center rounded-md disabled:opacity-50 ${
                          isOwn
                            ? 'text-tsure-on-primary/70 hover:text-tsure-on-primary hover:bg-white/10'
                            : 'text-tsure-muted hover:text-tsure-primary hover:bg-tsure-surface-hover'
                        }`}
                        aria-label="コメントを編集"
                      >
                        <AppIcon icon={Pencil} size="sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(message)}
                        disabled={Boolean(busyMessageId)}
                        className={`min-w-7 min-h-7 flex items-center justify-center rounded-md disabled:opacity-50 ${
                          isOwn
                            ? 'text-red-200 hover:text-white hover:bg-red-500/30'
                            : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                        }`}
                        aria-label="コメントを削除"
                      >
                        <AppIcon icon={Trash2} size="sm" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <span
              className={`text-[11px] text-tsure-muted tabular-nums mt-1 px-1 ${
                isOwn ? 'text-right' : 'text-left'
              }`}
            >
              {formatMessageTime(message)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
