import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { getDayPlans } from '../services/firestore/planService';
import { getDayLogs } from '../services/firestore/logService';
import { subscribeUnreadCountForStudent } from '../services/firestore/feedbackService';
import { loadMateProfiles, acceptRequest } from '../services/firestore/mateService';
import { subscribeMateSessions } from '../services/firestore/presenceService';
import { flattenDayPlans } from '../utils/planUtils';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import NavCard from '../components/ui/NavCard';
import PlanCardList from '../components/PlanCardList';
import StudyPresenceGrid from '../components/StudyPresenceGrid';
import TodayStudySummary from '../components/TodayStudySummary';
import MateList from '../components/MateList';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import { NAV_CARD_ICONS } from '../utils/navIcons';
import { ChevronRight } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { isDemoMateEmail } from '../dev/demoMate';
import { shouldUseDemoStudyData, getDemoStudyDayData } from '../dev/demoStudyData';
import { useDemoSettingsRevision } from '../hooks/useDemoSettings';
import { HOME_PLAN_EMPTY } from '../content/emptyStatePresets';

export default function Home() {
  const { email } = useAuth();
  const { isTeacher, loading: teacherLoading } = useTeacherStatus();
  const { toast } = useUiFeedback();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [todayLog, setTodayLog] = useState({ totalMinutes: 0, entries: [] });
  const [activeMates, setActiveMates] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);

  const dateKey = dayjs().format('YYYY-MM-DD');
  const demoRevision = useDemoSettingsRevision();

  useEffect(() => {
    if (!email) return;
    let unsub = () => {};

    const load = async () => {
      setLoading(true);
      try {
        const [dayPlans, dayLogs, mateState] = await Promise.all([
          shouldUseDemoStudyData(email)
            ? Promise.resolve({ entries: getDemoStudyDayData(email, dateKey).plans })
            : getDayPlans(email, dateKey),
          shouldUseDemoStudyData(email)
            ? Promise.resolve(getDemoStudyDayData(email, dateKey).dayLogs)
            : getDayLogs(email, dateKey),
          loadMateProfiles(email),
        ]);

        setPlans(flattenDayPlans(dayPlans));
        setTodayLog({
          totalMinutes: dayLogs.totalMinutes || 0,
          entries: dayLogs.entries || [],
        });

        const hidden = mateState.hiddenRequests || [];
        const received = (mateState.pendingReceived || []).filter((e) => !hidden.includes(e));
        setPendingReceived(
          received.map((e) => mateState.profiles[e]).filter(Boolean)
        );

        unsub = subscribeMateSessions(
          email,
          { mutualMates: mateState.mutualMates || [], hiddenMates: mateState.hiddenMates || [] },
          setActiveMates
        );
      } catch (err) {
        console.error('Home load error:', err);
        toast.error('データの読み込みに失敗しました。ページを再読み込みしてください。');
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => unsub();
  }, [email, dateKey, demoRevision, toast]);

  useEffect(() => {
    if (!email || teacherLoading || isTeacher) {
      setUnreadFeedbackCount(0);
      return undefined;
    }
    return subscribeUnreadCountForStudent(email, setUnreadFeedbackCount, (err) => {
      console.error('unread feedback subscribe error:', err);
    });
  }, [email, isTeacher, teacherLoading]);

  const handleAccept = async (fromEmail) => {
    if (isDemoMateEmail(fromEmail)) {
      toast.info('開発用の表示データです');
      return;
    }
    try {
      await acceptRequest(email, fromEmail);
      toast.success('連れ勉仲間になりました');
      const mateState = await loadMateProfiles(email);
      const hidden = mateState.hiddenRequests || [];
      setPendingReceived(
        (mateState.pendingReceived || [])
          .filter((e) => !hidden.includes(e))
          .map((e) => mateState.profiles[e])
          .filter(Boolean)
      );
    } catch (err) {
      toast.error(err.message || '承認に失敗しました');
    }
  };

  if (loading) return <LoadingOverlay message="読み込み中…" />;

  return (
    <PageLayout>
      <div className="space-y-4 pb-8 md:space-y-6">
        <section className="shrink-0">
          <SectionTitle
            onDark
            action={
              activeMates.length > 0 ? (
                <span className="text-sm text-tsure-on-primary/60 tabular-nums">
                  {activeMates.length}人
                </span>
              ) : null
            }
          >
            今、一緒に勉強中
          </SectionTitle>
          <StudyPresenceGrid
            users={activeMates}
            emptyAction={
              <Button to="/turebenmate" variant="white" size="sm">
                連れ勉仲間を招待
              </Button>
            }
          />
        </section>

        <Button
          to="/pomodoro"
          variant="accent"
          size="lg"
          className="w-full shrink-0 md:py-5 md:text-2xl md:min-h-[4.5rem] md:rounded-2xl"
        >
          学習を始める
        </Button>

        {pendingReceived.length > 0 && (
          <Card>
            <SectionTitle>連れ勉の申請</SectionTitle>
            <MateList
              users={pendingReceived}
              actions={(u) => (
                <Button size="sm" onClick={() => handleAccept(u.email)}>
                  承認
                </Button>
              )}
            />
          </Card>
        )}

        {!isTeacher && unreadFeedbackCount > 0 && (
          <Card className="border-tsure-accent/40">
            <SectionTitle
              action={
                <span className="text-sm font-bold text-tsure-accent tabular-nums">
                  {unreadFeedbackCount}件
                </span>
              }
            >
              先生からのコメント
            </SectionTitle>
            <p className="text-sm text-tsure-primary mb-3">
              未読のコメントがあります。内容を確認して返信できます。
            </p>
            <Button to="/feedback" variant="secondary" size="sm" className="inline-flex items-center gap-2">
              <AppIcon icon={MessageSquare} size="sm" />
              コメントを確認する
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-5 gap-2 w-full md:hidden">
          <NavCard to="/pomodoro" icon={NAV_CARD_ICONS.timer} label="タイマー" />
          <NavCard to="/studyplan" icon={NAV_CARD_ICONS.plan} label="計画" />
          <NavCard to="/studyrecord" icon={NAV_CARD_ICONS.record} label="記録" />
          <NavCard to="/turebenmate" icon={NAV_CARD_ICONS.mate} label="連れ勉" />
          <NavCard to="/settings" icon={NAV_CARD_ICONS.settings} label="設定" />
        </div>

        <div className="space-y-4">
          <TodayStudySummary
            totalMinutes={todayLog.totalMinutes}
            entries={todayLog.entries}
            emptyAction={
              <Button to="/pomodoro" variant="secondary" size="sm">
                学習タイマーを開く
              </Button>
            }
          />

          <section>
            <SectionTitle
              onDark
              action={
                <Button to="/studyplan" variant="ghost" size="sm" className="inline-flex items-center gap-1">
                  編集
                  <AppIcon icon={ChevronRight} size="sm" />
                </Button>
              }
            >
              今日の計画
            </SectionTitle>
            <PlanCardList
              entries={plans}
              emptyState={HOME_PLAN_EMPTY}
              emptyAction={
                <Button to="/studyplan" variant="white" size="sm">
                  計画を追加する
                </Button>
              }
            />
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
