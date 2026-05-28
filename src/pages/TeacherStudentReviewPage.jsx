import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { getProfile } from '../services/firestore/userService';
import PageLayout from '../components/ui/PageLayout';
import SectionTitle from '../components/ui/SectionTitle';
import Card from '../components/ui/Card';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import StudentPickerPanel from '../components/teacher/StudentPickerPanel';
import StudentReviewDetailPanel from '../components/teacher/StudentReviewDetailPanel';
import SchoolManagementPanel from '../components/admin/SchoolManagementPanel';
import {
  isDemoTeacherReviewEnabled,
  DEMO_TEACHER_REVIEW_STUDENT_COUNT,
} from '../dev/demoTeacherReview';

export default function TeacherStudentReviewPage() {
  const { email } = useAuth();
  const { schoolId: teacherSchoolId, isSuperAdmin, loading: teacherLoading } = useTeacherStatus();
  const [teacherName, setTeacherName] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  useEffect(() => {
    if (!email) return;
    getProfile(email).then((p) => {
      if (p?.name) setTeacherName(p.name);
    });
  }, [email]);

  useEffect(() => {
    if (isSuperAdmin) return;
    if (teacherSchoolId) {
      setSelectedSchoolId(teacherSchoolId);
    }
  }, [teacherSchoolId, isSuperAdmin]);

  useEffect(() => {
    setSelectedStudent(null);
    setMobileShowDetail(false);
  }, [selectedSchoolId]);

  const effectiveSchoolId = isSuperAdmin ? selectedSchoolId : teacherSchoolId;

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setMobileShowDetail(true);
  };

  const handleBack = () => {
    setMobileShowDetail(false);
  };

  const mobileListHeightClass = isSuperAdmin
    ? 'h-[calc(100dvh-16rem)] max-h-[calc(100dvh-16rem)]'
    : 'h-[calc(100dvh-12rem)] max-h-[calc(100dvh-12rem)]';

  if (teacherLoading) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  return (
    <PageLayout contentWidth="wide">
      <div className="pb-8 space-y-4">
        <SectionTitle onDark>生徒の学習記録</SectionTitle>

        {isDemoTeacherReviewEnabled() && (
          <p className="text-xs text-tsure-on-primary/70 bg-white/10 border border-white/20 rounded-lg px-3 py-2">
            開発用デモ生徒 {DEMO_TEACHER_REVIEW_STUDENT_COUNT} 名が一覧に含まれています（
            <code className="text-[11px]">demo-review-*@tsureben.dev</code>
            ）。ON/OFF は super_admin が管理ページの「デモデータ」から切り替えます（開発サーバーのみ）。
          </p>
        )}

        {isSuperAdmin && (
          <Card className="!p-4">
            <h2 className="text-sm font-bold text-tsure-primary mb-3">表示する学校</h2>
            <SchoolManagementPanel
              selectedSchoolId={selectedSchoolId}
              onSelectSchool={setSelectedSchoolId}
              showCreateForm={false}
              selectLabel="学校"
            />
          </Card>
        )}

        {!isSuperAdmin && !effectiveSchoolId && (
          <Card className="!p-4">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              所属学校が登録されていません。管理者に教員アカウントの schoolId 設定を依頼してください。
            </p>
          </Card>
        )}

        {isSuperAdmin && !effectiveSchoolId && (
          <Card className="!p-4">
            <p className="text-sm text-tsure-muted">
              上のプルダウンから学校を選択すると、生徒一覧が表示されます。
            </p>
          </Card>
        )}

        {effectiveSchoolId && (
          <Card className="!p-0 overflow-hidden">
            <div className="lg:grid lg:grid-cols-[280px_1fr] lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)]">
              <div
                className={`flex flex-col min-h-0 overflow-hidden border-tsure-border lg:border-r ${
                  mobileShowDetail
                    ? 'hidden lg:flex lg:h-full lg:max-h-none'
                    : `flex ${mobileListHeightClass} lg:h-full lg:max-h-none`
                }`}
              >
                <div className="shrink-0 px-4 pt-4 pb-2 border-b border-tsure-border">
                  <h2 className="text-sm font-bold text-tsure-primary">生徒一覧</h2>
                </div>
                <div className="flex-1 min-h-0 px-4 py-3 overflow-hidden flex flex-col">
                  <StudentPickerPanel
                    schoolId={effectiveSchoolId}
                    selectedEmail={selectedStudent?.email}
                    onSelect={handleSelectStudent}
                  />
                </div>
              </div>

              <div
                className={`min-h-0 overflow-y-auto p-4 md:p-6 ${
                  mobileShowDetail ? 'block' : 'hidden lg:block'
                }`}
              >
                <StudentReviewDetailPanel
                  student={selectedStudent}
                  schoolId={effectiveSchoolId}
                  teacherName={teacherName || email}
                  onBack={handleBack}
                  showBackButton={mobileShowDetail}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
