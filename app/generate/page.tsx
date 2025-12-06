'use client';

import { useState } from 'react';
import ExamForm from '@/components/ExamForm';
import ExamPaper from '@/components/ExamPaper';
import { generateExamPaper } from '@/services/geminiService';
import { saveExam } from '@/services/historyService';
import { ExamData, ExamRequest } from '@/types';

export default function GeneratePage() {
    const [step, setStep] = useState<'form' | 'exam'>('form');
    const [isLoading, setIsLoading] = useState(false);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (request: ExamRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateExamPaper(request);
            saveExam(data);
            setExamData(data);
            setStep('exam');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        setStep('form');
    };

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-theme(spacing.16))]">
            {step === 'form' && (
                <div className="flex flex-col items-center justify-center py-10 animate-fade-in no-print">
                    <div className="text-center mb-10 max-w-2xl">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4 sm:text-4xl">一键生成专业试卷</h2>
                        <p className="text-lg text-gray-600">输入年级、科目和知识点，AI 自动为您出题、排版，支持直接打印和导出 PDF。</p>
                    </div>

                    {error && (
                        <div className="w-full max-w-2xl mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                            <span>⚠️ {error}</span>
                        </div>
                    )}

                    <ExamForm onSubmit={handleGenerate} isLoading={isLoading} />

                    {/* Examples */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-500 w-full max-w-5xl px-4">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="font-semibold block text-blue-600 mb-2">小学数学</span>
                            &quot;三年级上册期末复习，重点考察三位数加减法、长方形正方形周长。&quot;
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="font-semibold block text-blue-600 mb-2">初中物理</span>
                            &quot;八年级力学基础，包含重力、弹力、摩擦力的受力分析和简单计算。&quot;
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="font-semibold block text-blue-600 mb-2">高中语文</span>
                            &quot;高一必修上册，古诗词鉴赏专项训练，包含《涉江采芙蓉》等。&quot;
                        </div>
                    </div>
                </div>
            )}

            {step === 'exam' && examData && (
                <ExamPaper data={examData} onBack={handleBack} />
            )}
        </div>
    );
}
