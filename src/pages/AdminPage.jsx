import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import SchoolManagementPanel from '../components/admin/SchoolManagementPanel';
import BulkRegistrationPanel from '../components/admin/BulkRegistrationPanel';
import StudentManagementPanel from '../components/admin/StudentManagementPanel';
import UiFeedbackPreviewPanel from '../components/admin/UiFeedbackPreviewPanel';
import { useTeacherStatus } from '../hooks/useTeacherStatus';

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
    <>
      <Header />
      <div className="min-h-screen bg-[#4b4039] text-[#3a2e28] pt-24 p-6 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          <h1 className="text-2xl font-bold text-[#ede3d2]">管理者ページ</h1>

          <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-[#5a3e28] mb-4">学校管理</h2>
            <SchoolManagementPanel
              selectedSchoolId={selectedSchoolId}
              onSelectSchool={setSelectedSchoolId}
            />
          </section>

          <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-[#5a3e28] mb-4">一括登録（CSV）</h2>
            <BulkRegistrationPanel
              schoolId={selectedSchoolId}
              onStudentsChanged={() => setStudentsRefreshKey((k) => k + 1)}
            />
          </section>

          <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-[#5a3e28] mb-4">生徒情報管理</h2>
            <StudentManagementPanel
              schoolId={selectedSchoolId}
              refreshKey={studentsRefreshKey}
            />
          </section>

          <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-[#5a3e28] mb-4">UI コンポーネント</h2>
            <UiFeedbackPreviewPanel />
          </section>
        </div>
      </div>
    </>
  );
}
