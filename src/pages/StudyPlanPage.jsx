import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/firestore/userService';
import { getDayPlans, deleteEntry as deletePlanEntry } from '../services/firestore/planService';
import { flattenDayPlans } from '../utils/planUtils';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PlanCardList from '../components/PlanCardList';
import TimeInputDialog from '../components/TimeInputDialog';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import AppIcon from '../components/ui/AppIcon';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

export default function StudyPlanPage() {
  const { email } = useAuth();
  const { confirm, toast } = useUiFeedback();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [entries, setEntries] = useState([]);
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const dateKey = selectedDate.format('YYYY-MM-DD');

  const reload = async () => {
    const [dayData, profile] = await Promise.all([
      getDayPlans(email, dateKey),
      getProfile(email),
    ]);
    setEntries(flattenDayPlans(dayData));
    setSubjectCatalog(profile?.subjectCatalog || {});
  };

  useEffect(() => {
    if (email) reload();
  }, [email, dateKey]);

  const shiftDate = (days) => setSelectedDate((d) => d.add(days, 'day'));

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
      <Card className="sticky top-16 z-10 mb-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" className="min-w-touch px-3" onClick={() => shiftDate(-1)} aria-label="前の日">
            <AppIcon icon={ChevronLeft} size="md" />
          </Button>
          <span className="font-bold text-tsure-primary">{selectedDate.format('M月D日（ddd）')}</span>
          <Button variant="secondary" size="sm" className="min-w-touch px-3" onClick={() => shiftDate(1)} aria-label="次の日">
            <AppIcon icon={ChevronRight} size="md" />
          </Button>
        </div>
      </Card>

      <div className="flex justify-end mb-3">
        <Button onClick={openNew} className="inline-flex items-center gap-2">
          <AppIcon icon={Plus} size="sm" />
          計画を追加
        </Button>
      </div>

      <PlanCardList entries={entries} onEdit={openEdit} onDelete={handleDelete} />

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
    </PageLayout>
  );
}
