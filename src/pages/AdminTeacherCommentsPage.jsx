import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SchoolManagementPanel from '../components/admin/SchoolManagementPanel';
import TeacherCommentAuditPanel from '../components/admin/TeacherCommentAuditPanel';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import PageLayout from '../components/ui/PageLayout';
import Card from '../components/ui/Card';
import SectionTitle from '../components/ui/SectionTitle';
import AppIcon from '../components/ui/AppIcon';

export default function AdminTeacherCommentsPage() {
  const { schoolId: teacherSchoolId, isSuperAdmin, loading: teacherLoading } = useTeacherStatus();
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  useEffect(() => {
    if (teacherSchoolId && !isSuperAdmin) {
      setSelectedSchoolId(teacherSchoolId);
    }
  }, [teacherSchoolId, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && teacherSchoolId && !selectedSchoolId) {
      setSelectedSchoolId(teacherSchoolId);
    }
  }, [isSuperAdmin, teacherSchoolId, selectedSchoolId]);

  return (
    <PageLayout title="教員コメント履歴" contentWidth="wide">
      <div className="space-y-4 pb-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[#5a3e28] hover:underline"
        >
          <AppIcon icon={ArrowLeft} size="sm" />
          管理に戻る
        </Link>

        <Card>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            本校の教員・生徒間のフィードバック（コメントと返信）を確認できます。私的な利用の抑止を目的とした機能です。
            削除したコメントも履歴に残ります（実装以前に物理削除されたものを除く）。
          </p>
          {isSuperAdmin && (
            <div className="mb-4">
              <SchoolManagementPanel
                selectedSchoolId={selectedSchoolId}
                onSelectSchool={setSelectedSchoolId}
                showCreateForm={false}
                selectLabel="対象の学校"
              />
            </div>
          )}
          <SectionTitle>コメント一覧</SectionTitle>
          {!teacherLoading && !selectedSchoolId && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              {isSuperAdmin
                ? '上で学校を選択してください。'
                : '学校情報が取得できません。teachers ドキュメントに schoolId があるか確認してください。'}
            </p>
          )}
          <TeacherCommentAuditPanel schoolId={selectedSchoolId} />
        </Card>
      </div>
    </PageLayout>
  );
}
