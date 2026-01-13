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
你是一位专业的试卷分析助手。请仔细分析以下试题文本，并将其整理为结构化的试卷格式。

# 试题文本
${textContent}

# 解析要求

1. **试卷基本信息**：
   - 从文本中提取试卷标题（如果有）
   - 识别科目和年级信息（如果有提及）
   - 如果文本中没有标题，则根据内容生成合适的标题
   - 根据题目数量和难度估算合理的考试时间（建议：选择题1分钟/题，填空题2分钟/题，解答题5-8分钟/题）
   - 计算总分

2. **题型识别**：
   - **选择题** (multiple_choice)：有 A、B、C、D 等选项的题目
   - **判断题** (judgment)：需要判断对错的题目，通常有括号（ ）
   - **填空题** (fill_in_blank)：有下划线 ___ 或括号（ ）需要填写的题目
   - **简答题** (short_answer)：需要简短文字回答的题目
   - **计算题** (calculation)：需要进行数学运算的题目
   - **解答题/应用题** (essay)：需要详细解答或论述的题目

3. **题目结构**：
   - 保留原题号顺序
   - 提取题目文本（不包括题号）
   - 提取选项（如适用）
   - 根据题型分配合理的分值（如果原文没有提供）：
     * 选择题/判断题：2-3分
     * 填空题：2-4分
     * 计算题/简答题：4-6分
     * 解答题/应用题：6-10分
   - 设置合理的答题空行数 (answerSpaceLines)：
     * 选择题/判断题：0行
     * 填空题：0行
     * 计算题/简答题：3-5行
     * 解答题/应用题：5-8行

4. **分组规则**：
   - 按照原文的大题分组（一、二、三、四...）
   - 每个大题一个 section
   - section 的 title 只包含题型名称，不要数字编号

5. **答案处理**：
   - 如果原文包含参考答案，请忽略答案部分，只提取题目

请严格按照提供的 JSON Schema 格式输出。
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
