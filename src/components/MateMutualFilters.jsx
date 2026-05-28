import { useMemo } from 'react';
import Input from './ui/Input';
import FilterSelect from './ui/FilterSelect';
import Button from './ui/Button';
import { getMateFilterOptions } from '../utils/filterMateUsers';

export default function MateMutualFilters({
  open,
  users,
  query,
  onQueryChange,
  schoolName,
  onSchoolNameChange,
  grade,
  onGradeChange,
  classNum,
  onClassChange,
  onClear,
}) {
  const { schools, grades, classes } = getMateFilterOptions(users, { grade });

  const schoolOptions = useMemo(
    () => [
      { value: '', label: 'すべて' },
      ...schools.map((name) => ({ value: name, label: name })),
    ],
    [schools]
  );

  const gradeOptions = useMemo(
    () => [
      { value: '', label: 'すべて' },
      ...grades.map((g) => ({ value: g, label: `${g}年` })),
    ],
    [grades]
  );

  const classOptions = useMemo(
    () => [
      { value: '', label: 'すべて' },
      ...classes.map((c) => ({ value: c, label: `${c}組` })),
    ],
    [classes]
  );

  if (!open) return null;

  return (
    <div className="mb-4 sticky top-16 md:top-0 z-10 overflow-visible -mx-4 px-4 py-3 bg-tsure-surface/95 backdrop-blur-sm border-b border-tsure-border md:static md:mx-0 md:px-0 md:py-0 md:border-0 md:bg-transparent md:backdrop-blur-none">
      <div className="space-y-3">
        <Input
          label="検索"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="名前・学校・学年など"
          autoComplete="off"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FilterSelect
            label="学校"
            value={schoolName}
            onChange={onSchoolNameChange}
            options={schoolOptions}
          />
          <FilterSelect
            label="学年"
            value={grade}
            onChange={onGradeChange}
            options={gradeOptions}
          />
          <FilterSelect
            label="組"
            value={classNum}
            onChange={onClassChange}
            options={classOptions}
          />
        </div>

        {onClear && (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={onClear}>
              条件をクリア
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
