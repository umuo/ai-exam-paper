'use client';

import React, { useState, useEffect } from 'react';
import { EducationLevel, PracticeRequest, QuestionType } from '@/types';
import { BookOpen, Sparkles, Loader2, ArrowLeft, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { optimizeTopicDescriptionStream } from '@/services/geminiService';

interface PracticeFormProps {
    onSubmit: (data: PracticeRequest) => void;
    isLoading: boolean;
}

const GRADE_OPTIONS: Record<EducationLevel, string[]> = {
    [EducationLevel.PRIMARY]: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    [EducationLevel.MIDDLE]: ['初一 (七年级)', '初二 (八年级)', '初三 (九年级)'],
    [EducationLevel.HIGH]: ['高一', '高二', '高三'],
};

const QUESTION_TYPES = [
    { value: QuestionType.CALCULATION, label: '计算题' },
    { value: QuestionType.MULTIPLE_CHOICE, label: '选择题' },
    { value: QuestionType.FILL_IN_BLANK, label: '填空题' },
    { value: 'application', label: '应用题' }, // will map to CALCULATION or SHORT_ANSWER in backend logic or text
    { value: 'geometry', label: '几何图形题' },
];

const PracticeForm: React.FC<PracticeFormProps> = ({ onSubmit, isLoading }) => {
    const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
    const [gradeSpec, setGradeSpec] = useState(GRADE_OPTIONS[EducationLevel.PRIMARY][2]);
    const [subject, setSubject] = useState('数学');
    const [questionType, setQuestionType] = useState<string>(QuestionType.CALCULATION);
    const [topicDescription, setTopicDescription] = useState('');
    const [count, setCount] = useState(10);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const handleOptimizeDescription = async () => {
        const currentInput = topicDescription;
        if (!currentInput.trim()) return;

        setIsOptimizing(true);
        try {
            const stream = optimizeTopicDescriptionStream(currentInput, gradeSpec, subject);
            let accumulatedText = '';
            let hasReceivedFirstChunk = false;

            for await (const chunk of stream) {
                if (chunk) {
                    accumulatedText += chunk;
                    setTopicDescription(accumulatedText);
                    hasReceivedFirstChunk = true;
                }
            }

            if (!hasReceivedFirstChunk && !accumulatedText) {
                setTopicDescription(currentInput);
            }
        } catch (e) {
            console.error(e);
            setTopicDescription(currentInput);
        } finally {
            setIsOptimizing(false);
        }
    };

    useEffect(() => {
        const defaultGrade = GRADE_OPTIONS[level][0];
        setGradeSpec(defaultGrade);
    }, [level]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicDescription.trim()) return;

        onSubmit({
            level,
            gradeSpec,
            subject,
            questionType: questionType as QuestionType, // Simplification for now, strictly it might need casting or handling custom types like 'geometry'
            topicDescription,
            count
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-2xl mx-auto">
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft size={16} className="mr-1" /> 返回首页
            </Link>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                    <BookOpen size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">专项练习生成</h2>
                    <p className="text-gray-500 text-sm">选择题型，针对性突破薄弱环节</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Row 1: Level and Grade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">学段</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as EducationLevel)}
                            className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none bg-white"
                        >
                            {Object.values(EducationLevel).map((l) => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">具体年级</label>
                        <select
                            value={gradeSpec}
                            onChange={(e) => setGradeSpec(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none bg-white"
                        >
                            {GRADE_OPTIONS[level].map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Row 2: Subject and Question Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">科目</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="例如：数学、物理"
                            className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">题目类型</label>
                        <select
                            value={questionType}
                            onChange={(e) => setQuestionType(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-purple-500 transition-all outline-none bg-white"
                        >
                            {QUESTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Row 3: Count */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">题目数量 ({count})</label>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>5题</span>
                        <span>50题</span>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-gray-700">
                            考察知识点 / 范围描述 <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={handleOptimizeDescription}
                            disabled={isOptimizing || !topicDescription.trim()}
                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="让 AI 帮你完善描述"
                        >
                            {isOptimizing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                            AI 智能润色
                        </button>
                    </div>
                    <div className="relative">
                        <textarea
                            value={topicDescription}
                            onChange={(e) => setTopicDescription(e.target.value)}
                            readOnly={isOptimizing}
                            placeholder="例如：两位数乘法，或者：三角形全等判定。"
                            className={`w-full rounded-lg border p-3 h-24 focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-colors ${isOptimizing ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-gray-300'
                                }`}
                            required
                        />
                        {isOptimizing && (
                            <span className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-purple-500 animate-pulse">
                                <Wand2 size={12} />
                                正在优化...
                            </span>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !topicDescription.trim()}
                    className={`w-full py-3.5 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg ${isLoading
                        ? 'bg-purple-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.99]'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            正在生成练习...
                        </>
                    ) : (
                        <>
                            <Sparkles size={20} />
                            立即生成练习
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default PracticeForm;
