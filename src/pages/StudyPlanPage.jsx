import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/firestore/userService';
import { deleteEntry as deletePlanEntry } from '../services/firestore/planService';
import { useStudentPeriodData } from '../hooks/useStudentPeriodData';
import PageLayout from '../components/ui/PageLayout';
import Button from '../components/ui/Button';
import PeriodNav from '../components/ui/PeriodNav';
import PlanCardList from '../components/PlanCardList';
import StudyPeriodPlanView from '../components/teacher/StudyPeriodPlanView';
import TimeInputDialog from '../components/TimeInputDialog';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import { Plus } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { STUDY_PLAN_EMPTY } from '../content/emptyStatePresets';

export default function StudyPlanPage() {
  const { email } = useAuth();
  const { confirm, toast } = useUiFeedback();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [periodMode, setPeriodMode] = useState('day');
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const dateKey = selectedDate.format('YYYY-MM-DD');
  const isPeriodView = periodMode !== 'day';
  const { loading, plans, aggregatedPlans, planDailyOverview, reload } = useStudentPeriodData(email, selectedDate, periodMode);

  useEffect(() => {
    if (!email) return;
    getProfile(email).then((profile) => {
      setSubjectCatalog(profile?.subjectCatalog || {});
    });
  }, [email]);

  const openNew = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleDelete = async (entry) => {
    const ok = await confirm({
      title: '計画を削除',
      message: 'この計画を削除しますか？',
      confirmText: '削除',
      tone: 'danger',
    });
    if (!ok) return;
    await deletePlanEntry(email, dateKey, entry.id);
    toast.success('削除しました');
    reload();
  };

  return (
    <PageLayout title="学習計画">
      <div className="pb-8">
        <PeriodNav
          date={selectedDate}
          mode={periodMode}
          onModeChange={setPeriodMode}
          onDateChange={setSelectedDate}
        />

        {!isPeriodView && (
          <div className="flex justify-end mb-3 shrink-0">
            <Button onClick={openNew} className="inline-flex items-center gap-2">
              <AppIcon icon={Plus} size="sm" />
              計画を追加
            </Button>
          </div>
        )}

        {loading && <LoadingOverlay message="読み込み中…" />}

        {!loading && !isPeriodView && (
          <PlanCardList
            entries={plans}
            onEdit={openEdit}
            onDelete={handleDelete}
            emptyState={STUDY_PLAN_EMPTY}
            emptyAction={
              <Button onClick={openNew} className="inline-flex items-center gap-2" size="sm">
                <AppIcon icon={Plus} size="sm" />
                計画を追加
              </Button>
            }
          />
        )}

        {!loading && isPeriodView && (
          <StudyPeriodPlanView
            periodMode={periodMode}
            aggregatedPlans={aggregatedPlans}
            planDailyOverview={planDailyOverview}
            emptyState={STUDY_PLAN_EMPTY}
            onDark
          />
        )}

        {!isPeriodView && (
          <TimeInputDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            email={email}
            dateKey={dateKey}
            entry={editingEntry}
            subjectCatalog={subjectCatalog}
            onSaved={reload}
            onDelete={editingEntry ? () => handleDelete(editingEntry) : undefined}
          />
        )}
      </div>
    </PageLayout>
  );
}
