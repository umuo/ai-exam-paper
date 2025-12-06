'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import ExamPaper from '@/components/ExamPaper';
import { ExamData } from '@/types';
import { saveExam } from '@/services/historyService';

export default function FormatPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [examData, setExamData] = useState<ExamData | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleUpload(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        if (!file.type.includes('pdf') && !file.name.endsWith('.docx')) {
            setError('请上传 PDF 或 Word (.docx) 文件');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/format-exam', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || '解析失败，请重试');
            }

            const data: ExamData = await response.json();
            setExamData(data);
            saveExam(data); // Auto-save to history
        } catch (err) {
            setError(err instanceof Error ? err.message : '上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    if (examData) {
        return (
            <div className="bg-gray-50 min-h-[calc(100vh-theme(spacing.16))]">
                <ExamPaper
                    data={examData}
                    onBack={() => setExamData(null)}
                />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-theme(spacing.16))] py-12 animate-fade-in text-center px-4">
            <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">试卷排版优化</h2>
                <p className="text-lg text-gray-600 mb-12">
                    上传您的 Word 或 PDF 试卷，AI 将自动整理格式、统一排版，让试卷更专业、易于打印。
                </p>

                <div
                    className={`
                        relative border-2 border-dashed rounded-2xl p-12 transition-all
                        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileSelect}
                        accept=".pdf,.docx"
                        disabled={isUploading}
                    />

                    <div className="flex flex-col items-center justify-center pointer-events-none">
                        {isUploading ? (
                            <>
                                <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                                <p className="text-lg font-medium text-gray-900">正在解析文件...</p>
                                <p className="text-sm text-gray-500 mt-2">大型文件可能需要几分钟，请耐心等待</p>
                            </>
                        ) : (
                            <>
                                <div className="bg-blue-100 p-4 rounded-full mb-6 text-blue-600">
                                    <Upload size={32} />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    点击或拖拽文件到这里
                                </h3>
                                <p className="text-gray-500 max-w-sm mx-auto">
                                    支持 PDF 和 Word (.docx) 格式。文件大小建议不超过 10MB。
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-center gap-2">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3 text-blue-700">
                            <FileText size={20} />
                            <h4 className="font-semibold">智能排版</h4>
                        </div>
                        <p className="text-sm text-gray-500">
                            自动调整题目间距，规范括号大小，确保学生有足够的书写空间。
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3 text-purple-700">
                            <FileText size={20} />
                            <h4 className="font-semibold">一键导出</h4>
                        </div>
                        <p className="text-sm text-gray-500">
                            整理后的试卷可以直接生成 PDF 进行打印，或保存到历史记录中。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
