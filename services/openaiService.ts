// OpenAI API 辅助函数
// 用于后端调用 OpenAI 格式的 API

export interface OpenAIRequestConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenAIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

/**
 * 调用 OpenAI 兼容的 API
 */
export async function callOpenAI(
    config: OpenAIRequestConfig,
    messages: OpenAIMessage[],
    options?: {
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: 'json_object' | 'text' };
    }
): Promise<string> {
    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages,
            temperature: options?.temperature ?? 0.3,
            max_tokens: options?.max_tokens ?? 8000,
            response_format: options?.response_format,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API 错误: ${response.status} - ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenAI API 返回空响应');
    }

    return data.choices[0].message.content;
}

/**
 * 从 FormData 获取 provider 配置
 */
export function getProviderFromFormData(formData: FormData): {
    provider: 'gemini' | 'openai';
    openaiConfig?: OpenAIRequestConfig;
} {
    const provider = formData.get('provider') as string || 'gemini';

    if (provider === 'openai') {
        const baseUrl = formData.get('openaiBaseUrl') as string;
        const apiKey = formData.get('openaiApiKey') as string;
        const model = formData.get('openaiModel') as string;

        if (!baseUrl || !apiKey || !model) {
            throw new Error('OpenAI 配置不完整');
        }

        return {
            provider: 'openai',
            openaiConfig: { baseUrl, apiKey, model },
        };
    }

    return { provider: 'gemini' };
}

/**
 * 从 JSON body 获取 provider 配置
 */
export function getProviderFromJson(body: any): {
    provider: 'gemini' | 'openai';
    openaiConfig?: OpenAIRequestConfig;
} {
    const provider = body.provider || 'gemini';

    if (provider === 'openai') {
        const baseUrl = body.openaiBaseUrl;
        const apiKey = body.openaiApiKey;
        const model = body.openaiModel;

        if (!baseUrl || !apiKey || !model) {
            throw new Error('OpenAI 配置不完整');
        }

        return {
            provider: 'openai',
            openaiConfig: { baseUrl, apiKey, model },
        };
    }

    return { provider: 'gemini' };
}
