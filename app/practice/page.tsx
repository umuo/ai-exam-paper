'use client';

import React, { useState } from 'react';
import PracticeForm from '@/components/PracticeForm';
import PracticePaper from '@/components/PracticePaper';
import { PracticeRequest, ExamData } from '@/types';
import { generatePracticeQuestions } from '@/services/geminiService';
import { saveExam } from '@/services/historyService';

export default function PracticePage() {
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async (request: PracticeRequest) => {
        setIsLoading(true);
        try {
            const data = await generatePracticeQuestions(request);
            setExamData(data);
            saveExam(data); // Auto-save to history
        } catch (error) {
            console.error(error);
            alert('生成练习失败，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
            <div className="max-w-7xl mx-auto">
                {!examData ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <PracticeForm onSubmit={handleGenerate} isLoading={isLoading} />
                        {/* Instructions or tips could go here */}
                    </div>
                ) : (
                    <PracticePaper
                        data={examData}
                        onBack={() => setExamData(null)}
                    />
                )}
            </div>
        </div>
    );
}
