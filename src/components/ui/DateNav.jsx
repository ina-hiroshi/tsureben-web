import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppIcon from './AppIcon';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** 日付表示と同色（tsure-on-primary）。ダーク subheader 専用 */
const DATE_NAV_BTN =
  'inline-flex items-center gap-1 sm:gap-1.5 shrink-0 px-2 sm:px-3 py-2 min-h-touch rounded-xl text-xs sm:text-sm font-semibold text-tsure-on-primary hover:bg-white/10 active:bg-white/15 transition';

export default function DateNav({ date, onPrevious, onNext }) {
  const d = dayjs(date);

  return (
    <div className="sticky top-16 md:top-0 z-20 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 md:py-0 md:h-[var(--app-subheader-height)] mb-4 shrink-0 bg-tsure-bg/95 backdrop-blur border-b border-white/10 flex items-center">
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
        <button type="button" className={DATE_NAV_BTN} onClick={onPrevious} aria-label="前の日">
          <AppIcon icon={ChevronLeft} size="sm" />
          前の日
        </button>
        <span
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-tsure-on-primary tabular-nums leading-none tracking-wide px-0.5 sm:px-1 text-center min-w-0"
          aria-label={`${d.format('M月D日')} ${DAY_LABELS[d.day()]}曜日`}
        >
          {d.format('M月D日')}
          （{DAY_LABELS[d.day()]}）
        </span>
        <button type="button" className={DATE_NAV_BTN} onClick={onNext} aria-label="次の日">
          次の日
          <AppIcon icon={ChevronRight} size="sm" />
        </button>
      </div>
    </div>
  );
}
