import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import Modal from '../components/ui/Modal';
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
  const [plansModalOpen, setPlansModalOpen] = useState(false);

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
      <div className="flex flex-col gap-4 pb-8 md:pb-8">
        <section className="shrink-0">
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

        <section className="flex flex-col items-center gap-4 py-2 md:py-6">
          <StudyTimer email={email} large />
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="inline-flex items-center gap-2"
            onClick={() => setPlansModalOpen(true)}
          >
            今日の計画
            <AppIcon icon={ChevronRight} size="sm" />
          </Button>
        </section>
      </div>

      <Modal
        open={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        title="今日の計画"
        size="wide"
      >
        <PlanCardList entries={plans} compact />
        <Link
          to="/studyplan"
          onClick={() => setPlansModalOpen(false)}
          className="mt-4 flex min-h-touch w-full items-center justify-center gap-1 text-sm font-semibold text-tsure-primary no-underline hover:opacity-80"
        >
          計画を編集
          <AppIcon icon={ChevronRight} size="sm" />
        </Link>
      </Modal>
    </PageLayout>
  );
}
