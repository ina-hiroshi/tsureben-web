import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { getProfile } from '../services/firestore/userService';
import { getDayPlans } from '../services/firestore/planService';
import { subscribeVisibleSessions } from '../services/firestore/presenceService';
import { flattenDayPlans } from '../utils/planUtils';
import PageLayout from '../components/ui/PageLayout';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import StudyTimer from '../components/StudyTimer';
import StudyPresenceGrid from '../components/StudyPresenceGrid';
import { ChevronRight } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import PlanCardList from '../components/PlanCardList';

export default function StudyTimerPage() {
  const { email } = useAuth();
  const { isTeacher, schoolId: teacherSchoolId } = useTeacherStatus();
  const [profile, setProfile] = useState(null);
  const [visibleUsers, setVisibleUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showPlans, setShowPlans] = useState(true);

  useEffect(() => {
    if (!email) return;
    getProfile(email).then(setProfile);
    getDayPlans(email, dayjs().format('YYYY-MM-DD')).then((d) =>
      setPlans(flattenDayPlans(d))
    );
  }, [email]);

  useEffect(() => {
    if (!profile) return;
    return subscribeVisibleSessions(profile, isTeacher, teacherSchoolId, setVisibleUsers);
  }, [profile, isTeacher, teacherSchoolId]);

  return (
    <PageLayout title="学習タイマー">
      <StudyTimer email={email} />

      <section className="mt-4">
        <SectionTitle
          onDark
          action={
            visibleUsers.length > 0 ? (
              <span className="text-sm text-tsure-on-primary/60 tabular-nums">
                {visibleUsers.length}人
              </span>
            ) : null
          }
        >
          一緒に勉強中
        </SectionTitle>
        <StudyPresenceGrid users={visibleUsers} emptyTitle="周りに勉強中の人はいません" />
      </section>

      <section className="mt-4">
        <SectionTitle
          onDark
          action={
            <button
              type="button"
              className="text-sm text-tsure-on-primary/70 hover:text-tsure-on-primary min-h-touch px-2"
              onClick={() => setShowPlans((v) => !v)}
            >
              {showPlans ? '折りたたむ' : '展開'}
            </button>
          }
        >
          今日の計画（参考）
        </SectionTitle>
        {showPlans && (
          <>
            <PlanCardList entries={plans} compact />
            <Button to="/studyplan" variant="secondary" size="sm" className="w-full mt-3 inline-flex items-center justify-center gap-1">
              計画を編集
              <AppIcon icon={ChevronRight} size="sm" />
            </Button>
          </>
        )}
      </section>
    </PageLayout>
  );
}
