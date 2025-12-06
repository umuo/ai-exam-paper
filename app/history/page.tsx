'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory, SavedExam, deleteExam } from '@/services/historyService';
import ExamPaper from '@/components/ExamPaper';
import { ArrowLeft, Trash2, Calendar, FileText, ChevronRight } from 'lucide-react';

export default function HistoryPage() {
    const [history, setHistory] = useState<SavedExam[]>([]);
    const [selectedExam, setSelectedExam] = useState<SavedExam | null>(null);

    useEffect(() => {
        setHistory(getHistory());
    }, []);

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('确定要删除这份试卷吗？')) {
            deleteExam(id);
            setHistory(history.filter(exam => exam.id !== id));
            if (selectedExam?.id === id) {
                setSelectedExam(null);
            }
        }
    };

    if (selectedExam) {
        return (
            <div className="bg-gray-50 min-h-[calc(100vh-theme(spacing.16))]">
                <ExamPaper
                    data={selectedExam}
                    onBack={() => setSelectedExam(null)}
                />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-theme(spacing.16))] py-10 animate-fade-in">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">历史试卷</h2>
                        <p className="mt-2 text-gray-600">管理您生成的所有试卷，支持查看、打印和删除。</p>
                    </div>
                    <Link
                        href="/generate"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        新建试卷
                    </Link>
                </div>

                {history.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">暂无历史记录</h3>
                        <p className="mt-1 text-gray-500 mb-6">您还没有生成过任何试卷。</p>
                        <Link
                            href="/generate"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                            去生成第一份试卷 &rarr;
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((exam) => (
                            <div
                                key={exam.id}
                                onClick={() => setSelectedExam(exam)}
                                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer p-5 flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                        {exam.title || '未命名试卷'}
                                    </h3>
                                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(exam.createdAt).toLocaleDateString()} {new Date(exam.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                            {exam.subject}
                                        </span>
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                            {exam.grade}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-gray-400 group-hover:translate-x-1 transition-transform">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, exam.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
