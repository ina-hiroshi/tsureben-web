import { useTeacherWorkspaceOptional } from '../../contexts/TeacherWorkspaceContext';
import Card from '../ui/Card';
import LoadingOverlay from '../ui/LoadingOverlay';
import SchoolManagementPanel from '../admin/SchoolManagementPanel';

export default function SchoolSelectionGate({ children }) {
  const workspace = useTeacherWorkspaceOptional();

  if (!workspace) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  const {
    isSuperAdmin,
    selectedSchoolId,
    setSelectedSchoolId,
    needsSchoolSelection,
    loading,
  } = workspace;

  if (loading) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  if (needsSchoolSelection) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#4b4039]/90 p-4">
        <Card className="w-full max-w-md !p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-tsure-primary">表示する学校を選択</h1>
            <p className="text-sm text-tsure-muted mt-2">
              super_admin として教員ページを利用するには、先に学校を選んでください。
            </p>
          </div>
          <SchoolManagementPanel
            selectedSchoolId={selectedSchoolId}
            onSelectSchool={setSelectedSchoolId}
            showCreateForm={false}
            selectLabel="学校"
            elevatedSelect
          />
        </Card>
      </div>
    );
  }

  return children;
}
