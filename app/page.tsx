'use client';

import { useState } from 'react';
import ExamForm from '@/components/ExamForm';
import ExamPaper from '@/components/ExamPaper';
import { generateExamPaper } from '@/services/geminiService';
import { ExamData, ExamRequest } from '@/types';
import { FileText } from 'lucide-react';

export default function Home() {
    const [step, setStep] = useState<'form' | 'exam'>('form');
    const [isLoading, setIsLoading] = useState(false);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (request: ExamRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateExamPaper(request);
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
        <div className="min-h-screen bg-gray-100 font-sans">

            {/* Header - Hidden on Print */}
            <header className="bg-white border-b border-gray-200 py-4 px-6 mb-8 shadow-sm no-print">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">AI 智能试卷生成器</h1>
                    </div>
                    <div className="text-sm text-gray-500">
                        Powered by Gemini 2.5 Flash
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 pb-12">

                {step === 'form' && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in no-print">
                        <div className="text-center mb-8 max-w-lg">
                            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">一键生成专业试卷</h2>
                            <p className="text-lg text-gray-600">输入年级、科目和知识点，AI 自动为您出题、排版，支持直接打印和导出 PDF。</p>
                        </div>

                        {error && (
                            <div className="w-full max-w-2xl mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                                <span>⚠️ {error}</span>
                            </div>
                        )}

                        <ExamForm onSubmit={handleGenerate} isLoading={isLoading} />

                        {/* Examples */}
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 w-full max-w-4xl">
                            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                <span className="font-bold block text-gray-800 mb-1">小学数学</span>
                                &quot;三年级上册期末复习，重点考察三位数加减法、长方形正方形周长。&quot;
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                <span className="font-bold block text-gray-800 mb-1">初中物理</span>
                                &quot;八年级力学基础，包含重力、弹力、摩擦力的受力分析和简单计算。&quot;
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                <span className="font-bold block text-gray-800 mb-1">高中语文</span>
                                &quot;高一必修上册，古诗词鉴赏专项训练，包含《涉江采芙蓉》等。&quot;
                            </div>
                        </div>
                    </div>
                )}

                {step === 'exam' && examData && (
                    <ExamPaper data={examData} onBack={handleBack} />
                )}

            </main>

            {/* Footer - Hidden on Print */}
            {step === 'form' && (
                <footer className="text-center text-gray-400 py-8 no-print">
                    &copy; {new Date().getFullYear()} ExamGen AI. All rights reserved.
                </footer>
            )}
        </div>
    );
}
