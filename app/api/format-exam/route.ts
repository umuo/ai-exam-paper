import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import officeParser from "officeparser";
import { callOpenAI, getProviderFromFormData, OpenAIRequestConfig } from "@/services/openaiService";
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

// 递归提取PPT AST对象中的所有文本内容
function extractPptText(obj: any): string {
    if (!obj) return '';

    // 如果是字符串直接返回
    if (typeof obj === 'string') return obj;

    // 如果是数组，遍历每个元素
    if (Array.isArray(obj)) {
        return obj.map(item => extractPptText(item)).filter(t => t).join('\n');
    }

    // 如果是对象
    if (typeof obj === 'object') {
        // 顶层pptx对象，处理content数组
        if (obj.type === 'pptx' && obj.content) {
            return extractPptText(obj.content);
        }

        // slide类型，遍历children（只处理slide，跳过note）
        if (obj.type === 'slide' && obj.children) {
            return extractPptText(obj.children);
        }

        // 跳过note类型（备注），只提取幻灯片内容
        if (obj.type === 'note') {
            return '';
        }

        // paragraph或heading类型，直接取text属性
        if ((obj.type === 'paragraph' || obj.type === 'heading') && obj.text) {
            return obj.text;
        }

        // 如果有children数组，遍历
        if (obj.children) {
            return extractPptText(obj.children);
        }

        // 如果有content数组，遍历
        if (obj.content) {
            return extractPptText(obj.content);
        }

        // 如果有text属性
        if (obj.text) {
            return obj.text;
        }
    }

    return '';
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
        try {
            // Step 1: Receiving File
            const formData = await request.formData();
            const file = formData.get("file") as File;

            if (!file) {
                throw new Error("No file uploaded");
            }

            // 读取 provider 配置
            let providerConfig: { provider: 'gemini' | 'openai'; openaiConfig?: OpenAIRequestConfig };
            try {
                providerConfig = getProviderFromFormData(formData);
            } catch {
                providerConfig = { provider: 'gemini' };
            }
            console.log('Using provider:', providerConfig.provider);

            // Step 2: Parsing
            await writer.write(encoder.encode(JSON.stringify({ status: 'parsing', message: '正在解析文档内容...' }) + '\n'));

            const buffer = Buffer.from(await file.arrayBuffer());
            let rawText = "";

            console.log('File type:', file.type, 'File name:', file.name);

            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                console.log('Processing PDF file...');
                try {
                    const pdfParse = require("pdf-parse");
                    const data = await pdfParse(buffer);
                    rawText = data.text;
                    console.log('PDF text extracted, length:', rawText.length);
                    console.log('PDF preview:', rawText.substring(0, 200));
                } catch (pdfError) {
                    console.error('PDF parsing error:', pdfError);
                    throw new Error(`PDF 解析失败: ${pdfError instanceof Error ? pdfError.message : '未知错误'}`);
                }
            } else if (
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                file.name.endsWith(".docx")
            ) {
                console.log('Processing DOCX file...');
                try {
                    const result = await mammoth.extractRawText({ buffer });
                    rawText = result.value;
                    console.log('DOCX text extracted, length:', rawText.length);
                } catch (docxError) {
                    console.error('DOCX parsing error:', docxError);
                    throw new Error(`Word 文档解析失败: ${docxError instanceof Error ? docxError.message : '未知错误'}`);
                }
            } else if (
                file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
                file.name.toLowerCase().endsWith(".pptx")
            ) {
                // 只支持 .pptx 格式，不支持旧版 .ppt
                console.log('Processing PPTX file...');
                try {
                    const result = await officeParser.parseOffice(buffer);

                    // 使用顶层函数提取纯文本
                    rawText = extractPptText(result);

                    console.log('\n========== PPTX 提取的文本内容 ==========');
                    console.log(rawText);
                    console.log('==========================================\n');
                    console.log('文本长度:', rawText.length);
                } catch (pptxError) {
                    console.error('PPTX parsing error:', pptxError);
                    throw new Error(`PPTX 解析失败: ${pptxError instanceof Error ? pptxError.message : '未知错误'}`);
                }
            } else if (file.name.toLowerCase().endsWith(".ppt")) {
                // 旧版 .ppt 不支持，提示用户转换
                throw new Error("不支持旧版 .ppt 格式，请在 PowerPoint 中另存为 .pptx 格式后重新上传。");
            } else {
                throw new Error(`不支持的文件类型: ${file.type}。请上传 PDF、DOCX 或 PPTX 文件。`);
            }

            // 确保 rawText 是字符串
            if (typeof rawText !== 'string') {
                rawText = String(rawText || '');
            }

            if (!rawText || rawText.trim().length === 0) {
                throw new Error("无法从文件中提取文本内容。文件可能是扫描件或加密文档。");
            }

            console.log('Final extracted text length:', rawText.length);

            // Step 3: Preparing AI
            await writer.write(encoder.encode(JSON.stringify({ status: 'analyzing', message: 'AI 正在分析试卷结构...' }) + '\n'));

            const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
            const prompt = `
你是一位专业的试卷格式整理助手。你的任务是将原始文本整理成结构化格式。

# ⚠️ 最重要的规则 - 必须严格遵守

**禁止添加、修改、编造任何题目内容！**
- ❌ 禁止添加原文中没有的题目
- ❌ 禁止编造新的题目或选项
- ✅ 必须100%保留原文的所有题目
- ✅ 题目数量必须与原文一致

# 原始文本（必须忠实于此内容）
"""
${rawText.slice(0, 20000)}
"""

# 格式整理要求

1. **试卷基本信息**：
   - 从原文识别标题、科目、年级
   - 如果原文没有标题，使用"练习题"作为默认标题

2. **题型识别**：
   - **选择题** (multiple_choice)：有 A、B、C、D 选项
   - **判断题** (judgment)：判断对错，有（ ）
   - **填空题** (fill_in_blank)：有空白需要填写
   - **计算题** (calculation)：纯数学算式
   - **解答题** (essay)：需要详细解答

3. **填空题格式处理**（非常重要）：
   - 原文中的多个空格（如"长是     厘米"）必须转换为下划线：长是______厘米
   - 原文中的破折号（如"————"或"---"）保持为下划线：______
   - 确保每个填空位置都有足够长的下划线（至少6个下划线字符）
   - 示例：
     * 原文："长是     厘米" → 输出："长是______厘米"
     * 原文："答案是————" → 输出："答案是______"

4. **内容处理**：
   - 保留原题号顺序
   - 选项去除字母标记（A. B. C. D.），只保留文字
   - 忽略"这类图形有什么共同的特征？"等与题目无关的内容

5. **分组规则**：
   - 按原文的大题分组（一、二、三、四）
   - section 的 title 用题型名称

请严格按照 JSON Schema 格式输出。
            `.trim();

            // Step 4: Generating
            await writer.write(encoder.encode(JSON.stringify({ status: 'formatting', message: '正在生成标准排版...' }) + '\n'));

            let aggregatedText = '';

            if (providerConfig.provider === 'openai' && providerConfig.openaiConfig) {
                // 使用 OpenAI API
                console.log('Calling OpenAI API...');
                try {
                    const openaiResult = await callOpenAI(
                        providerConfig.openaiConfig,
                        [
                            {
                                role: 'system',
                                content: '你是一个专业的试卷格式整理助手。请将用户提供的原始文本整理成结构化的JSON格式试卷数据。必须严格按照用户的要求输出JSON格式。'
                            },
                            { role: 'user', content: prompt }
                        ],
                        {
                            temperature: 0.3,
                            response_format: { type: 'json_object' }
                        }
                    );
                    aggregatedText = openaiResult;
                    await writer.write(encoder.encode(JSON.stringify({ status: 'generating', chunk: '...' }) + '\n'));
                } catch (openaiError) {
                    console.error('OpenAI API error:', openaiError);
                    throw new Error(`OpenAI API 调用失败: ${openaiError instanceof Error ? openaiError.message : '未知错误'}`);
                }
            } else {
                // 使用 Gemini API
                console.log('Calling Gemini API...');
                const result = await ai.models.generateContentStream({
                    model: model,
                    contents: [{ parts: [{ text: prompt }] }],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: examSchema,
                    }
                });

                // @ts-ignore
                const streamResult = result.stream || result;
                for await (const chunk of streamResult) {
                    let chunkText = '';
                    try {
                        if (typeof chunk.text === 'function') {
                            chunkText = chunk.text();
                        } else if (typeof chunk.text === 'string') {
                            chunkText = chunk.text;
                        }
                    } catch (e) {
                        console.error('Error extracting text from chunk:', e);
                    }

                    if (chunkText) {
                        aggregatedText += chunkText;
                        await writer.write(encoder.encode(JSON.stringify({ status: 'generating', chunk: chunkText }) + '\n'));
                    }
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
