'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import ExamPaper from '@/components/ExamPaper';
import { ExamData } from '@/types';
import { saveExam } from '@/services/historyService';

export default function FormatPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'analyzing' | 'formatting' | 'complete' | 'error'>('idle');
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
        setUploadStatus('parsing');
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/format-exam', {
                method: 'POST',
                body: formData,
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalData: ExamData | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                // Keep the last line in buffer if it's potentially incomplete
                // But since we are controlling server, we usually send newline at end of JSON
                // To be safe, we pop the last one and add it back to buffer if not empty
                // Actually, let's just process all complete lines
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const update = JSON.parse(line);

                        if (update.status === 'error') {
                            throw new Error(update.message);
                        } else if (update.status === 'complete') {
                            finalData = update.data;
                            setUploadStatus('complete');
                        } else {
                            setUploadStatus(update.status);
                        }
                    } catch (e) {
                        if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                            // Only throw real errors, ignore json parse errors on partial chunks if any
                            throw e;
                        }
                    }
                }
            }

            if (!finalData) {
                if (error) return; // Already handled
                throw new Error("Did not receive completion data");
            }

            setExamData(finalData);
            saveExam(finalData);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : '上传失败');
            setUploadStatus('error');
        } finally {
            setIsUploading(false);
            // Reset status if complete after a delay? No, we switch view.
        }
    };

    if (examData) {
        return (
            <div className="bg-gray-50 min-h-[calc(100vh-theme(spacing.16))]">
                <ExamPaper
                    data={examData}
                    onBack={() => {
                        setExamData(null);
                        setUploadStatus('idle');
                    }}
                />
            </div>
        );
    }

    const steps = [
        { id: 'parsing', label: '解析文档', description: '提取文档文本内容' },
        { id: 'analyzing', label: '智能分析', description: '识别试卷结构和题目' },
        { id: 'formatting', label: '生成排版', description: '优化格式与留白' },
    ];

    const getCurrentStepIndex = () => {
        switch (uploadStatus) {
            case 'parsing': return 0;
            case 'analyzing': return 1;
            case 'formatting': return 2;
            case 'complete': return 3;
            default: return -1;
        }
    };

    const currentStepIndex = getCurrentStepIndex();

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
                    {/* Input is always there but disabled during upload */}
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        onChange={handleFileSelect}
                        accept=".pdf,.docx"
                        disabled={isUploading}
                    />

                    <div className="flex flex-col items-center justify-center pointer-events-none relative z-10">
                        {isUploading ? (
                            <div className="w-full max-w-sm mx-auto">
                                <div className="space-y-6">
                                    {steps.map((step, index) => {
                                        const isCompleted = index < currentStepIndex;
                                        const isCurrent = index === currentStepIndex;

                                        return (
                                            <div key={step.id} className="flex items-center gap-4">
                                                <div className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors
                                                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                                                        isCurrent ? 'border-blue-500 text-blue-500' : 'border-gray-200 text-gray-300'}
                                                `}>
                                                    {isCompleted ? (
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : isCurrent ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <span className="text-sm font-medium">{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <p className={`font-medium ${isCompleted ? 'text-gray-900' :
                                                            isCurrent ? 'text-blue-600' : 'text-gray-400'
                                                        }`}>
                                                        {step.label}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{step.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
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

                {!isUploading && (
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
                )}
            </div>
        </div>
    );
}
