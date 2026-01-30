'use client';

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { ExamData, Question, QuestionType } from '@/types';

// 中文数字映射
const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/**
 * 生成试卷Word文档并下载
 */
export async function exportExamToWord(data: ExamData): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // 试卷标题
          new Paragraph({
            children: [new TextRun({ text: data.title, bold: true, size: 36 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          // 副标题
          ...(data.subtitle
            ? [
                new Paragraph({
                  children: [new TextRun({ text: data.subtitle, size: 28 })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 300 },
                }),
              ]
            : []),
          // 学生信息栏
          new Paragraph({
            children: [
              new TextRun({ text: '姓名：________________    班级：________________    学号：________________', size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          // 考试信息
          new Paragraph({
            children: [
              new TextRun({ text: `考试时间：${data.durationMinutes}分钟    满分：${data.totalScore}分`, bold: true, size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          // 得分表格
          createScoreTable(data),
          // 空行
          new Paragraph({ spacing: { after: 400 } }),
          // 各题型部分
          ...data.sections.flatMap((section, sIndex) => createSectionContent(section, sIndex)),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.title || 'exam_paper'}.docx`);
}

/**
 * 生成练习Word文档并下载
 */
export async function exportPracticeToWord(data: ExamData): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // 练习标题
          new Paragraph({
            children: [new TextRun({ text: data.title, bold: true, size: 36 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          // 基本信息
          new Paragraph({
            children: [
              new TextRun({ text: `${data.subject}  |  ${data.grade}  |  共 ${data.sections[0]?.questions.length || 0} 题`, size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          // 学生信息
          new Paragraph({
            children: [
              new TextRun({ text: '姓名：________________    日期：________________    成绩：________________', size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          // 题目内容
          ...data.sections.flatMap((section) => 
            section.questions.flatMap((q, qIndex) => createQuestionContent(q, qIndex + 1))
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.title || 'practice'}.docx`);
}

/**
 * 创建得分表格
 */
function createScoreTable(data: ExamData): Table {
  const headerCells = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: '题号', size: 20 })], alignment: AlignmentType.CENTER })],
      width: { size: 800, type: WidthType.DXA },
    }),
    ...data.sections.map((_, idx) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: chineseNumbers[idx] || String(idx + 1), size: 20 })], alignment: AlignmentType.CENTER })],
        width: { size: 800, type: WidthType.DXA },
      })
    ),
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: '总分', bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
      width: { size: 800, type: WidthType.DXA },
    }),
  ];

  const scoreCells = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: '得分', size: 20 })], alignment: AlignmentType.CENTER })],
      width: { size: 800, type: WidthType.DXA },
    }),
    ...data.sections.map(() =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })], alignment: AlignmentType.CENTER })],
        width: { size: 800, type: WidthType.DXA },
      })
    ),
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })], alignment: AlignmentType.CENTER })],
      width: { size: 800, type: WidthType.DXA },
    }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headerCells }),
      new TableRow({ children: scoreCells }),
    ],
  });
}

/**
 * 创建题型部分内容
 */
function createSectionContent(section: { title: string; description?: string; questions: Question[]; totalScore: number }, sIndex: number): Paragraph[] {
  const cleanTitle = section.title.replace(/^[一二三四五六七八九十\d]+[、\.]\s*/, '');
  const paragraphs: Paragraph[] = [];

  // 题型标题
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `${chineseNumbers[sIndex] || String(sIndex + 1)}、${cleanTitle}`, bold: true, size: 24 }),
        new TextRun({ text: `（共 ${section.questions.length} 小题，共 ${section.totalScore} 分）`, size: 20 }),
      ],
      spacing: { before: 300, after: 200 },
    })
  );

  // 题型说明
  if (section.description) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: `说明：${section.description}`, italics: true, size: 20 })],
        spacing: { after: 200 },
      })
    );
  }

  // 题目列表
  section.questions.forEach((q, qIndex) => {
    paragraphs.push(...createQuestionContent(q, qIndex + 1));
  });

  return paragraphs;
}

/**
 * 创建单个题目内容
 */
function createQuestionContent(question: Question, index: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // 处理题目文本
  let questionText = question.text;
  if (question.type === QuestionType.FILL_IN_BLANK) {
    questionText = questionText.replace(/_{2,}/g, ' ______________ ');
    questionText = questionText.replace(/[(（]\s*[)）]/g, '（ ______________ ）');
  }

  // 题目主体
  const questionChildren: TextRun[] = [
    new TextRun({ text: `${index}. ${questionText}`, size: 22 }),
    new TextRun({ text: `（${question.score}分）`, size: 18 }),
  ];

  // 选择题和判断题添加括号
  if (question.type === QuestionType.MULTIPLE_CHOICE || question.type === QuestionType.JUDGMENT) {
    questionChildren.push(new TextRun({ text: '（      ）', size: 22 }));
  }

  paragraphs.push(
    new Paragraph({
      children: questionChildren,
      spacing: { before: 200, after: 100 },
    })
  );

  // ASCII图形
  if (question.textDiagram) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: question.textDiagram, font: 'Courier New', size: 18 })],
        spacing: { after: 100 },
      })
    );
  }

  // 选择题选项
  if (question.type === QuestionType.MULTIPLE_CHOICE && question.options) {
    const optionText = question.options
      .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`)
      .join('    ');
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: optionText, size: 22 })],
        indent: { left: convertInchesToTwip(0.3) },
        spacing: { after: 100 },
      })
    );
  }

  // 答题空间（简答题、计算题、作文题）
  if ([QuestionType.SHORT_ANSWER, QuestionType.CALCULATION, QuestionType.ESSAY].includes(question.type)) {
    const lines = question.answerSpaceLines || 3;
    for (let i = 0; i < lines; i++) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '________________________________________________________________', size: 22 })],
          spacing: { before: 100 },
        })
      );
    }
  }

  return paragraphs;
}
