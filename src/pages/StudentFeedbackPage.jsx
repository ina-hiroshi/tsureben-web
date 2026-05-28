import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/firestore/userService';
import { subscribeThreads } from '../services/firestore/feedbackService';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import PageLayout from '../components/ui/PageLayout';
import SectionTitle from '../components/ui/SectionTitle';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import FeedbackThreadPanel from '../components/teacher/FeedbackThreadPanel';
import { FEEDBACK_EMPTY } from '../content/emptyStatePresets';

function formatThreadLabel(thread) {
  if (thread.scope === 'daily' && thread.dateKey) {
    return dayjs(thread.dateKey).format('M月D日の学習');
  }
  return thread.title || '全体のフィードバック';
}

export default function StudentFeedbackPage() {
  const { email } = useAuth();
  const { toast } = useUiFeedback();
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
    if (!selectedThread || !threads.find((t) => t.id === selectedThread.id)) {
      setSelectedThread(threads[0]);
    }
  }, [threads, selectedThread]);

  if (loading) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  return (
    <PageLayout>
      <div className="pb-8 space-y-4">
        <SectionTitle onDark>先生からのコメント</SectionTitle>

        {threads.length === 0 ? (
          <Card className="!p-4">
            <EmptyState {...FEEDBACK_EMPTY} />
          </Card>
        ) : (
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-4">
            <Card className="!p-2 lg:sticky lg:top-4">
              <ul className="divide-y divide-tsure-border max-h-[min(24rem,50vh)] lg:max-h-[calc(100dvh-8rem)] overflow-y-auto">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full text-left px-3 py-3 transition hover:bg-tsure-surface-hover rounded-lg ${
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
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="!p-4 md:!p-6">
              {selectedThread && profile && (
                <StudentFeedbackDetail
                  profile={profile}
                  selectedThread={selectedThread}
                  email={email}
                />
              )}
            </Card>
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
    />
  );
}
