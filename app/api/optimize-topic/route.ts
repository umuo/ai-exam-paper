import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface OptimizeRequest {
    rawInput: string;
    grade: string;
    subject: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: OptimizeRequest = await request.json();
        const { rawInput, grade, subject } = body;

        const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
        const prompt = `
      User input: "${rawInput}"
      Context: Grade ${grade}, Subject ${subject}.
      
      Task: The user is a teacher describing topics for an exam. Rewrite the user's input to be more professional, detailed, and clear. 
      Expand on implied concepts suitable for this grade level.
      Keep it concise (under 80 words) but professional.
      Output ONLY the rewritten text in Chinese.
    `;

        const responseStream = await ai.models.generateContentStream({
            model: model,
            contents: prompt,
        });

        // Create a readable stream for the response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of responseStream) {
                        if (chunk.text) {
                            controller.enqueue(new TextEncoder().encode(chunk.text));
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error) {
        console.error("Optimization failed:", error);
        return new Response("优化失败，请重试。", { status: 500 });
    }
}
