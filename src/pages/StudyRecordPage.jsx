import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import {
  addEntry,
  updateEntry,
  deleteEntry,
  updateSubjectCatalog,
} from '../services/firestore/logService';
import { getProfile } from '../services/firestore/userService';
import { useStudentPeriodData } from '../hooks/useStudentPeriodData';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PeriodNav from '../components/ui/PeriodNav';
import StudyLogCardList from '../components/StudyLogCardList';
import StudyContentModal from '../components/StudyContentModal';
import DailySubjectPieChart from '../components/DailySubjectPieChart';
import StudyTimeLineChart from '../components/StudyTimeLineChart';
import StudyPeriodLogView from '../components/teacher/StudyPeriodLogView';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import { Plus } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { STUDY_LOG_EMPTY } from '../content/emptyStatePresets';

export default function StudyRecordPage() {
  const { email } = useAuth();
  const { confirm, toast } = useUiFeedback();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [periodMode, setPeriodMode] = useState('day');
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [editEntry, setEditEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);

  const dateKey = selectedDate.format('YYYY-MM-DD');
  const isFutureDate = selectedDate.isAfter(dayjs(), 'day');
  const isPeriodView = periodMode !== 'day';

  const {
    loading,
    dayLogs,
    aggregatedLogs,
    aggregatedPlans,
    planDailyOverview,
    dailyTotals,
    studyDayCount,
    startDate,
    endDate,
    reload,
  } = useStudentPeriodData(email, selectedDate, periodMode);

  const periodDayCount = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

  useEffect(() => {
    if (!email) return;
    getProfile(email).then((profile) => {
      setSubjectCatalog(profile?.subjectCatalog || {});
    });
  }, [email]);

  useEffect(() => {
    if (!loading && !isPeriodView) {
      setLogsRefreshKey((k) => k + 1);
    }
  }, [loading, isPeriodView, dayLogs.totalMinutes]);

  const closeModal = () => {
    setModalOpen(false);
    setModalMode(null);
    setEditEntry(null);
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleAddManual = () => {
    setEditEntry(null);
    setModalMode('manual');
    setModalOpen(true);
  };

  const handleModalSave = async (fields) => {
    if (modalMode === 'manual') {
      const duration = Number(fields.duration);
      if (!duration || duration < 1) {
        toast.warning('学習時間を1分以上で入力してください');
        return false;
      }
      if (!fields.subject?.trim() || !fields.topic?.trim()) {
        toast.warning('教科と科目は必須です');
        return false;
      }
      try {
        await addEntry(email, dateKey, {
          startTime: fields.startTime || '',
          duration,
          subject: fields.subject,
          topic: fields.topic,
          book: fields.book || '',
          content: fields.content || '',
        });
        await updateSubjectCatalog(email, fields);
        toast.success('学習記録を追加しました');
        closeModal();
        reload();
      } catch (err) {
        toast.error(err.message || '追加に失敗しました');
        return false;
      }
      return;
    }

    if (modalMode === 'edit') {
      await updateEntry(email, dateKey, editEntry.id, fields);
      await updateSubjectCatalog(email, fields);
      toast.success('記録を更新しました');
      closeModal();
      reload();
    }
  };

  const handleDelete = async (entry) => {
    const ok = await confirm({
      title: '記録を削除',
      message: 'この学習記録を削除しますか？',
      confirmText: '削除',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteEntry(email, dateKey, entry.id);
    toast.success('削除しました');
    reload();
  };

  const timerButton = (
    <Button to="/pomodoro" variant="secondary" size="sm">
      学習タイマーを開く
    </Button>
  );

  return (
    <PageLayout title="学習記録">
      <div className="space-y-4 pb-8">
        <PeriodNav
          date={selectedDate}
          mode={periodMode}
          onModeChange={setPeriodMode}
          onDateChange={setSelectedDate}
        />

        {loading && <LoadingOverlay message="読み込み中…" />}

        {!loading && !isPeriodView && (
          <>
            <div className="space-y-4 shrink-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              <Card>
                <DailySubjectPieChart
                  embedded
                  totalMinutes={dayLogs.totalMinutes}
                  bySubject={dayLogs.bySubject}
                  emptyAction={timerButton}
                />
              </Card>
              <Card>
                <StudyTimeLineChart
                  email={email}
                  refreshKey={logsRefreshKey}
                  emptyAction={timerButton}
                />
              </Card>
            </div>

            <section>
              <div className="flex justify-end mb-3 shrink-0">
                <Button
                  className="inline-flex items-center gap-2"
                  onClick={handleAddManual}
                  disabled={isFutureDate}
                >
                  <AppIcon icon={Plus} size="sm" />
                  計測漏れを追加
                </Button>
              </div>
              <StudyLogCardList
                entries={dayLogs.entries}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyAction={
                  <Button
                    className="inline-flex items-center gap-2"
                    onClick={handleAddManual}
                    disabled={isFutureDate}
                    size="sm"
                  >
                    <AppIcon icon={Plus} size="sm" />
                    計測漏れを追加
                  </Button>
                }
              />
            </section>
          </>
        )}

        {!loading && isPeriodView && (
          <StudyPeriodLogView
            periodMode={periodMode}
            aggregatedLogs={aggregatedLogs}
            plannedMinutes={aggregatedPlans.totalPlannedMinutes}
            planDailyOverview={planDailyOverview}
            dailyTotals={dailyTotals}
            studyDayCount={studyDayCount}
            periodDayCount={periodDayCount}
            emptyState={STUDY_LOG_EMPTY}
            onDark
          />
        )}
      </div>

      {!isPeriodView && (
        <StudyContentModal
          open={modalOpen}
          mode={modalMode || 'edit'}
          initial={editEntry || {}}
          subjectCatalog={subjectCatalog}
          onSave={handleModalSave}
          onClose={closeModal}
        />
      )}
    </PageLayout>
  );
}
