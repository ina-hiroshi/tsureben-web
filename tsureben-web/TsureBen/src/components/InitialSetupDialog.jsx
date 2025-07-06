import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';

export default function InitialSetupDialog({
    show,
    grade,
    classNum,
    number,
    shareScope,
    setGrade,
    setClassNum,
    setNumber,
    setShareScope,
    onSave,
}) {
    const [classOptions, setClassOptions] = useState([]);

    useEffect(() => {
        if (grade.startsWith('中')) {
            setClassOptions(['1', '2', '3', '4', '5']);
        } else if (grade.startsWith('高')) {
            setClassOptions(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
        } else {
            setClassOptions([]);
        }
    }, [grade]);

    const numberOptions = Array.from({ length: 45 }, (_, i) => (i + 1).toString());

    return (
        <Dialog open={show} onClose={() => { }}>
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                <div className="p-6 bg-white rounded-xl shadow-md w-[32rem]">
                    <h2 className="text-xl font-bold mb-4 text-[#5a3e28]">初期設定</h2>

                    <div className="space-y-4 text-left">

                        {/* 横並び：学年 + 組 + 出席番号 */}
                        <div className="flex gap-4">
                            <div className="w-1/3">
                                <label className="block font-semibold">学年</label>
                                <select
                                    className="w-full border rounded px-3 py-1"
                                    value={grade}
                                    onChange={e => setGrade(e.target.value)}
                                >
                                    <option value="">選択</option>
                                    <option value="中1">中1</option>
                                    <option value="中2">中2</option>
                                    <option value="中3">中3</option>
                                    <option value="高1">高1</option>
                                    <option value="高2">高2</option>
                                    <option value="高3">高3</option>
                                </select>
                            </div>

                            <div className="w-1/3">
                                <label className="block font-semibold">組</label>
                                <select
                                    className="w-full border rounded px-3 py-1"
                                    value={classNum}
                                    onChange={e => setClassNum(e.target.value)}
                                >
                                    <option value="">選択</option>
                                    {classOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}組</option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-1/3">
                                <label className="block font-semibold">出席番号</label>
                                <select
                                    className="w-full border rounded px-3 py-1"
                                    value={number}
                                    onChange={e => setNumber(e.target.value)}
                                >
                                    <option value="">選択</option>
                                    {numberOptions.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 公開範囲 */}
                        <div>
                            <label className="block font-semibold">公開範囲</label>
                            <select
                                className="w-full border rounded px-3 py-1"
                                value={shareScope}
                                onChange={e => setShareScope(e.target.value)}
                            >
                                <option value="全体公開">全体公開</option>
                                <option value="学年のみ">学年のみ</option>
                                <option value="組のみ">組のみ</option>
                                <option value="個別指定">個別ユーザーのみ</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={onSave}
                        className="mt-6 w-full bg-[#5a3e28] text-white py-2 rounded hover:bg-[#7a5639]"
                    >
                        保存して開始
                    </button>
                </div>
            </div>
        </Dialog>
    );
}