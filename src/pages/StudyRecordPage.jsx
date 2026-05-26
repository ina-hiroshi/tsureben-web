import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { getDayLogs, updateEntry, deleteEntry } from '../services/firestore/logService';
import { getProfile } from '../services/firestore/userService';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StudyLogCardList from '../components/StudyLogCardList';
import StudyContentModal from '../components/StudyContentModal';
import DailySubjectPieChart from '../components/DailySubjectPieChart';
import StudyTimeLineChart from '../components/StudyTimeLineChart';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

export default function StudyRecordPage() {
  const { email } = useAuth();
  const { confirm, toast } = useUiFeedback();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [entries, setEntries] = useState([]);
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [editEntry, setEditEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const dateKey = selectedDate.format('YYYY-MM-DD');

  const reload = async () => {
    const [logs, profile] = await Promise.all([
      getDayLogs(email, dateKey),
      getProfile(email),
    ]);
    setEntries(logs.entries || []);
    setSubjectCatalog(profile?.subjectCatalog || {});
  };

  useEffect(() => {
    if (email) reload();
  }, [email, dateKey]);

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleSaveEdit = async (fields) => {
    await updateEntry(email, dateKey, editEntry.id, fields);
    toast.success('記録を更新しました');
    setModalOpen(false);
    reload();
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
          <DailySubjectPieChart email={email} dateKey={dateKey} />
        </Card>
        <Card>
          <StudyTimeLineChart email={email} />
        </Card>

        <section>
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button variant="secondary" size="sm" className="min-w-touch px-3" onClick={() => setSelectedDate((d) => d.subtract(1, 'day'))} aria-label="前の日">
              <AppIcon icon={ChevronLeft} size="md" />
            </Button>
            <span className="font-bold text-tsure-on-primary">{selectedDate.format('M月D日')}</span>
            <Button variant="secondary" size="sm" className="min-w-touch px-3" onClick={() => setSelectedDate((d) => d.add(1, 'day'))} aria-label="次の日">
              <AppIcon icon={ChevronRight} size="md" />
            </Button>
          </div>
          <StudyLogCardList entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
        </section>
      </div>

      <StudyContentModal
        open={modalOpen}
        mode="edit"
        initial={editEntry || {}}
        subjectCatalog={subjectCatalog}
        onSave={handleSaveEdit}
        onClose={() => setModalOpen(false)}
      />
    </PageLayout>
  );
}
