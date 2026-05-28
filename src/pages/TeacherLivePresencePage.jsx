import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  matchesTeacherStudentFilter,
  useTeacherWorkspace,
} from '../contexts/TeacherWorkspaceContext';
import { fetchStudentsForSchool } from '../services/firestore/userService';
import { mergeDemoStudents } from '../dev/demoTeacherReview';
import { useDemoSettingsRevision } from '../hooks/useDemoSettings';
import PageLayout from '../components/ui/PageLayout';
import SectionTitle from '../components/ui/SectionTitle';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import StudyPresenceGrid from '../components/StudyPresenceGrid';
import { TEACHER_PRESENCE_EMPTY } from '../content/emptyStatePresets';
import { db } from '../firebase';

function enrichActiveUsers(activeUsers, studentsByEmail) {
  return activeUsers.map((user) => {
    const profile = studentsByEmail[user.email];
    if (!profile) return user;
    return {
      ...user,
      name: user.name || profile.name,
      grade: user.grade || profile.grade,
      class: user.class || profile.class,
      number: user.number || profile.number,
    };
  });
}

function formatFilterSummary({ filterGrade, filterClass, nameQuery }) {
  const parts = [];
  if (filterGrade) parts.push(`${filterGrade}年`);
  if (filterClass) parts.push(`${filterClass}組`);
  if (nameQuery.trim()) parts.push(`「${nameQuery.trim()}」`);
  return parts.join(' · ');
}

export default function TeacherLivePresencePage() {
  const navigate = useNavigate();
  const {
    effectiveSchoolId,
    loading: workspaceLoading,
    selectStudent,
    activeSessions,
    studentFilters,
    hasStudentFilter,
  } = useTeacherWorkspace();
  const [studentsByEmail, setStudentsByEmail] = useState({});
  const [schoolName, setSchoolName] = useState('');
  const demoRevision = useDemoSettingsRevision();

  useEffect(() => {
    if (!effectiveSchoolId) {
      setSchoolName('');
      return;
    }
    getDoc(doc(db, 'schools', effectiveSchoolId))
      .then((snap) => {
        setSchoolName(snap.exists() ? snap.data().name || effectiveSchoolId : effectiveSchoolId);
      })
      .catch(() => setSchoolName(effectiveSchoolId));
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (!effectiveSchoolId) {
      setStudentsByEmail({});
      return;
    }
    fetchStudentsForSchool(effectiveSchoolId)
      .then((list) => {
        const map = {};
        mergeDemoStudents(list).forEach((student) => {
          map[student.email] = student;
        });
        setStudentsByEmail(map);
      })
      .catch((err) => {
        console.error('Failed to load students for presence enrichment:', err);
        setStudentsByEmail({});
      });
  }, [effectiveSchoolId, demoRevision]);

  const enrichedUsers = useMemo(
    () => enrichActiveUsers(activeSessions, studentsByEmail),
    [activeSessions, studentsByEmail]
  );

  const filteredUsers = useMemo(
    () => enrichedUsers.filter((user) => matchesTeacherStudentFilter(user, studentFilters)),
    [enrichedUsers, studentFilters]
  );

  const filterSummary = useMemo(
    () => formatFilterSummary(studentFilters),
    [studentFilters]
  );

  const handleUserClick = useCallback(
    (user) => {
      selectStudent({
        email: user.email,
        name: user.name,
        grade: user.grade,
        class: user.class,
        number: user.number,
      });
      navigate('/teacher/students');
    },
    [navigate, selectStudent]
  );

  if (workspaceLoading) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  return (
    <PageLayout contentWidth="wide">
      <div className="pb-8 space-y-4">
        <SectionTitle
          onDark
          action={
            filteredUsers.length > 0 ? (
              <span className="text-sm text-tsure-on-primary/60 tabular-nums">
                {filteredUsers.length}人
              </span>
            ) : null
          }
        >
          現在学習中の生徒
        </SectionTitle>

        {schoolName && (
          <p className="text-sm text-tsure-on-primary/70">{schoolName}</p>
        )}

        {hasStudentFilter && (
          <p className="text-xs text-tsure-on-primary/60">
            サイドバーの条件で表示中
            {filterSummary ? `: ${filterSummary}` : ''}
          </p>
        )}

        <StudyPresenceGrid
          variant="teacher"
          users={filteredUsers}
          emptyState={TEACHER_PRESENCE_EMPTY}
          onUserClick={handleUserClick}
        />
      </div>
    </PageLayout>
  );
}
