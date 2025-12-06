import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
const pdf = require("pdf-parse");

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

const examSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
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
                    title: { type: Type.STRING },
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
                                answerSpaceLines: { type: Type.INTEGER }
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

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let rawText = "";

        if (file.type === "application/pdf") {
            const data = await pdf(buffer);
            rawText = data.text;
        } else if (
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.name.endsWith(".docx")
        ) {
            const result = await mammoth.extractRawText({ buffer });
            rawText = result.value;
        } else {
            return NextResponse.json({ error: "Unsupported file type. Please upload PDF or DOCX." }, { status: 400 });
        }

        if (!rawText || rawText.trim().length === 0) {
            return NextResponse.json({ error: "Could not extract text from file." }, { status: 400 });
        }

        const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
        const prompt = `
            You are an expert exam formatter. I will provide raw text extracted from a document.
            Your task is to:
            1. Identify the exam structure (Title, Subject, Grade).
            2. Extract all questions.
            3. FIX FORMATTING:
               - Ensure fill-in-the-blank brackets are standardized (e.g., "(       )" with enough space). 
               - Ensure options for multiple choice are correctly identified.
            4. Structure the output into the specified JSON format.

            Raw Text:
            """
            ${rawText.slice(0, 20000)} // Truncate to avoid huge prompts if necessary
            """
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: examSchema,
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No data received from AI");

        return NextResponse.json(JSON.parse(jsonText));

    } catch (error) {
        console.error("Format error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Formatting failed" },
            { status: 500 }
        );
    }
}
