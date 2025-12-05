import React, { useState, useEffect } from 'react';
import { EducationLevel, ExamRequest } from '../types';
import { BookOpen, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { optimizeTopicDescriptionStream } from '../services/geminiService';

interface ExamFormProps {
  onSubmit: (data: ExamRequest) => void;
  isLoading: boolean;
}

// Define grade options for each level
const GRADE_OPTIONS: Record<EducationLevel, string[]> = {
  [EducationLevel.PRIMARY]: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  [EducationLevel.MIDDLE]: ['初一 (七年级)', '初二 (八年级)', '初三 (九年级)'],
  [EducationLevel.HIGH]: ['高一', '高二', '高三'],
};

const ExamForm: React.FC<ExamFormProps> = ({ onSubmit, isLoading }) => {
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [gradeSpec, setGradeSpec] = useState(GRADE_OPTIONS[EducationLevel.PRIMARY][2]); // Default to 3rd grade
  const [subject, setSubject] = useState('数学');
  const [topicDescription, setTopicDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Update grade options when level changes
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
      topicDescription,
      difficulty
    });
  };

  const handleOptimizeDescription = async () => {
    const currentInput = topicDescription;
    if (!currentInput.trim()) return;
    
    setIsOptimizing(true);
    // NOTE: We do NOT clear the input here. We wait for the first chunk to arrive.
    // This prevents a jarring "empty box" state while the AI is thinking.

    try {
      const stream = optimizeTopicDescriptionStream(currentInput, gradeSpec, subject);
      let accumulatedText = '';
      let hasReceivedFirstChunk = false;
      
      for await (const chunk of stream) {
        if (chunk) {
          accumulatedText += chunk;
          // As soon as we have data, we update the state.
          // Since accumulatedText starts empty, the first update effectively 
          // "clears" the old user input and shows the first chunk.
          setTopicDescription(accumulatedText);
          hasReceivedFirstChunk = true;
        }
      }
      
      // If the stream completed but we got nothing (rare), revert to original
      if (!hasReceivedFirstChunk && !accumulatedText) {
        setTopicDescription(currentInput);
      }

    } catch (e) {
      console.error(e);
      // Restore original text on error
      setTopicDescription(currentInput);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
          <BookOpen size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">试卷生成设置</h2>
          <p className="text-gray-500 text-sm">填写信息，AI 将为您生成专业的试卷</p>
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
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
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
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
            >
              {GRADE_OPTIONS[level].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Subject and Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">科目</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例如：数学、语文、英语"
              className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">难度偏好</label>
            <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    difficulty === d 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {d === 'easy' ? '基础' : d === 'medium' ? '适中' : '挑战'}
                </button>
              ))}
            </div>
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
              placeholder="例如：100以内加减法，包含进位加法；或者是：古诗词默写与鉴赏，重点考察唐诗。"
              className={`w-full rounded-lg border p-3 h-32 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-colors ${
                isOptimizing ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-gray-300'
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
          disabled={isLoading || !topicDescription.trim() || isOptimizing}
          className={`w-full py-3.5 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg ${
            isLoading || isOptimizing 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              正在生成试卷... (AI 思考中)
            </>
          ) : (
            <>
              <Sparkles size={20} />
              立即生成试卷
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ExamForm;