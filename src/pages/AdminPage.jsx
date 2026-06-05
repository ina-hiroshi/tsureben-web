import SchoolManagementPanel from '../components/admin/SchoolManagementPanel';
import SchoolBillingOverviewPanel from '../components/admin/SchoolBillingOverviewPanel';
import BulkRegistrationPanel from '../components/admin/BulkRegistrationPanel';
import StudentManagementPanel from '../components/admin/StudentManagementPanel';
import UiFeedbackPreviewPanel from '../components/admin/UiFeedbackPreviewPanel';
import DemoDataPanel from '../components/admin/DemoDataPanel';
import BillingPortalButton from '../components/admin/BillingPortalButton';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import SectionTitle from '../components/ui/SectionTitle';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  const { schoolId: teacherSchoolId, isSuperAdmin, isSchoolAdmin } = useTeacherStatus();
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
        {isSuperAdmin && (
          <Card>
            <SectionTitle>契約・登録状況（全校）</SectionTitle>
            <SchoolBillingOverviewPanel onSelectSchool={setSelectedSchoolId} />
          </Card>
        )}
        {isSchoolAdmin && !isSuperAdmin && (
          <Card>
            <SectionTitle>契約・請求</SectionTitle>
            <p className="text-sm text-gray-700 mb-3">
              プラン変更・請求書・支払い方法は Stripe の顧客ポータルから行えます。
            </p>
            <BillingPortalButton schoolId={selectedSchoolId || teacherSchoolId} />
          </Card>
        )}
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
          <SectionTitle>教員コメント履歴</SectionTitle>
          <p className="text-sm text-gray-700 mb-3">
            本校の教員コメントと生徒の返信を確認できます（削除後も履歴に残ります）。
          </p>
          <Link
            to="/admin/teacher-comments"
            className="inline-flex px-4 py-2 text-sm rounded-lg bg-[#5a3e28] text-white hover:bg-[#7a5639]"
          >
            コメント履歴を開く
          </Link>
        </Card>
        <Card>
          <SectionTitle>生徒情報管理</SectionTitle>
          <StudentManagementPanel
            schoolId={selectedSchoolId}
            refreshKey={studentsRefreshKey}
          />
        </Card>
        {isSuperAdmin && (
          <Card>
            <SectionTitle>デモデータ</SectionTitle>
            <DemoDataPanel />
          </Card>
        )}
        <Card>
          <SectionTitle>UI プレビュー</SectionTitle>
          <UiFeedbackPreviewPanel />
        </Card>
      </div>
    </PageLayout>
  );
}
