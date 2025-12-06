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



interface ExamRequest {
    level: string;
    gradeSpec: string;
    subject: string;
    topicDescription: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

export async function POST(request: NextRequest) {
    try {
        const body: ExamRequest = await request.json();
        const { level, gradeSpec, subject, topicDescription, difficulty } = body;

        const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

        const prompt = `
      你是一位专业的中国${level}老师。请根据以下要求生成一份完整的试卷：
      
      1. 年级：${gradeSpec}
      2. 科目：${subject}
      3. 考试考察的知识点描述：${topicDescription}
      4. 难度：${difficulty === 'easy' ? '基础' : difficulty === 'medium' ? '中等' : '困难'}
      
      试卷结构要求：
      - 试卷需要足够丰富，题目数量合理（选择题/判断题 10+, 填空题 5+, 大题 3-5）。
      - 包含题型：选择题、判断题(QuestionType.JUDGMENT)、填空题、简答题、计算题、应用题。
      
      **关于图片 (Images) 的严格规则**: 
      - **禁止** 为 选择题(Multiple Choice)、填空题(Fill in Blank)、判断题(Judgment) 生成图片描述。这些题型必须是纯文本。
      - **仅限** 在 应用题、计算题、简答题 中，且确实需要几何图形、物理电路图或特定场景示意图辅助解题时，才生成 textDiagram (ASCII ART)。
      - 禁止生成 imagePrompt。
      
      内容必须是中文。格式要正式。
    `;

        // 1. Generate Text Content
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: examSchema,
                temperature: 0.4,
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No data received from AI");

        const examData = JSON.parse(jsonText);

        return NextResponse.json(examData);

    } catch (error) {
        console.error("Error generating exam:", error);
        return NextResponse.json(
            { error: "生成试卷失败，请重试。" },
            { status: 500 }
        );
    }
}
