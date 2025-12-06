import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Question types enum (Keep consistent)
enum QuestionType {
    MULTIPLE_CHOICE = 'multiple_choice',
    FILL_IN_BLANK = 'fill_in_blank',
    SHORT_ANSWER = 'short_answer',
    CALCULATION = 'calculation',
    ESSAY = 'essay',
    JUDGMENT = 'judgment',
}

// Reusing the same schema structure to keep frontend compatible
// We will instruct AI to generate only one section
const practiceSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Title, e.g. '小学三年级数学-计算题专项练习'" },
        subtitle: { type: Type.STRING },
        subject: { type: Type.STRING },
        grade: { type: Type.STRING },
        durationMinutes: { type: Type.INTEGER },
        totalScore: { type: Type.INTEGER },
        sections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Section title, e.g. '专项练习'" },
                    description: { type: Type.STRING },
                    totalScore: { type: Type.INTEGER },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.INTEGER },
                                number: { type: Type.INTEGER },
                                text: { type: Type.STRING },
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
                                    items: { type: Type.STRING }
                                },
                                answerSpaceLines: { type: Type.INTEGER },
                                imagePrompt: {
                                    type: Type.STRING,
                                    description: "Visual description for geometry/physics. EMPTY for text-only."
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

const generateQuestionImage = async (prompt: string): Promise<string | undefined> => {
    if (!prompt || prompt.trim() === '') return undefined;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp-image-generation',
            contents: {
                parts: [
                    { text: `Create a simple, black and white line drawing for a school test. White background. Clear lines. No text labels. Subject: ${prompt}` },
                ],
            },
            config: {
                responseModalities: ["Text", "Image"],
            }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    } catch (error) {
        console.warn(`Failed to generate image for prompt: ${prompt}`, error);
        return undefined;
    }
    return undefined;
};

interface PracticeRequest {
    level: string;
    gradeSpec: string;
    subject: string;
    questionType: string;
    topicDescription: string;
    count: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: PracticeRequest = await request.json();
        const { level, gradeSpec, subject, questionType, topicDescription, count } = body;

        const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

        // Map UI question type to enum/description
        // "几何题" might map to calculation/application with image requirement
        let typeInstruction = "";
        let imageInstruction = "";

        if (questionType === 'geometry') {
            typeInstruction = "生成 几何/图形题。通常归类为 calculation 或 short_answer。重点是必须包含几何图形描述。";
            imageInstruction = "每道题都必须生成 imagePrompt 来描述几何图形 (e.g. triangle, circle, angles)。";
        } else {
            typeInstruction = `生成 ${questionType} (QuestionType 对应值) 类型题目。`;
            if (['calculation', 'application', 'short_answer'].includes(questionType)) {
                imageInstruction = "如果有必要（如物理场景、几何），可以生成 imagePrompt。否则留空。";
            } else {
                imageInstruction = "禁止生成 imagePrompt。";
            }

            // STRICT constraint for calculation
            if (questionType === 'calculation') {
                typeInstruction += " 必须是纯计算题 (例如 '1+1=?', '解方程', '求导')。禁止生成应用题、文字题或情景题。";
            }
        }

        const prompt = `
      你是一位专业的中国${level}老师。请根据以下要求生成一份**专项练习**试卷：

      1. 年级：${gradeSpec}
      2. 科目：${subject}
      3. 专项类型：${questionType}
      4. 考点/知识点：${topicDescription}
      5. 题目数量：约 ${count} 题

      要求：
      - 试卷只包含一个大题（Section）。
      - ${typeInstruction}
      - ${imageInstruction}
      - 题目内容必须是中文。
      - 格式要正式。
      - 如果是计算题，请确保数字合理。
      - 如果是应用题，情境要贴近生活。
    `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: practiceSchema,
                temperature: 0.4,
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No data received from AI");
        const examData = JSON.parse(jsonText);

        // Scan for images
        const imageGenerationPromises: Promise<void>[] = [];
        for (const section of examData.sections) {
            for (const question of section.questions) {
                if (question.imagePrompt && question.imagePrompt.trim().length > 0) {
                    const delay = Math.floor(Math.random() * 500);
                    const promise = new Promise<void>(resolve => setTimeout(resolve, delay))
                        .then(() => generateQuestionImage(question.imagePrompt!))
                        .then((url) => {
                            if (url) question.imageUrl = url;
                        });
                    imageGenerationPromises.push(promise);
                }
            }
        }

        if (imageGenerationPromises.length > 0) {
            await Promise.allSettled(imageGenerationPromises);
        }

        return NextResponse.json(examData);

    } catch (error) {
        console.error("Error generating practice:", error);
        return NextResponse.json(
            { error: "生成专项练习失败，请重试。" },
            { status: 500 }
        );
    }
}
