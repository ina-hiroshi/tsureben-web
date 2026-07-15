import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { useDemoSettingsRevision } from '../hooks/useDemoSettings';
import { subscribeSchoolActiveSessions } from '../services/firestore/presenceService';
import { matchesTeacherStudentFilter } from '../utils/teacherStudentStatus';

export { matchesTeacherStudentFilter };

const STORAGE_KEY = 'teacherSelectedSchoolId';

const TeacherWorkspaceContext = createContext(null);

function readStoredSchoolId() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredSchoolId(id) {
  try {
    if (id) {
      sessionStorage.setItem(STORAGE_KEY, id);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function TeacherWorkspaceProvider({ children }) {
  const { schoolId: teacherSchoolId, isSuperAdmin, loading } = useTeacherStatus();
  const [selectedSchoolId, setSelectedSchoolIdState] = useState(() => readStoredSchoolId());
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFilterGrade, setStudentFilterGradeState] = useState('');
  const [studentFilterClass, setStudentFilterClassState] = useState('');
  const [studentNameQuery, setStudentNameQueryState] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const demoRevision = useDemoSettingsRevision();

  useEffect(() => {
    if (isSuperAdmin) return;
    setSelectedSchoolIdState('');
    writeStoredSchoolId('');
  }, [isSuperAdmin]);

  const setSelectedSchoolId = useCallback((id) => {
    const next = id || '';
    setSelectedSchoolIdState(next);
    writeStoredSchoolId(next);
  }, []);

  const clearSelectedSchoolId = useCallback(() => {
    setSelectedSchoolIdState('');
    writeStoredSchoolId('');
  }, []);

  const effectiveSchoolId = isSuperAdmin ? selectedSchoolId : teacherSchoolId;

  useEffect(() => {
    setSelectedStudent(null);
    setStudentFilterGradeState('');
    setStudentFilterClassState('');
    setStudentNameQueryState('');
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (!effectiveSchoolId) {
      setActiveSessions([]);
      return undefined;
    }
    return subscribeSchoolActiveSessions(effectiveSchoolId, setActiveSessions);
  }, [effectiveSchoolId, demoRevision]);

  const selectStudent = useCallback((student) => {
    setSelectedStudent(student);
  }, []);

  const clearSelectedStudent = useCallback(() => {
    setSelectedStudent(null);
  }, []);

  const setStudentFilterGrade = useCallback((grade) => {
    setStudentFilterGradeState(grade);
    setStudentFilterClassState('');
  }, []);

  const setStudentFilterClass = useCallback((value) => {
    setStudentFilterClassState(value);
  }, []);

  const setStudentNameQuery = useCallback((value) => {
    setStudentNameQueryState(value);
  }, []);

  const studentFilters = useMemo(
    () => ({
      filterGrade: studentFilterGrade,
      filterClass: studentFilterClass,
      nameQuery: studentNameQuery,
    }),
    [studentFilterGrade, studentFilterClass, studentNameQuery]
  );

  const hasStudentFilter = Boolean(
    studentFilterGrade || studentFilterClass || studentNameQuery.trim()
  );

  const activeStudyingEmails = useMemo(
    () => new Set(activeSessions.map((session) => session.email)),
    [activeSessions]
  );

  const value = useMemo(
    () => ({
      effectiveSchoolId,
      isSuperAdmin,
      selectedSchoolId,
      setSelectedSchoolId,
      clearSelectedSchoolId,
      selectedStudent,
      selectStudent,
      clearSelectedStudent,
      studentFilterGrade,
      studentFilterClass,
      studentNameQuery,
      setStudentFilterGrade,
      setStudentFilterClass,
      setStudentNameQuery,
      studentFilters,
      hasStudentFilter,
      activeSessions,
      activeStudyingEmails,
      loading,
      needsSchoolSelection: isSuperAdmin && !selectedSchoolId,
    }),
    [
      effectiveSchoolId,
      isSuperAdmin,
      selectedSchoolId,
      setSelectedSchoolId,
      clearSelectedSchoolId,
      selectedStudent,
      selectStudent,
      clearSelectedStudent,
      studentFilterGrade,
      studentFilterClass,
      studentNameQuery,
      setStudentFilterGrade,
      setStudentFilterClass,
      setStudentNameQuery,
      studentFilters,
      hasStudentFilter,
      activeSessions,
      activeStudyingEmails,
      loading,
    ]
  );

  return (
    <TeacherWorkspaceContext.Provider value={value}>
      {children}
    </TeacherWorkspaceContext.Provider>
  );
}

export function useTeacherWorkspace() {
  const ctx = useContext(TeacherWorkspaceContext);
  if (!ctx) {
    throw new Error('useTeacherWorkspace must be used within TeacherWorkspaceProvider');
  }
  return ctx;
}

export function useTeacherWorkspaceOptional() {
  return useContext(TeacherWorkspaceContext);
}
