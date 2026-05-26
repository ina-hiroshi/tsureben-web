import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { getDayPlans } from '../services/firestore/planService';
import { getDayLogs } from '../services/firestore/logService';
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
import LoadingOverlay from '../components/ui/LoadingOverlay';
import { NAV_CARD_ICONS } from '../utils/navIcons';
import { ChevronRight } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

export default function Home() {
  const { email } = useAuth();
  const { toast } = useUiFeedback();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [todayLog, setTodayLog] = useState({ totalMinutes: 0, entries: [] });
  const [activeMates, setActiveMates] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);

  const dateKey = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    if (!email) return;
    let unsub = () => {};

    const load = async () => {
      setLoading(true);
      try {
        const [dayPlans, dayLogs, mateState] = await Promise.all([
          getDayPlans(email, dateKey),
          getDayLogs(email, dateKey),
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
  }, [email, dateKey]);

  const handleAccept = async (fromEmail) => {
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
      <div className="space-y-4 pb-8">
        <section>
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
          <StudyPresenceGrid users={activeMates} />
        </section>

        <Button to="/pomodoro" variant="accent" size="lg" className="w-full">
          学習を始める
        </Button>

        <TodayStudySummary
          totalMinutes={todayLog.totalMinutes}
          entries={todayLog.entries}
        />

        {pendingReceived.length > 0 && (
          <Card>
            <SectionTitle>連れ勉の申請</SectionTitle>
            <ul className="space-y-2">
              {pendingReceived.map((u) => (
                <li key={u.email} className="flex items-center justify-between gap-2">
                  <span className="font-medium text-tsure-primary">{u.name || u.email}</span>
                  <Button size="sm" onClick={() => handleAccept(u.email)}>
                    承認
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-5 gap-2 w-full">
          <NavCard to="/pomodoro" icon={NAV_CARD_ICONS.timer} label="タイマー" />
          <NavCard to="/studyplan" icon={NAV_CARD_ICONS.plan} label="計画" />
          <NavCard to="/studyrecord" icon={NAV_CARD_ICONS.record} label="記録" />
          <NavCard to="/turebenmate" icon={NAV_CARD_ICONS.mate} label="連れ勉" />
          <NavCard to="/settings" icon={NAV_CARD_ICONS.settings} label="設定" />
        </div>

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
          <PlanCardList entries={plans} />
        </section>
      </div>
    </PageLayout>
  );
}
