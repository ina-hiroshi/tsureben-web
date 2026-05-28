import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherWorkspace } from '../contexts/TeacherWorkspaceContext';
import { getProfile } from '../services/firestore/userService';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import StudentPickerPanel from '../components/teacher/StudentPickerPanel';
import StudentReviewDetailPanel from '../components/teacher/StudentReviewDetailPanel';
import TeacherStudentReviewPlaceholder from '../components/teacher/TeacherStudentReviewPlaceholder';

export default function TeacherStudentReviewPage() {
  const { email } = useAuth();
  const {
    effectiveSchoolId,
    isSuperAdmin,
    loading: workspaceLoading,
    selectedStudent,
    selectStudent,
  } = useTeacherWorkspace();
  const [teacherName, setTeacherName] = useState('');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  useEffect(() => {
    if (!email) return;
    getProfile(email).then((p) => {
      if (p?.name) setTeacherName(p.name);
    });
  }, [email]);

  useEffect(() => {
    setMobileShowDetail(false);
  }, [effectiveSchoolId]);

  const handleSelectStudent = (student) => {
    selectStudent(student);
    setMobileShowDetail(true);
  };

  const handleBack = () => {
    setMobileShowDetail(false);
  };

  if (workspaceLoading) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  return (
    <PageLayout contentWidth="wide">
      <div className="flex flex-col gap-4 pb-8 md:pb-4 md:min-h-[calc(100dvh-4rem)] md:flex-1">
        {!isSuperAdmin && !effectiveSchoolId && (
          <Card className="!p-4 shrink-0">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              所属学校が登録されていません。管理者に教員アカウントの schoolId 設定を依頼してください。
            </p>
          </Card>
        )}

        {effectiveSchoolId && (
          <>
            <div className="md:hidden space-y-4">
              {!mobileShowDetail ? (
                <>
                  <div>
                    <h1 className="text-base font-bold text-tsure-on-primary">生徒の学習記録</h1>
                    <p className="text-sm text-tsure-on-primary/65 mt-1">
                      確認したい生徒を選んでください
                    </p>
                  </div>
                  <Card className="!p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-tsure-border">
                      <h2 className="text-sm font-bold text-tsure-primary">生徒一覧</h2>
                    </div>
                    <div className="h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] px-4 py-3 overflow-hidden flex flex-col">
                      <StudentPickerPanel
                        schoolId={effectiveSchoolId}
                        selectedEmail={selectedStudent?.email}
                        onSelect={handleSelectStudent}
                      />
                    </div>
                  </Card>
                </>
              ) : (
                <StudentReviewDetailPanel
                  student={selectedStudent}
                  schoolId={effectiveSchoolId}
                  teacherName={teacherName || email}
                  onBack={handleBack}
                  showBackButton
                />
              )}
            </div>

            <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
              {selectedStudent ? (
                <StudentReviewDetailPanel
                  student={selectedStudent}
                  schoolId={effectiveSchoolId}
                  teacherName={teacherName || email}
                />
              ) : (
                <TeacherStudentReviewPlaceholder />
              )}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
