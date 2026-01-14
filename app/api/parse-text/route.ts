import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Question types enum
enum QuestionType {
    MULTIPLE_CHOICE = 'multiple_choice',
    FILL_IN_BLANK = 'fill_in_blank',
    SHORT_ANSWER = 'short_answer',
    CALCULATION = 'calculation',
    ESSAY = 'essay',
    JUDGMENT = 'judgment',
}

// Define the schema for structured JSON output
const examSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Main title of the exam, e.g. '2024年秋季学期期中考试'" },
        subtitle: { type: Type.STRING, description: "Subtitle including grade and subject, e.g. '小学三年级数学试卷'" },
        subject: { type: Type.STRING },
        grade: { type: Type.STRING },
        durationMinutes: { type: Type.INTEGER },
        totalScore: { type: Type.INTEGER },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Section title, WITHOUT numbering, e.g. '选择题' (NOT '一、选择题')" },
                    description: { type: Type.STRING, description: "Instructions for this section" },
                    totalScore: { type: Type.INTEGER },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.INTEGER },
                                number: { type: Type.INTEGER },
                                text: { type: Type.STRING, description: "The content of the question" },
                                type: {
                                    type: Type.STRING,
                                    enum: [
                                        QuestionType.MULTIPLE_CHOICE,
                                        QuestionType.FILL_IN_BLANK,
                                        QuestionType.SHORT_ANSWER,
                                        QuestionType.CALCULATION,
                                        QuestionType.ESSAY,
                                        QuestionType.JUDGMENT
                                    ]
                                },
                                score: { type: Type.INTEGER },
                                options: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING },
                                    description: "Options for multiple choice questions (A, B, C, D)"
                                },
                                answerSpaceLines: { type: Type.INTEGER, description: "Recommended number of blank lines for answer. 0 for Choice/Judgment." },
                                textDiagram: {
                                    type: Type.STRING,
                                    description: "ASCII art or text-based visual representation of geometry/physics diagrams. Use this INSTEAD of imagePrompt."
                                },
                                imagePrompt: {
                                    type: Type.STRING,
                                    description: "DEPRECATED. Do not use."
                                }
                            },
                            required: ["id", "number", "text", "type", "score"]
                        }
                    }
                },
                required: ["title", "questions", "totalScore"]
            }
        }
    },
    required: ["title", "subject", "sections"]
};

interface ParseTextRequest {
    textContent: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: ParseTextRequest = await request.json();
        const { textContent } = body;

        if (!textContent || textContent.trim().length === 0) {
            return NextResponse.json(
                { error: "请提供试题内容" },
                { status: 400 }
            );
        }

        const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

        const prompt = `
你是一位专业的试卷格式整理助手。你的任务是将用户提供的试题文本整理成结构化格式。

# ⚠️ 最重要的规则 - 必须严格遵守

**禁止添加、修改、编造任何内容！**
- ❌ 禁止添加原文中没有的题目
- ❌ 禁止修改题目的文字内容
- ❌ 禁止更改选项内容
- ❌ 禁止编造新的题目或选项
- ✅ 只能对原文进行格式整理和结构化
- ✅ 必须100%保留原文的所有题目和内容

如果原文只有5道题，输出也必须只有5道题。
如果原文题目是"1+1=?"，输出也必须是"1+1=?"，不能改成其他题目。

# 试题文本（必须忠实于此内容）
"""
${textContent}
"""

# 格式整理要求

1. **试卷基本信息**：
   - 从原文识别标题、科目、年级
   - 如果原文没有标题，使用"练习题"作为默认标题
   - 估算考试时间和总分

2. **题型识别**（根据原文内容判断）：
   - **选择题** (multiple_choice)：有 A、B、C、D 选项
   - **判断题** (judgment)：判断对错，有括号（ ）
   - **填空题** (fill_in_blank)：有空格需要填写
   - **计算题** (calculation)：纯数学算式
   - **解答题** (essay)：需要详细解答

3. **内容处理**：
   - 保留原题号顺序
   - **原样保留**题目文本（只去除题号）
   - 选项去除字母标记（A. B. C. D.），只保留文字
   - 如果原文有分值就用原文的，没有则合理估算

4. **分组规则**：
   - 按原文的大题分组
   - section 的 title 用题型名称

# 再次强调
你只是在做格式转换，不是在出题！必须100%忠实于原文内容！

请严格按照 JSON Schema 格式输出。
        `;

        // Generate structured response
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: examSchema,
                temperature: 0.3,
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No data received from AI");

        const examData = JSON.parse(jsonText);

        return NextResponse.json(examData);

    } catch (error) {
        console.error("Error parsing text:", error);
        return NextResponse.json(
            { error: "解析试题失败，请检查格式后重试。" },
            { status: 500 }
        );
    }
}
