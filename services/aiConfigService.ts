// AI Provider 配置服务
// 管理 Gemini / OpenAI 配置的存储和读取

export interface OpenAIConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface AIProviderConfig {
    provider: 'gemini' | 'openai';
    openai?: OpenAIConfig;
}

const STORAGE_KEY = 'ai-provider-config';

// 默认配置
const DEFAULT_CONFIG: AIProviderConfig = {
    provider: 'gemini',
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
    },
};

/**
 * 获取当前 AI 配置
 */
export function getAIConfig(): AIProviderConfig {
    if (typeof window === 'undefined') {
        return DEFAULT_CONFIG;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // 合并默认配置，确保所有字段都存在
            return {
                ...DEFAULT_CONFIG,
                ...parsed,
                openai: {
                    ...DEFAULT_CONFIG.openai,
                    ...parsed.openai,
                },
            };
        }
    } catch (e) {
        console.error('Failed to parse AI config:', e);
    }

    return DEFAULT_CONFIG;
}

/**
 * 保存 AI 配置
 */
export function saveAIConfig(config: AIProviderConfig): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('Failed to save AI config:', e);
    }
}

/**
 * 获取用于 API 请求的配置
 * 返回一个可以安全发送到后端的配置对象
 */
export function getRequestConfig(): {
    provider: 'gemini' | 'openai';
    openaiBaseUrl?: string;
    openaiApiKey?: string;
    openaiModel?: string;
} {
    const config = getAIConfig();

    if (config.provider === 'openai' && config.openai) {
        return {
            provider: 'openai',
            openaiBaseUrl: config.openai.baseUrl,
            openaiApiKey: config.openai.apiKey,
            openaiModel: config.openai.model,
        };
    }

    return { provider: 'gemini' };
}

/**
 * 验证 OpenAI 配置是否完整
 */
export function validateOpenAIConfig(config: OpenAIConfig): { valid: boolean; error?: string } {
    if (!config.apiKey || config.apiKey.trim() === '') {
        return { valid: false, error: 'API Key 不能为空' };
    }

    if (!config.baseUrl || config.baseUrl.trim() === '') {
        return { valid: false, error: 'Base URL 不能为空' };
    }

    if (!config.model || config.model.trim() === '') {
        return { valid: false, error: 'Model 不能为空' };
    }

    return { valid: true };
}
