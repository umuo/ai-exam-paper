import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExamData, ExamRequest, QuestionType, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
                imagePrompt: { 
                  type: Type.STRING, 
                  description: "For GEOMETRY or PHYSICS diagrams ONLY. Provide visual description in English. Leave EMPTY for text-only questions, Multiple Choice, or Fill-in-blanks." 
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

// Helper function to generate an image for a single question
const generateQuestionImage = async (prompt: string): Promise<string | undefined> => {
  if (!prompt || prompt.trim() === '') return undefined;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create a simple, black and white line drawing for a school test. White background. Clear lines. No text labels. Subject: ${prompt}` },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3",
        }
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

// Streaming function to optimize the topic description
export const optimizeTopicDescriptionStream = async function* (rawInput: string, grade: string, subject: string) {
  const model = "gemini-2.5-flash";
  const prompt = `
    User input: "${rawInput}"
    Context: Grade ${grade}, Subject ${subject}.
    
    Task: The user is a teacher describing topics for an exam. Rewrite the user's input to be more professional, detailed, and clear. 
    Expand on implied concepts suitable for this grade level.
    Keep it concise (under 80 words) but professional.
    Output ONLY the rewritten text in Chinese.
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Optimization failed", error);
    // On error, just yield nothing or handle upstream
  }
};

export const generateExamPaper = async (request: ExamRequest): Promise<ExamData> => {
  const model = "gemini-2.5-flash";

  const prompt = `
    你是一位专业的中国${request.level}老师。请根据以下要求生成一份完整的试卷：
    
    1. 年级：${request.gradeSpec}
    2. 科目：${request.subject}
    3. 考试考察的知识点描述：${request.topicDescription}
    4. 难度：${request.difficulty === 'easy' ? '基础' : request.difficulty === 'medium' ? '中等' : '困难'}
    
    试卷结构要求：
    - 试卷需要足够丰富，题目数量合理（选择题/判断题 10+, 填空题 5+, 大题 3-5）。
    - 包含题型：选择题、判断题(QuestionType.JUDGMENT)、填空题、简答题、计算题、应用题。
    
    **关于图片 (Images) 的严格规则**: 
    - **禁止** 为 选择题(Multiple Choice)、填空题(Fill in Blank)、判断题(Judgment) 生成图片描述。这些题型必须是纯文本。
    - **仅限** 在 应用题、计算题、简答题 中，且确实需要几何图形、物理电路图或特定场景示意图辅助解题时，才生成图片描述(imagePrompt)。
    - imagePrompt 必须使用英文。
    
    内容必须是中文。格式要正式。
  `;

  try {
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
    
    const examData = JSON.parse(jsonText) as ExamData;

    // 2. Scan for questions needing images and generate them in parallel
    const imageGenerationPromises: Promise<void>[] = [];

    // Define types that are strictly forbidden from having images
    const noImageTypes = [
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.FILL_IN_BLANK,
      QuestionType.JUDGMENT
    ];

    for (const section of examData.sections) {
      for (const question of section.questions) {
        // Double check: skip image generation for restricted types
        if (noImageTypes.includes(question.type as QuestionType)) {
          question.imagePrompt = undefined; // Clear it just in case
          continue;
        }

        if (question.imagePrompt && question.imagePrompt.trim().length > 0) {
          // Add a small delay/jitter to avoid hitting rate limits instantly if many images
          const delay = Math.floor(Math.random() * 500);
          const promise = new Promise<void>(resolve => setTimeout(resolve, delay))
            .then(() => generateQuestionImage(question.imagePrompt!))
            .then((url) => {
               if (url) {
                 question.imageUrl = url;
               }
            });
          imageGenerationPromises.push(promise);
        }
      }
    }

    // Wait for all images to generate (or fail gracefully)
    if (imageGenerationPromises.length > 0) {
      await Promise.allSettled(imageGenerationPromises);
    }

    return examData;

  } catch (error) {
    console.error("Error generating exam:", error);
    throw new Error("生成试卷失败，请重试。");
  }
};