import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/firestore/userService';
import { subscribeThreads } from '../services/firestore/feedbackService';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import PageLayout from '../components/ui/PageLayout';
import SectionTitle from '../components/ui/SectionTitle';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import AppIcon from '../components/ui/AppIcon';
import FeedbackThreadPanel from '../components/teacher/FeedbackThreadPanel';
import { FEEDBACK_EMPTY } from '../content/emptyStatePresets';

function formatThreadLabel(thread) {
  if (thread.scope === 'daily' && thread.dateKey) {
    return dayjs(thread.dateKey).format('M月D日の学習');
  }
  return thread.title || '全体のフィードバック';
}

function formatThreadTime(thread) {
  const ts = thread.lastMessageAt;
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  return dayjs(date).format('M/D HH:mm');
}

function formatPreview(thread) {
  const text = (thread.lastMessagePreview || '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 60 ? `${text.slice(0, 60)}…` : text;
  if (thread.scope === 'daily' && thread.title) return thread.title;
  return 'コメントを確認';
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (event) => setIsDesktop(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

export default function StudentFeedbackPage() {
  const { email } = useAuth();
  const { toast } = useUiFeedback();
  const isDesktop = useIsDesktop();
  const [profile, setProfile] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;
    getProfile(email).then(setProfile);
  }, [email]);

  useEffect(() => {
    if (!email) return undefined;

    setLoading(true);
    const unsub = subscribeThreads(
      email,
      {},
      (list) => {
        setThreads(list);
        setLoading(false);
      },
      (err) => {
        console.error('subscribeThreads error:', err);
        toast.error('フィードバックの読み込みに失敗しました');
        setLoading(false);
      }
    );
    return unsub;
  }, [email, toast]);

  useEffect(() => {
    if (threads.length === 0) {
      setSelectedThread(null);
      return;
    }
    if (!isDesktop) return;
    if (!selectedThread || !threads.find((t) => t.id === selectedThread.id)) {
      setSelectedThread(threads[0]);
    }
  }, [threads, selectedThread, isDesktop]);

  if (loading) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  const showMobileList = !isDesktop && !selectedThread;
  const showMobileDetail = !isDesktop && selectedThread;

  return (
    <PageLayout>
      <div className="pb-8 space-y-4">
        {showMobileDetail ? (
          <div className="flex items-center gap-2 -mx-1">
            <button
              type="button"
              onClick={() => setSelectedThread(null)}
              className="inline-flex items-center gap-1 min-h-touch px-2 py-1 rounded-lg text-tsure-on-primary hover:bg-white/10 transition"
            >
              <AppIcon icon={ChevronLeft} size="md" />
              <span className="text-sm font-semibold">一覧へ戻る</span>
            </button>
          </div>
        ) : (
          <SectionTitle onDark>先生からのコメント</SectionTitle>
        )}

        {threads.length === 0 ? (
          <Card className="!p-4">
            <EmptyState {...FEEDBACK_EMPTY} />
          </Card>
        ) : showMobileList ? (
          <Card className="!p-0 overflow-hidden">
            <ul className="divide-y divide-tsure-border">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedThread(thread)}
                    className="w-full text-left px-4 py-3.5 transition hover:bg-tsure-surface-hover active:bg-tsure-surface-hover"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-tsure-primary truncate">
                          {formatThreadLabel(thread)}
                        </p>
                        {thread.createdByName && (
                          <p className="text-xs text-tsure-muted mt-0.5">
                            {thread.createdByName} 先生
                          </p>
                        )}
                        <p className="text-sm text-tsure-muted mt-1 line-clamp-2 leading-snug">
                          {formatPreview(thread)}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                        {thread.unreadByStudent && (
                          <span className="w-2.5 h-2.5 rounded-full bg-tsure-accent" />
                        )}
                        <span className="text-[11px] text-tsure-muted tabular-nums">
                          {formatThreadTime(thread)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-4">
            {isDesktop && (
              <Card className="!p-0 lg:sticky lg:top-4 overflow-hidden">
                <ul className="divide-y divide-tsure-border max-h-[calc(100dvh-8rem)] overflow-y-auto">
                  {threads.map((thread) => (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedThread(thread)}
                        className={`w-full text-left px-3 py-3 transition hover:bg-tsure-surface-hover ${
                          selectedThread?.id === thread.id ? 'bg-tsure-surface-hover' : ''
                        }`}
                      >
                        <p className="text-sm font-semibold text-tsure-primary flex items-center gap-2">
                          {formatThreadLabel(thread)}
                          {thread.unreadByStudent && (
                            <span className="w-2 h-2 rounded-full bg-tsure-accent shrink-0" />
                          )}
                        </p>
                        {thread.createdByName && (
                          <p className="text-xs text-tsure-muted mt-0.5">
                            {thread.createdByName} 先生
                          </p>
                        )}
                        <p className="text-xs text-tsure-muted mt-1 line-clamp-1">
                          {formatPreview(thread)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {(isDesktop || showMobileDetail) && selectedThread && profile && (
              <Card className="!p-0 md:!p-0 overflow-hidden flex flex-col">
                {showMobileDetail && (
                  <div className="px-4 pt-4 pb-2 border-b border-tsure-border shrink-0">
                    <h2 className="text-base font-bold text-tsure-primary">
                      {formatThreadLabel(selectedThread)}
                    </h2>
                    {selectedThread.createdByName && (
                      <p className="text-xs text-tsure-muted mt-0.5">
                        {selectedThread.createdByName} 先生
                      </p>
                    )}
                  </div>
                )}
                <div className="p-4 md:p-6 flex flex-col min-h-0 flex-1">
                  <StudentFeedbackDetail
                    profile={profile}
                    selectedThread={selectedThread}
                    email={email}
                  />
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function StudentFeedbackDetail({ profile, selectedThread, email }) {
  return (
    <FeedbackThreadPanel
      key={selectedThread.id}
      student={profile}
      schoolId={profile?.schoolId}
      dateKey={selectedThread.dateKey || dayjs().format('YYYY-MM-DD')}
      teacherName={profile?.name || email}
      mode="student"
      initialThreadId={selectedThread.id}
      flatLayout
    />
  );
}
