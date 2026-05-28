import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { fetchStudentsForSchool } from '../../services/firestore/userService';
import { uniqueSorted } from '../../utils/adminStudents';
import { mergeDemoStudents } from '../../dev/demoTeacherReview';
import { useDemoSettingsRevision } from '../../hooks/useDemoSettings';
import {
  matchesTeacherStudentFilter,
  useTeacherWorkspace,
} from '../../contexts/TeacherWorkspaceContext';
import FilterSelect from '../ui/FilterSelect';
import SuggestInput from '../ui/SuggestInput';
import AppIcon from '../ui/AppIcon';
import EmptyState from '../ui/EmptyState';
import { TEACHER_STUDENT_EMPTY } from '../../content/emptyStatePresets';

export default function StudentPickerPanel({
  schoolId,
  selectedEmail,
  onSelect,
  elevatedSelect = false,
  sidebar = false,
}) {
  const location = useLocation();
  const {
    studentFilterGrade,
    studentFilterClass,
    studentNameQuery,
    setStudentFilterGrade,
    setStudentFilterClass,
    setStudentNameQuery,
    activeStudyingEmails,
  } = useTeacherWorkspace();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const demoRevision = useDemoSettingsRevision();
  const isLivePage =
    location.pathname === '/teacher/live' || location.pathname === '/teacher';

  const loadStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const list = mergeDemoStudents(await fetchStudentsForSchool(schoolId));
      setStudents(list);
    } catch (err) {
      console.error('Failed to load students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, demoRevision]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const gradeOptions = useMemo(
    () => uniqueSorted(students.map((s) => s.grade)),
    [students]
  );

  const classOptions = useMemo(() => {
    const source = studentFilterGrade
      ? students.filter((s) => String(s.grade ?? '') === studentFilterGrade)
      : students;
    return uniqueSorted(source.map((s) => s.class));
  }, [students, studentFilterGrade]);

  const nameSuggestions = useMemo(
    () => uniqueSorted(students.map((s) => s.name)),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) =>
      matchesTeacherStudentFilter(student, {
        filterGrade: studentFilterGrade,
        filterClass: studentFilterClass,
        nameQuery: studentNameQuery,
      })
    );
  }, [students, studentFilterGrade, studentFilterClass, studentNameQuery]);

  const studyingInViewCount = useMemo(
    () => filteredStudents.filter((student) => activeStudyingEmails.has(student.email)).length,
    [filteredStudents, activeStudyingEmails]
  );

  if (!schoolId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
        学校が選択されていません。super_admin の場合はサイドバーの「学校を切替」から学校を選んでください。
      </p>
    );
  }

  const filterLabelClass = sidebar ? '!text-tsure-on-primary/80' : '';
  const countClass = sidebar ? 'text-tsure-on-primary/60' : 'text-tsure-muted';
  const listShellClass = sidebar
    ? 'flex-1 min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]'
    : 'flex-1 min-h-0 overflow-y-auto overscroll-y-contain border border-tsure-border rounded-xl bg-white [-webkit-overflow-scrolling:touch]';
  const loadingTextClass = sidebar ? 'text-tsure-on-primary/60' : 'text-tsure-muted';
  const filterShellClass = 'grid grid-cols-2 gap-2 shrink-0';

  return (
    <div className="flex flex-col min-h-0 h-full gap-3">
      {sidebar && (
        <div className="shrink-0 space-y-1">
          <p className="text-xs font-semibold text-tsure-on-primary/85">生徒一覧</p>
          {isLivePage && (
            <p className="text-[11px] text-tsure-on-primary/55 leading-snug">
              学年・組・氏名で、一覧と現在学習中を絞り込み
            </p>
          )}
        </div>
      )}

      <div className={filterShellClass}>
        <FilterSelect
          label="学年"
          value={studentFilterGrade}
          onChange={setStudentFilterGrade}
          options={[
            { value: '', label: 'すべて' },
            ...gradeOptions.map((g) => ({ value: g, label: `${g}年` })),
          ]}
          disabled={loading}
          optionsClassName={elevatedSelect ? 'z-[250]' : ''}
          optionsModal={!elevatedSelect}
          labelClassName={filterLabelClass}
        />
        <FilterSelect
          label="組"
          value={studentFilterClass}
          onChange={setStudentFilterClass}
          options={[
            { value: '', label: 'すべて' },
            ...classOptions.map((c) => ({ value: c, label: `${c}組` })),
          ]}
          disabled={loading}
          optionsClassName={elevatedSelect ? 'z-[250]' : ''}
          optionsModal={!elevatedSelect}
          labelClassName={filterLabelClass}
        />
        <div className="col-span-2">
          <SuggestInput
            label="氏名"
            value={studentNameQuery}
            onChange={setStudentNameQuery}
            suggestions={nameSuggestions}
            placeholder="氏名で検索"
            disabled={loading}
            labelClassName={filterLabelClass}
          />
        </div>
      </div>

      <p className={`text-xs tabular-nums shrink-0 ${countClass}`}>
        {loading
          ? '読み込み中...'
          : `${filteredStudents.length} 件${filteredStudents.length !== students.length ? ` / 全 ${students.length} 件` : ''}`}
        {sidebar && isLivePage && !loading && studyingInViewCount > 0 && (
          <span className="ml-2 text-tsure-live font-semibold">
            · 学習中 {studyingInViewCount}人
          </span>
        )}
      </p>

      <div className={listShellClass}>
        {loading && (
          <p className={`text-sm text-center py-8 ${loadingTextClass}`}>読み込み中...</p>
        )}
        {!loading && filteredStudents.length === 0 && (
          sidebar ? (
            <p className="text-sm text-tsure-on-primary/60 text-center py-8 px-2">
              生徒が見つかりません
            </p>
          ) : (
            <div className="p-4">
              <EmptyState {...TEACHER_STUDENT_EMPTY} />
            </div>
          )
        )}
        {!loading && filteredStudents.length > 0 && (
          <ul className={sidebar ? 'space-y-1 p-1' : 'divide-y divide-tsure-border'}>
            {filteredStudents.map((student) => {
              const active = selectedEmail === student.email;
              const isStudying = activeStudyingEmails.has(student.email);
              return (
                <li key={student.email}>
                  <button
                    type="button"
                    onClick={() => onSelect(student)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full text-left px-3 py-3 transition rounded-lg ${
                      sidebar
                        ? active
                          ? 'bg-white border-l-4 border-tsure-accent shadow-tsure-raised ring-1 ring-white/30'
                          : isStudying
                            ? 'bg-tsure-surface border-l-4 border-tsure-live shadow-tsure-chip ring-1 ring-tsure-live/20'
                            : 'bg-tsure-surface/90 hover:bg-tsure-surface hover:ring-1 hover:ring-inset hover:ring-tsure-border'
                        : active
                          ? 'border-l-4 border-tsure-primary bg-white'
                          : isStudying
                            ? 'border-l-4 border-tsure-live bg-white'
                            : 'bg-white hover:ring-1 hover:ring-inset hover:ring-tsure-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <p
                        className={`text-sm truncate min-w-0 ${
                          sidebar && active
                            ? 'font-bold text-tsure-primary'
                            : 'font-semibold text-tsure-primary'
                        }`}
                      >
                        {student.name || '—'}
                      </p>
                      {isStudying && (
                        <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold text-tsure-live">
                          <AppIcon icon={Radio} size="xs" />
                          学習中
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-tsure-muted mt-0.5">
                      {student.grade}年{student.class}組 {student.number}番
                      {sidebar && active && (
                        <span className="ml-2 text-[10px] font-semibold text-tsure-accent">
                          選択中
                        </span>
                      )}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
