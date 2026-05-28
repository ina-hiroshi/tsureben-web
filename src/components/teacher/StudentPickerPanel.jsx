import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchStudentsForSchool } from '../../services/firestore/userService';
import { uniqueSorted } from '../../utils/adminStudents';
import { mergeDemoStudents } from '../../dev/demoTeacherReview';
import { useDemoSettingsRevision } from '../../hooks/useDemoSettings';
import FilterSelect from '../ui/FilterSelect';
import SuggestInput from '../ui/SuggestInput';
import EmptyState from '../ui/EmptyState';
import { TEACHER_STUDENT_EMPTY } from '../../content/emptyStatePresets';

export default function StudentPickerPanel({
  schoolId,
  selectedEmail,
  onSelect,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const demoRevision = useDemoSettingsRevision();

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

  useEffect(() => {
    setFilterGrade('');
    setFilterClass('');
    setNameQuery('');
  }, [schoolId]);

  const gradeOptions = useMemo(
    () => uniqueSorted(students.map((s) => s.grade)),
    [students]
  );

  const classOptions = useMemo(() => {
    const source = filterGrade
      ? students.filter((s) => String(s.grade ?? '') === filterGrade)
      : students;
    return uniqueSorted(source.map((s) => s.class));
  }, [students, filterGrade]);

  const nameSuggestions = useMemo(
    () => uniqueSorted(students.map((s) => s.name)),
    [students]
  );

  const filteredStudents = useMemo(() => {
    let list = students;
    if (filterGrade) {
      list = list.filter((s) => String(s.grade ?? '') === filterGrade);
    }
    if (filterClass) {
      list = list.filter((s) => String(s.class ?? '') === filterClass);
    }
    const name = nameQuery.trim();
    if (name) {
      list = list.filter((s) => String(s.name ?? '').includes(name));
    }
    return list;
  }, [students, filterGrade, filterClass, nameQuery]);

  if (!schoolId) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
        学校が選択されていません。super_admin の場合は上の学校プルダウンから選んでください。
      </p>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-full gap-3">
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <FilterSelect
          label="学年"
          value={filterGrade}
          onChange={(value) => {
            setFilterGrade(value);
            setFilterClass('');
          }}
          options={[
            { value: '', label: 'すべて' },
            ...gradeOptions.map((g) => ({ value: g, label: `${g}年` })),
          ]}
          disabled={loading}
        />
        <FilterSelect
          label="組"
          value={filterClass}
          onChange={setFilterClass}
          options={[
            { value: '', label: 'すべて' },
            ...classOptions.map((c) => ({ value: c, label: `${c}組` })),
          ]}
          disabled={loading}
        />
        <div className="col-span-2">
          <SuggestInput
            label="氏名"
            value={nameQuery}
            onChange={setNameQuery}
            suggestions={nameSuggestions}
            placeholder="氏名で検索"
            disabled={loading}
          />
        </div>
      </div>

      <p className="text-xs text-tsure-muted tabular-nums shrink-0">
        {loading
          ? '読み込み中...'
          : `${filteredStudents.length} 件${filteredStudents.length !== students.length ? ` / 全 ${students.length} 件` : ''}`}
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain border border-tsure-border rounded-xl bg-white [-webkit-overflow-scrolling:touch]">
        {loading && (
          <p className="text-sm text-tsure-muted text-center py-8">読み込み中...</p>
        )}
        {!loading && filteredStudents.length === 0 && (
          <div className="p-4">
            <EmptyState {...TEACHER_STUDENT_EMPTY} />
          </div>
        )}
        {!loading && filteredStudents.length > 0 && (
          <ul className="divide-y divide-tsure-border">
            {filteredStudents.map((student) => {
              const active = selectedEmail === student.email;
              return (
                <li key={student.email}>
                  <button
                    type="button"
                    onClick={() => onSelect(student)}
                    className={`w-full text-left px-3 py-3 bg-white transition ${
                      active ? 'border-l-4 border-tsure-primary' : 'hover:ring-1 hover:ring-inset hover:ring-tsure-border'
                    }`}
                  >
                    <p className="font-semibold text-tsure-primary text-sm truncate">
                      {student.name || '—'}
                    </p>
                    <p className="text-xs text-tsure-muted mt-0.5">
                      {student.grade}年{student.class}組 {student.number}番
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
