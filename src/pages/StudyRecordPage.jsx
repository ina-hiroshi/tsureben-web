import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import {
  getDayLogs,
  addEntry,
  updateEntry,
  deleteEntry,
  updateSubjectCatalog,
} from '../services/firestore/logService';
import { getProfile } from '../services/firestore/userService';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StudyLogCardList from '../components/StudyLogCardList';
import StudyContentModal from '../components/StudyContentModal';
import DailySubjectPieChart from '../components/DailySubjectPieChart';
import StudyTimeLineChart from '../components/StudyTimeLineChart';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function StudyRecordPage() {
  const { email } = useAuth();
  const { confirm, toast } = useUiFeedback();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [dayLogs, setDayLogs] = useState({ entries: [], totalMinutes: 0, bySubject: {} });
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [editEntry, setEditEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);

  const dateKey = selectedDate.format('YYYY-MM-DD');
  const isFutureDate = selectedDate.isAfter(dayjs(), 'day');

  const reload = async () => {
    const [logs, profile] = await Promise.all([
      getDayLogs(email, dateKey),
      getProfile(email),
    ]);
    setDayLogs({
      entries: logs.entries || [],
      totalMinutes: logs.totalMinutes || 0,
      bySubject: logs.bySubject || {},
    });
    setLogsRefreshKey((k) => k + 1);
    setSubjectCatalog(profile?.subjectCatalog || {});
  };

  useEffect(() => {
    if (email) reload();
  }, [email, dateKey]);

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
      toast.success('記録を更新しました');
      closeModal();
      reload();
      return;
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

  return (
    <PageLayout title="学習記録">
      <div className="space-y-4">
        <Card>
          <DailySubjectPieChart
            totalMinutes={dayLogs.totalMinutes}
            bySubject={dayLogs.bySubject}
          />
        </Card>
        <Card>
          <StudyTimeLineChart email={email} refreshKey={logsRefreshKey} />
        </Card>

        <section>
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button variant="secondary" size="sm" className="min-w-touch px-3 shrink-0" onClick={() => setSelectedDate((d) => d.subtract(1, 'day'))} aria-label="前の日">
              <AppIcon icon={ChevronLeft} size="md" />
            </Button>
            <div
              className="flex flex-col items-center flex-1 min-w-0 py-1"
              aria-label={`${selectedDate.format('M月D日')} ${DAY_LABELS[selectedDate.day()]}曜日`}
            >
              <span className="text-2xl font-bold text-tsure-on-primary tabular-nums leading-none tracking-wide">
                {selectedDate.format('M月D日')}
                （{DAY_LABELS[selectedDate.day()]}）
              </span>
            </div>
            <Button variant="secondary" size="sm" className="min-w-touch px-3 shrink-0" onClick={() => setSelectedDate((d) => d.add(1, 'day'))} aria-label="次の日">
              <AppIcon icon={ChevronRight} size="md" />
            </Button>
          </div>
          <Button
            variant="secondary"
            size="md"
            className="w-full mb-3 inline-flex items-center justify-center gap-2"
            onClick={handleAddManual}
            disabled={isFutureDate}
          >
            <AppIcon icon={Plus} size="sm" />
            計測漏れを追加
          </Button>
          <StudyLogCardList entries={dayLogs.entries} onEdit={handleEdit} onDelete={handleDelete} />
        </section>
      </div>

      <StudyContentModal
        open={modalOpen}
        mode={modalMode || 'edit'}
        initial={editEntry || {}}
        subjectCatalog={subjectCatalog}
        onSave={handleModalSave}
        onClose={closeModal}
      />
    </PageLayout>
  );
}
