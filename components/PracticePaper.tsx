'use client';

import React, { useRef, useState } from 'react';
import { ExamData, Question, QuestionType } from '@/types';
import { Printer, ArrowLeft, Download, Loader2 } from 'lucide-react';

interface PracticePaperProps {
    data: ExamData;
    onBack: () => void;
}

const PracticePaper: React.FC<PracticePaperProps> = ({ data, onBack }) => {
    const paperRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = () => {
        window.focus();
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleDownloadPDF = async () => {
        if (!paperRef.current || isDownloading) return;
        setIsDownloading(true);

        try {
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default;

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.zIndex = '-9999';
            container.style.width = '794px';
            container.style.background = '#ffffff';

            const originalElement = paperRef.current;
            const clone = originalElement.cloneNode(true) as HTMLElement;

            clone.style.margin = '0';
            clone.style.width = '100%';
            clone.style.height = 'auto';
            clone.style.boxShadow = 'none';
            clone.style.maxWidth = 'none';
            clone.style.minWidth = 'none';
            clone.classList.remove('mx-auto', 'shadow-2xl');

            container.appendChild(clone);
            document.body.appendChild(container);

            await new Promise(resolve => setTimeout(resolve, 100));

            const opt = {
                margin: 0,
                filename: `${data.title || 'practice'}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: 794,
                    windowWidth: 794
                },
                jsPDF: {
                    unit: 'mm' as const,
                    format: 'a4' as const,
                    orientation: 'portrait' as const
                },
                pagebreak: { mode: ['css', 'legacy'] as const }
            };

            await html2pdf().set(opt).from(clone).save();
            document.body.removeChild(container);

        } catch (error) {
            console.error("PDF generation failed", error);
            alert("PDF导出遇到问题，请尝试使用'打印' -> '另存为PDF'。");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-5xl mx-auto pb-12">

            {/* Action Bar */}
            <div className="w-full flex justify-between items-center mb-8 px-4 no-print sticky top-0 bg-gray-100/90 backdrop-blur-sm py-4 z-10 border-b border-gray-200">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-white active:bg-gray-100"
                >
                    <ArrowLeft size={20} />
                    返回设置
                </button>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {isDownloading ? '生成中...' : '导出 PDF'}
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium shadow-md hover:bg-purple-700 transition-all active:scale-95"
                    >
                        <Printer size={18} />
                        打印练习
                    </button>
                </div>
            </div>

            {/* The Paper Container */}
            <div
                id="printable-content"
                ref={paperRef}
                className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-[20mm] box-border relative font-serif text-black mx-auto"
            >

                {/* Practice Header - Simplified */}
                <div className="text-center mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-3xl font-bold mb-2 tracking-wider">{data.title}</h1>
                    <div className="flex justify-center gap-8 text-sm mt-4 text-gray-600">
                        <span>{data.subject}</span>
                        <span>|</span>
                        <span>{data.grade}</span>
                        <span>|</span>
                        <span>共 {data.sections[0]?.questions.length || 0} 题</span>
                    </div>

                    <div className="flex justify-between mt-6 px-12">
                        <div className="text-sm">姓名：_____________</div>
                        <div className="text-sm">日期：_____________</div>
                        <div className="text-sm">成绩：_____________</div>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    {data.sections.map((section, sIndex) => {
                        return (
                            <div key={sIndex}>
                                <div className={`space-y-4 ${section.questions[0] && [
                                        QuestionType.CALCULATION,
                                        QuestionType.JUDGMENT,
                                        QuestionType.FILL_IN_BLANK
                                    ].includes(section.questions[0].type)
                                        ? 'grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 space-y-0'
                                        : ''
                                    }`}>
                                    {section.questions.map((q, qIndex) => (
                                        <QuestionItem key={q.id} question={q} index={qIndex + 1} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-gray-400 border-t pt-4 no-print">
                    仅供练习使用
                </div>

            </div>
        </div>
    );
};

const QuestionItem: React.FC<{ question: Question; index: number }> = ({ question, index }) => {
    const processQuestionText = (text: string, type: QuestionType) => {
        let processedText = text;
        if (type === QuestionType.FILL_IN_BLANK) {
            processedText = processedText.replace(/_{2,}/g, ' ______________ ');
            processedText = processedText.replace(/[(（]\s*[)）]/g, '（ ______________ ）');
        }
        return processedText;
    };

    return (
        <div className="mb-6 break-inside-avoid">
            <div className="flex gap-2">
                <span className="font-semibold select-none pt-1 text-lg">{index}.</span>
                <div className="flex-1">
                    <div className="leading-8 text-justify text-lg">
                        <span>{processQuestionText(question.text, question.type)}</span>

                        {question.type === QuestionType.MULTIPLE_CHOICE && (
                            <span className="inline-block ml-4 font-serif">（ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ）</span>
                        )}
                        {question.type === QuestionType.JUDGMENT && (
                            <span className="inline-block ml-4 font-serif">（ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ）</span>
                        )}
                    </div>

                    {question.imageUrl && (
                        <div className="my-2 p-1 border border-transparent rounded block w-fit">
                            <img
                                src={question.imageUrl}
                                alt="Figure"
                                style={{ maxHeight: '250px', maxWidth: '100%', display: 'block' }}
                                crossOrigin="anonymous"
                            />
                        </div>
                    )}

                    {question.type === QuestionType.MULTIPLE_CHOICE && question.options && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 ml-2">
                            {question.options.map((opt, i) => (
                                <div key={i} className="flex gap-1 leading-normal text-lg">
                                    <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
                                    <span>{opt}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {(question.type === QuestionType.SHORT_ANSWER || question.type === QuestionType.CALCULATION || question.type === QuestionType.ESSAY) && (
                        <div className="w-full mt-4 border-b border-transparent">
                            {/* Increase space for specialized practice, often calculation needs more space */}
                            {Array.from({ length: question.answerSpaceLines || 5 }).map((_, i) => (
                                <div key={i} className="w-full h-8 border-b border-gray-300 border-dashed" />
                            ))}
                            <div className="h-4"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PracticePaper;
