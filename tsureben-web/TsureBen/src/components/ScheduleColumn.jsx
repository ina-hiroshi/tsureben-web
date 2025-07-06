import dayjs from 'dayjs';
import { Trash } from 'lucide-react';

export default function ScheduleColumn({
    title,
    hours,
    onClickSlot,
    onDeleteSlot,
    plans = {},
}) {
    const subjectColors = {
        国語: 'bg-pink-200 text-pink-800 border-l-4 border-pink-400',
        数学: 'bg-blue-200 text-blue-800 border-l-4 border-blue-400',
        英語: 'bg-purple-200 text-purple-800 border-l-4 border-purple-400',
        理科: 'bg-green-200 text-green-800 border-l-4 border-green-400',
        社会: 'bg-yellow-200 text-yellow-800 border-l-4 border-yellow-400',
        情報: 'bg-indigo-200 text-indigo-800 border-l-4 border-indigo-400',
        その他: 'bg-gray-200 text-gray-800 border-l-4 border-gray-400',
    };

    const shownEntryKeys = new Set(); // 表示済みentry
    const maskedHours = new Set(); // スロット非表示対象

    // 🔸 事前に全スロットのmask対象を調査
    Object.values(plans).flat().forEach(entry => {
        const start = dayjs(`${entry.date}T${entry.start}`);
        const end = dayjs(`${entry.date}T${entry.end}`);
        const durationHour = end.diff(start, 'hour', true);
        const startHour = entry.start.split(':')[0].padStart(2, '0');

        for (let i = 1; i < durationHour; i++) {
            const masked = (parseInt(startHour) + i).toString().padStart(2, '0');
            maskedHours.add(masked);
        }
    });

    return (
        <div>
            <div style={{ height: '100%', overflowY: 'auto' }}>
                <h2 className="font-bold text-[#6b4a2b] mb-2 text-center">{title}</h2>

                {hours.slice(0, -1).map((time, idx) => {
                    const hour = time.split(':')[0].padStart(2, '0');
                    if (maskedHours.has(hour)) return null;

                    // 枠の代表になる entry（start === hour）
                    const masterEntry = Object.values(plans)
                        .flat()
                        .find(entry => {
                            const start = dayjs(`${entry.date}T${entry.start}`);
                            return start.format('HH') === hour;
                        });

                    let entries = [];
                    if (masterEntry) {
                        const masterStart = dayjs(`${masterEntry.date}T${masterEntry.start}`);
                        const masterEnd = dayjs(`${masterEntry.date}T${masterEntry.end}`);
                        entries = Object.values(plans)
                            .flat()
                            .filter(entry => {
                                const start = dayjs(`${entry.date}T${entry.start}`);
                                const end = dayjs(`${entry.date}T${entry.end}`);
                                return start.isBefore(masterEnd) && end.isAfter(masterStart);
                            });
                    }

                    return (
                        <div key={idx} className="mb-1">
                            {/* 時刻ラベル */}
                            <div className="flex items-center">
                                <span className="w-16 text-right text-sm text-[#7c624e] mr-2">{time}</span>
                                <hr className="flex-1 border-[#d3c4ae]" />
                            </div>

                            {/* 計画エリア */}
                            <div className="ml-[4.5rem] space-y-1">
                                {entries.map((entry, entryIdx) => {
                                    const start = dayjs(`${entry.date}T${entry.start}`);
                                    const end = dayjs(`${entry.date}T${entry.end}`);
                                    const durationHour = end.diff(start, 'hour', true);
                                    const height = Math.max(Math.round(durationHour * 80), 80);

                                    const entryKey = `${entry.date}-${entry.start}-${entry.end}-${entry.subject}-${entry.topic}`;
                                    if (shownEntryKeys.has(entryKey)) return null;
                                    shownEntryKeys.add(entryKey);

                                    return (
                                        <div
                                            key={`${idx}-${entryIdx}`}
                                            className={`relative rounded-md text-xs shadow-sm cursor-pointer hover:scale-105 transition-transform overflow-hidden ${subjectColors[entry.subject] || 'bg-[#dac7b4] text-black'}`}
                                            style={{
                                                height: `${height}px`,
                                                paddingTop: '0.5rem',
                                                paddingBottom: '0.5rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                gap: '0.5rem',
                                            }}
                                            onClick={() => onClickSlot(hour, entryIdx)}
                                        >
                                            {/* 削除ボタン */}
                                            <button
                                                className="absolute top-1 right-1 text-gray-500 hover:text-red-600 z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteSlot?.(hour, entryIdx);
                                                }}
                                            >
                                                <Trash size={20} />
                                            </button>

                                            <div className="px-2 space-y-1 whitespace-nowrap">
                                                <div className="font-bold">{entry.subject} / {entry.topic}</div>
                                                <div className="text-[10px]">{entry.book}</div>
                                                <div className="text-[10px]">{entry.start}〜{entry.end}</div>
                                            </div>

                                            <div
                                                className="flex-1 text-sm font-semibold text-[#4b3b2b] pr-6 whitespace-pre-wrap break-words"
                                                style={{ maxWidth: 'calc(100% - 2.5rem)' }}
                                            >
                                                {entry.content}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ＋追加ボタン */}
                                <div
                                    className="h-6 bg-[#f6f1ea] rounded text-center text-sm text-[#a68c76] hover:scale-105 transition-transform cursor-pointer font-normal"
                                    onClick={() => onClickSlot(hour)}
                                >
                                    ＋追加
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 最後の時刻 */}
                <div className="flex items-center mt-1">
                    <span className="w-16 text-right text-sm text-[#7c624e] mr-2">{hours[hours.length - 1]}</span>
                    <hr className="flex-1 border-[#d3c4ae]" />
                </div>
            </div>
        </div>
    );
}