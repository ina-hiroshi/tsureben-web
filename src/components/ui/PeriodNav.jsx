import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppIcon from './AppIcon';
import {
  formatPeriodLabel,
  getCurrentPeriodAnchor,
  getPeriodNavLabels,
  getReturnToCurrentPeriodLabel,
  isCurrentPeriod,
  PERIOD_MODES,
  shiftPeriodAnchor,
} from '../../utils/studyPeriod';

const DATE_NAV_BTN =
  'inline-flex items-center gap-1 sm:gap-1.5 shrink-0 px-2 sm:px-3 py-2 min-h-touch rounded-xl text-xs sm:text-sm font-semibold text-tsure-on-primary hover:bg-white/10 active:bg-white/15 transition';

const MODE_BTN =
  'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition min-h-touch sm:min-h-0';

const RETURN_BTN =
  'inline-flex items-center justify-center shrink-0 px-2 py-1 rounded-lg text-[11px] sm:text-xs font-semibold text-tsure-on-primary bg-white/15 hover:bg-white/25 active:bg-white/30 transition whitespace-nowrap';

export default function PeriodNav({
  date,
  mode = 'day',
  onModeChange,
  onDateChange,
  stickyTopClass = 'top-[var(--app-header-height)]',
}) {
  const d = dayjs(date);
  const navLabels = getPeriodNavLabels(mode);
  const isCurrent = isCurrentPeriod(d, mode);

  const shift = (direction) => {
    onDateChange(shiftPeriodAnchor(d, mode, direction));
  };

  const goToCurrentPeriod = () => {
    onDateChange(getCurrentPeriodAnchor());
  };

  return (
    <div
      className={`sticky ${stickyTopClass} md:top-0 z-20 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 md:py-0 md:min-h-[var(--app-subheader-height)] mb-4 shrink-0 bg-tsure-bg/95 backdrop-blur`}
    >
      <div className="flex flex-col gap-2 md:gap-3 md:min-h-[var(--app-subheader-height)] md:py-2 md:justify-center">
        <div
          className="flex justify-center gap-1.5"
          role="tablist"
          aria-label="表示期間"
        >
          {PERIOD_MODES.map((periodMode) => {
            const active = mode === periodMode;
            const label = periodMode === 'day' ? '日' : periodMode === 'week' ? '週' : '月';
            return (
              <button
                key={periodMode}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onModeChange(periodMode)}
                className={`${MODE_BTN} ${
                  active
                    ? 'bg-white/20 text-tsure-on-primary'
                    : 'text-tsure-on-primary/70 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1 w-full">
          <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-8">
            <button
              type="button"
              className={DATE_NAV_BTN}
              onClick={() => shift(-1)}
              aria-label={navLabels.previous}
            >
              <AppIcon icon={ChevronLeft} size="sm" />
              <span className="hidden sm:inline">{navLabels.previous}</span>
            </button>

            <span
              className="text-xl sm:text-2xl md:text-3xl font-bold text-tsure-on-primary tabular-nums leading-none tracking-wide text-center"
              aria-label={formatPeriodLabel(d, mode)}
            >
              {formatPeriodLabel(d, mode)}
            </span>

            <button
              type="button"
              className={DATE_NAV_BTN}
              onClick={() => shift(1)}
              aria-label={navLabels.next}
            >
              <span className="hidden sm:inline">{navLabels.next}</span>
              <AppIcon icon={ChevronRight} size="sm" />
            </button>
          </div>

          {!isCurrent && (
            <button
              type="button"
              className={RETURN_BTN}
              onClick={goToCurrentPeriod}
            >
              {getReturnToCurrentPeriodLabel(mode)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
