import Card from './ui/Card';
import { Clock } from 'lucide-react';
import AppIcon from './ui/AppIcon';

const SUBJECT_COLORS = {
  国語: 'bg-pink-400',
  数学: 'bg-blue-400',
  英語: 'bg-purple-400',
  理科: 'bg-green-400',
  社会: 'bg-amber-400',
  情報: 'bg-indigo-400',
  その他: 'bg-gray-400',
};

function barColor(subject) {
  return SUBJECT_COLORS[subject] || 'bg-tsure-muted';
}

function aggregateByTopic(entries = []) {
  const map = {};
  for (const entry of entries) {
    const mins = Number(entry.duration) || 0;
    if (mins <= 0) continue;
    const subject = entry.subject || 'その他';
    const topic = (entry.topic || '').trim() || subject;
    if (!map[topic]) {
      map[topic] = { minutes: 0, subject };
    }
    map[topic].minutes += mins;
    map[topic].subject = subject;
  }
  return Object.entries(map)
    .map(([topic, { minutes, subject }]) => ({ topic, minutes, subject }))
    .sort((a, b) => b.minutes - a.minutes);
}

export default function TodayStudySummary({ totalMinutes = 0, entries = [] }) {
  const topics = aggregateByTopic(entries);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hasTime = totalMinutes > 0;

  return (
    <Card className="overflow-hidden !p-0">
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-tsure-accent/15 via-transparent to-transparent">
        <div className="flex items-center gap-2 text-tsure-primary mb-3">
          <AppIcon icon={Clock} size="sm" />
          <span className="text-xs font-semibold tracking-wide">本日の学習時間</span>
        </div>

        <div className="flex items-end justify-center gap-1 tabular-nums text-tsure-primary">
          {hours > 0 && (
            <>
              <span className="text-5xl font-bold leading-none">{hours}</span>
              <span className="text-base font-medium text-tsure-muted pb-1.5">時間</span>
            </>
          )}
          <span className="text-5xl font-bold leading-none">{hours > 0 ? mins : totalMinutes}</span>
          <span className="text-base font-medium text-tsure-muted pb-1.5">分</span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        {hasTime && topics.length > 0 ? (
          <>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-tsure-surface-hover">
              {topics.map(({ topic, minutes, subject }) => (
                <div
                  key={topic}
                  className={`${barColor(subject)} transition-all`}
                  style={{ width: `${(minutes / totalMinutes) * 100}%` }}
                  title={`${topic} ${minutes}分`}
                />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {topics.map(({ topic, minutes, subject }) => (
                <li key={topic} className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${barColor(subject)}`} />
                  <span className="text-sm text-tsure-primary truncate" title={topic}>
                    {topic}
                  </span>
                  <span className="text-xs text-tsure-muted tabular-nums ml-auto shrink-0">
                    {minutes}分
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-center text-sm text-tsure-muted py-1">
            学習タイマーで記録すると、科目別の内訳が表示されます
          </p>
        )}
      </div>
    </Card>
  );
}
