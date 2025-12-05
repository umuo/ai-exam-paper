'use client';

import React, { useRef, useState } from 'react';
import { ExamData, Question, QuestionType } from '@/types';
import { Printer, ArrowLeft, Download, Loader2 } from 'lucide-react';

interface ExamPaperProps {
  data: ExamData;
  onBack: () => void;
}

const ExamPaper: React.FC<ExamPaperProps> = ({ data, onBack }) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    // Ensure window has focus for the print dialog to appear (crucial for iframes)
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async () => {
    if (!paperRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      // Dynamically import html2pdf
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;

      // Create a temporary container for PDF generation
      // We use a clone to isolate the element from current page layout (flexbox, margins)
      // which often causes issues with html2canvas coordinates.
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      // Place it behind everything but ensure it's part of the layout flow for capture
      container.style.zIndex = '-9999';
      container.style.width = '794px'; // Exact A4 width at 96 DPI
      container.style.background = '#ffffff';

      // Clone the paper element
      const originalElement = paperRef.current;
      const clone = originalElement.cloneNode(true) as HTMLElement;

      // Reset styles on the clone to strictly fit A4
      clone.style.margin = '0';
      clone.style.width = '100%';
      clone.style.height = 'auto'; // Let content dictate height
      clone.style.boxShadow = 'none';
      clone.style.maxWidth = 'none';
      clone.style.minWidth = 'none';
      // Remove centering or layout classes that might interfere
      clone.classList.remove('mx-auto', 'shadow-2xl');

      container.appendChild(clone);
      document.body.appendChild(container);

      // Brief delay to ensure DOM is settled (images/fonts)
      await new Promise(resolve => setTimeout(resolve, 100));

      const opt = {
        margin: 0,
        filename: `${data.title || 'exam_paper'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 794,
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf().set(opt).from(clone).save();

      // Cleanup
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
          返回编辑
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
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium shadow-md hover:bg-blue-700 transition-all active:scale-95"
          >
            <Printer size={18} />
            打印试卷
          </button>
        </div>
      </div>

      {/* The Paper Container */}
      <div
        id="printable-content"
        ref={paperRef}
        className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-[20mm] box-border relative font-serif text-black mx-auto"
      >

        {/* Binding Line */}
        <div className="absolute left-0 top-0 bottom-0 w-[15mm] border-r border-dashed border-gray-400 flex flex-col justify-center items-center text-xs text-gray-500 no-print md:flex print:flex">
          <div className="rotate-[-90deg] whitespace-nowrap tracking-[1em] w-[200mm] text-center select-none">
            装 &nbsp;&nbsp;&nbsp; 订 &nbsp;&nbsp;&nbsp; 线 &nbsp;&nbsp;&nbsp; 内 &nbsp;&nbsp;&nbsp; 请 &nbsp;&nbsp;&nbsp; 勿 &nbsp;&nbsp;&nbsp; 答 &nbsp;&nbsp;&nbsp; 题
          </div>
        </div>

        {/* Exam Header */}
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-2 tracking-wider">{data.title}</h1>
          {data.subtitle && <h2 className="text-xl mb-4 font-normal">{data.subtitle}</h2>}

          <div className="flex justify-center gap-8 text-sm mt-6">
            <div className="border-b border-black w-32 pb-1 text-left">姓名：</div>
            <div className="border-b border-black w-32 pb-1 text-left">班级：</div>
            <div className="border-b border-black w-32 pb-1 text-left">学号：</div>
          </div>

          <div className="flex justify-center items-center gap-12 mt-4 text-sm font-bold">
            <span>考试时间：{data.durationMinutes}分钟</span>
            <span>满分：{data.totalScore}分</span>
          </div>
        </div>

        {/* Score Table */}
        <div className="mb-6 flex justify-center">
          <table className="border-collapse border border-black text-center text-sm w-full max-w-lg">
            <thead>
              <tr>
                <td className="border border-black p-1 w-16 bg-gray-50">题号</td>
                {data.sections.map((_, idx) => (
                  <td key={idx} className="border border-black p-1">{['一', '二', '三', '四', '五', '六', '七'][idx] || idx + 1}</td>
                ))}
                <td className="border border-black p-1 font-bold">总分</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 h-8 bg-gray-50">得分</td>
                {data.sections.map((_, idx) => (
                  <td key={idx} className="border border-black p-1"></td>
                ))}
                <td className="border border-black p-1"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {data.sections.map((section, sIndex) => {
            const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八'];
            const cleanTitle = section.title.replace(/^[一二三四五六七八九十\d]+[、\.]\s*/, '');

            return (
              <div key={sIndex}>
                {/* Section Title */}
                <div className="flex items-baseline gap-2 mb-4 font-bold text-lg break-after-avoid">
                  <span className="text-xl">{chineseNumbers[sIndex] || (sIndex + 1)}、</span>
                  <span>{cleanTitle}</span>
                  <span className="text-sm font-normal text-gray-600">（共 {section.questions.length} 小题，共 {section.totalScore} 分）</span>
                </div>
                {section.description && <div className="text-sm text-gray-600 mb-2 italic">说明：{section.description}</div>}

                {/* Questions */}
                <div className="space-y-4 pl-2">
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
          试卷共 {Math.ceil(data.sections.reduce((acc, s) => acc + s.questions.length, 0) / 10) + 1} 页 &nbsp; | &nbsp; 祝考试顺利
        </div>

      </div>
    </div>
  );
};

const QuestionItem: React.FC<{ question: Question; index: number }> = ({ question, index }) => {

  // Helper to ensure blanks are wide enough for handwriting
  const processQuestionText = (text: string, type: QuestionType) => {
    let processedText = text;

    if (type === QuestionType.FILL_IN_BLANK) {
      // Replace short underscores with a long solid line (unicode underscores or just repeating chars)
      // Finds 2 or more underscores
      processedText = processedText.replace(/_{2,}/g, ' ______________ ');
      // Finds empty parentheses and widens them
      processedText = processedText.replace(/[(（]\s*[)）]/g, '（ ______________ ）');
    }

    return processedText;
  };

  return (
    // Added 'break-inside-avoid' to ensure each question block remains intact
    <div className="mb-4 break-inside-avoid">
      <div className="flex gap-2">
        <span className="font-semibold select-none pt-1">{index}.</span>
        <div className="flex-1">
          {/* Question Text & Score */}
          <div className="leading-8 text-justify"> {/* Increased line height for better readability */}
            <span>{processQuestionText(question.text, question.type)}</span>

            <span className="text-gray-500 text-sm ml-2 select-none align-baseline">({question.score}分)</span>

            {/* Large bracket for Multiple Choice Answers */}
            {question.type === QuestionType.MULTIPLE_CHOICE && (
              <span className="inline-block ml-4 font-serif">（ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ）</span>
            )}

            {/* Judgment Brackets */}
            {question.type === QuestionType.JUDGMENT && (
              <span className="inline-block ml-4 font-serif">（ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ）</span>
            )}
          </div>

          {/* Generated Image - Strictly Controlled */}
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

          {/* Multiple Choice Options */}
          {question.type === QuestionType.MULTIPLE_CHOICE && question.options && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 ml-2">
              {question.options.map((opt, i) => (
                <div key={i} className="flex gap-1 leading-normal">
                  <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          )}

          {/* Short Answer / Calculation / Essay Spaces */}
          {(question.type === QuestionType.SHORT_ANSWER || question.type === QuestionType.CALCULATION || question.type === QuestionType.ESSAY) && (
            <div className="w-full mt-2 border-b border-transparent">
              {Array.from({ length: question.answerSpaceLines || 3 }).map((_, i) => (
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

export default ExamPaper;
