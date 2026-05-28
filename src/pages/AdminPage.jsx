import SchoolManagementPanel from '../components/admin/SchoolManagementPanel';
import BulkRegistrationPanel from '../components/admin/BulkRegistrationPanel';
import StudentManagementPanel from '../components/admin/StudentManagementPanel';
import UiFeedbackPreviewPanel from '../components/admin/UiFeedbackPreviewPanel';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import SectionTitle from '../components/ui/SectionTitle';
import { useEffect, useState } from 'react';

export default function AdminPage() {
  const { schoolId: teacherSchoolId, isSuperAdmin } = useTeacherStatus();
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [studentsRefreshKey, setStudentsRefreshKey] = useState(0);

  useEffect(() => {
    if (teacherSchoolId && !isSuperAdmin) {
      setSelectedSchoolId(teacherSchoolId);
    }
  }, [teacherSchoolId, isSuperAdmin]);

  return (
    <PageLayout title="管理" contentWidth="wide">
      <div className="space-y-4 pb-8">
        <Card>
          <SectionTitle>学校管理</SectionTitle>
          <SchoolManagementPanel
            selectedSchoolId={selectedSchoolId}
            onSelectSchool={setSelectedSchoolId}
          />
        </Card>
        <Card>
          <SectionTitle>一括登録（CSV）</SectionTitle>
          <BulkRegistrationPanel
            schoolId={selectedSchoolId}
            onStudentsChanged={() => setStudentsRefreshKey((k) => k + 1)}
          />
        </Card>
        <Card>
          <SectionTitle>生徒情報管理</SectionTitle>
          <StudentManagementPanel
            schoolId={selectedSchoolId}
            refreshKey={studentsRefreshKey}
          />
        </Card>
        <Card>
          <SectionTitle>UI プレビュー</SectionTitle>
          <UiFeedbackPreviewPanel />
        </Card>
      </div>
    </PageLayout>
  );
}
