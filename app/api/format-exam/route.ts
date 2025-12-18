import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// pdf-parse will be required dynamically

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
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
        try {
            // Step 1: Receiving File
            // Note: We can't strictly "stream" the upload progress here easily without client-side tracking,
            // but we can acknowledge receipt.

            const formData = await request.formData();
            const file = formData.get("file") as File;

            if (!file) {
                throw new Error("No file uploaded");
            }

            // Step 2: Parsing
            await writer.write(encoder.encode(JSON.stringify({ status: 'parsing', message: '正在解析文档内容...' }) + '\n'));

            const buffer = Buffer.from(await file.arrayBuffer());
            let rawText = "";

            if (file.type === "application/pdf") {
                const pdf = require("pdf-parse");
                const data = await pdf(buffer);
                rawText = data.text;
            } else if (
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                file.name.endsWith(".docx")
            ) {
                const result = await mammoth.extractRawText({ buffer });
                rawText = result.value;
            } else {
                throw new Error("Unsupported file type. Please upload PDF or DOCX.");
            }

            if (!rawText || rawText.trim().length === 0) {
                throw new Error("Could not extract text from file.");
            }

            // Step 3: Preparing AI
            await writer.write(encoder.encode(JSON.stringify({ status: 'analyzing', message: 'AI 正在分析试卷结构...' }) + '\n'));

            const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
            const prompt = `
            You are an expert exam formatter. I will provide raw text extracted from a document.
            Your task is to:
            1. Identify the exam structure (Title, Subject, Grade).
            2. Extract all questions.
            3. Classify Question Types CAREFULLY:
               - 'calculation': STRICTLY for pure mathematical expressions (e.g., "1+1=", "2x+3=7"). NO word problems here.
               - 'essay': Use this for "Application Questions", "Word Problems", or any question dealing with real-world scenarios, even if it involves calculation.
               - 'fill_in_blank', 'multiple_choice', etc. as usual.
            4. FIX FORMATTING:
               - Ensure fill-in-the-blank brackets are standardized (e.g., "(       )" with enough space). 
               - Ensure options for multiple choice are correctly identified.
               - CRITICAL FOR CALCULATION QUESTIONS: If a single question number contains multiple short calculations (e.g., "1. 9+4=  12-3= ..."), YOU MUST SPLIT them into separate questions with their own IDs, OR keep them as one question but ensure the text uses newlines to separate them clearly.
               - A specific rule: If you see a group of oral calculations under one number, split them if possible, otherwise format them with ample spacing or newlines in the 'text' field.
            5. Structure the output into the specified JSON format.

            Raw Text:
            """
            ${rawText.slice(0, 20000)} // Truncate to avoid huge prompts if necessary
            """
        `;

            // Step 4: Generating
            await writer.write(encoder.encode(JSON.stringify({ status: 'formatting', message: '正在生成标准排版...' }) + '\n'));

            const result = await ai.models.generateContentStream({
                model: model,
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: examSchema,
                }
            });

            let aggregatedText = '';
            // @ts-ignore
            const stream = result.stream || result;
            for await (const chunk of stream) {
                console.log('Stream Chunk:', chunk);
                let chunkText = '';
                try {
                    if (typeof chunk.text === 'function') {
                        chunkText = chunk.text();
                    } else if (typeof chunk.text === 'string') {
                        chunkText = chunk.text;
                    } else {
                        console.warn('Unknown chunk format:', chunk);
                    }
                } catch (e) {
                    console.error('Error extracting text from chunk:', e);
                }

                if (chunkText) {
                    aggregatedText += chunkText;
                    // Send detailed generation log
                    await writer.write(encoder.encode(JSON.stringify({ status: 'generating', chunk: chunkText }) + '\n'));
                }
            }

            // Step 5: Complete
            let resultData;
            try {
                resultData = JSON.parse(aggregatedText);
            } catch (e) {
                console.error("JSON Parse Error on full text:", aggregatedText);
                throw new Error("AI output was not valid JSON");
            }

            await writer.write(encoder.encode(JSON.stringify({ status: 'complete', data: resultData }) + '\n'));

        } catch (error) {
            console.error("Format error:", error);
            const msg = error instanceof Error ? error.message : "Formatting failed";
            await writer.write(encoder.encode(JSON.stringify({ status: 'error', message: msg }) + '\n'));
        } finally {
            await writer.close();
        }
    })();

    return new NextResponse(stream.readable, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache, no-transform',
        },
    });
}
