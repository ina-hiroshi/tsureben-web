import { isDemoMateEmail } from '../dev/demoMate';
import { formatMateAffiliation } from '../utils/formatMateAffiliation';

/** 連れ勉リスト共通の1件表示（カード型） */
export default function MateListItem({ user, actions }) {
  const affiliation = formatMateAffiliation(user);

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl border border-tsure-border bg-white/70 p-3 min-w-0 shadow-tsure-chip">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-tsure-primary leading-snug">
          {user.name || user.email}
          {isDemoMateEmail(user.email) && (
            <span className="text-xs font-normal text-tsure-muted ml-1">（デモ）</span>
          )}
        </p>
        {affiliation && (
          <p className="text-xs text-tsure-muted mt-0.5 leading-snug line-clamp-2">{affiliation}</p>
        )}
      </div>
      {actions ? (
        <div className="shrink-0 flex flex-col gap-1 items-end">{actions}</div>
      ) : null}
    </li>
  );
}
