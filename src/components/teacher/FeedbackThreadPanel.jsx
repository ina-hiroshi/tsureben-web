import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { useUiFeedback } from '../../contexts/UiFeedbackContext';
import {
  subscribeThreads,
  subscribeMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  markThreadRead,
  getOrCreateDailyThread,
  createGeneralThread,
} from '../../services/firestore/feedbackService';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import FeedbackMessageList from '../feedback/FeedbackMessageList';
import FeedbackComposer from './FeedbackComposer';
import { FEEDBACK_THREAD_EMPTY } from '../../content/emptyStatePresets';
import { isDemoTeacherReviewEmail } from '../../dev/demoTeacherReview';
import { useDemoSettingsRevision } from '../../hooks/useDemoSettings';

function formatThreadLabel(thread) {
  if (thread.scope === 'daily' && thread.dateKey) {
    return dayjs(thread.dateKey).format('M月D日');
  }
  return thread.title || '全体';
}

export default function FeedbackThreadPanel({
  student,
  schoolId,
  dateKey,
  teacherName,
  mode = 'teacher',
  initialThreadId = null,
  onDark = false,
}) {
  const { email } = useAuth();
  const { toast, confirm } = useUiFeedback();
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [busyMessageId, setBusyMessageId] = useState(null);

  const studentEmail = student?.email;
  const isTeacher = mode === 'teacher';
  const demoRevision = useDemoSettingsRevision();

  useEffect(() => {
    if (!studentEmail) {
      setThreads([]);
      setLoadingThreads(false);
      return undefined;
    }

    setLoadingThreads(true);
    const unsub = subscribeThreads(
      studentEmail,
      {},
      (list) => {
        setThreads(list);
        setLoadingThreads(false);
      },
      (err) => {
        console.error('subscribeThreads error:', err);
        toast.error('フィードバックの読み込みに失敗しました');
        setLoadingThreads(false);
      }
    );
    return unsub;
  }, [studentEmail, toast, demoRevision]);

  const dailyThread = useMemo(
    () => threads.find((t) => t.scope === 'daily' && t.dateKey === dateKey) || null,
    [threads, dateKey]
  );

  const generalThreads = useMemo(
    () => threads.filter((t) => t.scope === 'general'),
    [threads]
  );

  useEffect(() => {
    if (initialThreadId && threads.some((t) => t.id === initialThreadId)) {
      setSelectedThreadId(initialThreadId);
      return;
    }
    if (dailyThread) {
      setSelectedThreadId(dailyThread.id);
      return;
    }
    if (generalThreads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(generalThreads[0].id);
    }
  }, [dailyThread, generalThreads, selectedThreadId, initialThreadId, threads]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return undefined;
    }

    const unsub = subscribeMessages(
      selectedThreadId,
      setMessages,
      (err) => {
        console.error('subscribeMessages error:', err);
        toast.error('メッセージの読み込みに失敗しました');
      }
    );
    return unsub;
  }, [selectedThreadId, toast, demoRevision]);

  useEffect(() => {
    if (!selectedThreadId) return;
    const readerRole = isTeacher ? 'teacher' : 'student';
    markThreadRead(selectedThreadId, readerRole).catch((err) => {
      console.error('markThreadRead error:', err);
    });
  }, [selectedThreadId, messages.length, isTeacher]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null;

  const inactiveThreadBtnClass = onDark
    ? 'bg-white/15 text-tsure-on-primary border-white/20 hover:bg-white/25'
    : 'bg-white text-tsure-primary border-tsure-border hover:bg-tsure-surface-hover';
  const activeThreadBtnClass =
    'bg-tsure-primary text-tsure-on-primary border-tsure-primary';

  const handleSend = async (body) => {
    if (!studentEmail) return false;
    if (isDemoTeacherReviewEmail(studentEmail)) {
      toast.info('開発用デモ生徒のため、コメントは保存されません');
      return true;
    }

    try {
      let threadId = selectedThreadId;

      if (!threadId && isTeacher) {
        threadId = await getOrCreateDailyThread({
          studentEmail,
          schoolId,
          dateKey,
          createdBy: email,
          createdByName: teacherName,
          title: `${dayjs(dateKey).format('M月D日')}の学習について`,
        });
        setSelectedThreadId(threadId);
      }

      if (!threadId) {
        toast.warning('スレッドが選択されていません');
        return false;
      }

      await addMessage(threadId, {
        authorEmail: email,
        authorRole: isTeacher ? 'teacher' : 'student',
        authorName: teacherName,
        body,
      });
      toast.success(isTeacher ? 'コメントを送信しました' : '返信を送信しました');
      return true;
    } catch (err) {
      toast.error(err.message || '送信に失敗しました');
      return false;
    }
  };

  const handleCreateGeneral = async (body) => {
    if (!isTeacher || !studentEmail) return false;
    if (isDemoTeacherReviewEmail(studentEmail)) {
      toast.info('開発用デモ生徒のため、コメントは保存されません');
      return true;
    }
    try {
      const threadId = await createGeneralThread({
        studentEmail,
        schoolId,
        createdBy: email,
        createdByName: teacherName,
        title: '全体のフィードバック',
        initialMessage: body,
      });
      setSelectedThreadId(threadId);
      toast.success('全体フィードバックを作成しました');
      return true;
    } catch (err) {
      toast.error(err.message || '作成に失敗しました');
      return false;
    }
  };

  const handleEditMessage = async (messageId, body) => {
    if (!selectedThreadId) return false;
    if (isDemoTeacherReviewEmail(studentEmail)) {
      toast.info('開発用デモ生徒のため、変更は保存されません');
      return true;
    }
    setBusyMessageId(messageId);
    try {
      await updateMessage(selectedThreadId, messageId, body);
      toast.success('コメントを更新しました');
      return true;
    } catch (err) {
      toast.error(err.message || '更新に失敗しました');
      return false;
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!selectedThreadId) return;
    if (isDemoTeacherReviewEmail(studentEmail)) {
      toast.info('開発用デモ生徒のため、削除は保存されません');
      return;
    }
    const ok = await confirm({
      title: 'コメントを削除',
      message: 'このコメントを削除しますか？',
      confirmText: '削除',
      tone: 'danger',
    });
    if (!ok) return;

    setBusyMessageId(message.id);
    try {
      await deleteMessage(selectedThreadId, message.id);
      toast.success('コメントを削除しました');
    } catch (err) {
      toast.error(err.message || '削除に失敗しました');
    } finally {
      setBusyMessageId(null);
    }
  };

  if (!studentEmail) {
    return (
      <EmptyState
        {...FEEDBACK_THREAD_EMPTY}
        title="生徒を選択してください"
        description="左の一覧から生徒を選ぶと、フィードバックを確認・送信できます。"
      />
    );
  }

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dailyThread && setSelectedThreadId(dailyThread.id)}
            className={`text-sm px-3 py-1.5 rounded-full border transition ${
              selectedThread?.scope === 'daily' && selectedThread?.dateKey === dateKey
                ? activeThreadBtnClass
                : inactiveThreadBtnClass
            }`}
          >
            {dayjs(dateKey).format('M/D')} の学習
            {dailyThread?.unreadByTeacher && (
              <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-tsure-accent align-middle" />
            )}
          </button>
          {generalThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedThreadId(thread.id)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                selectedThreadId === thread.id ? activeThreadBtnClass : inactiveThreadBtnClass
              }`}
            >
              {formatThreadLabel(thread)}
              {thread.unreadByTeacher && (
                <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-tsure-accent align-middle" />
              )}
            </button>
          ))}
        </div>
      )}

      {!isTeacher && threads.length > 1 && !initialThreadId && (
        <div className="flex flex-wrap gap-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedThreadId(thread.id)}
              className={`text-sm px-3 py-1.5 rounded-full border transition ${
                selectedThreadId === thread.id ? activeThreadBtnClass : inactiveThreadBtnClass
              }`}
            >
              {formatThreadLabel(thread)}
              {thread.unreadByStudent && (
                <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-tsure-accent align-middle" />
              )}
            </button>
          ))}
        </div>
      )}

      <Card className="!p-4">
        {loadingThreads ? (
          <p className="text-sm text-tsure-muted text-center py-6">読み込み中...</p>
        ) : selectedThread ? (
          <>
            <h3 className="text-sm font-bold text-tsure-primary mb-3">
              {formatThreadLabel(selectedThread)}
              {selectedThread.title && selectedThread.scope === 'daily' && (
                <span className="font-normal text-tsure-muted ml-2">— {selectedThread.title}</span>
              )}
            </h3>
            <FeedbackMessageList
              messages={messages}
              currentUserEmail={email}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              busyMessageId={busyMessageId}
            />
          </>
        ) : (
          <EmptyState {...FEEDBACK_THREAD_EMPTY} />
        )}
      </Card>

      {isTeacher ? (
        <div className="space-y-3">
          <FeedbackComposer
            placeholder={`${dayjs(dateKey).format('M月D日')}の学習についてコメント...`}
            submitLabel="コメントを送信"
            onSubmit={handleSend}
          />
          <details className="text-sm">
            <summary
              className={`cursor-pointer ${
                onDark
                  ? 'text-tsure-on-primary/70 hover:text-tsure-on-primary'
                  : 'text-tsure-muted hover:text-tsure-primary'
              }`}
            >
              日付に関係ない全体フィードバックを新規作成
            </summary>
            <div className="mt-2">
              <FeedbackComposer
                placeholder="全体についてのコメント..."
                submitLabel="全体フィードバックを作成"
                onSubmit={handleCreateGeneral}
              />
            </div>
          </details>
        </div>
      ) : (
        selectedThread && (
          <FeedbackComposer
            placeholder="返信を入力..."
            submitLabel="返信する"
            onSubmit={handleSend}
          />
        )
      )}
    </div>
  );
}
