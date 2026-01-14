'use client';

import { useState, useEffect } from 'react';
import { X, Settings2 } from 'lucide-react';
import {
    AIProviderConfig,
    getAIConfig,
    saveAIConfig,
    validateOpenAIConfig
} from '@/services/aiConfigService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [config, setConfig] = useState<AIProviderConfig>({
        provider: 'gemini',
        openai: {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4o-mini',
        },
    });
    const [error, setError] = useState<string>('');
    const [saved, setSaved] = useState(false);

    // 加载配置
    useEffect(() => {
        if (isOpen) {
            setConfig(getAIConfig());
            setError('');
            setSaved(false);
        }
    }, [isOpen]);

    const handleSave = () => {
        // 如果选择 OpenAI，验证配置
        if (config.provider === 'openai' && config.openai) {
            const validation = validateOpenAIConfig(config.openai);
            if (!validation.valid) {
                setError(validation.error || '配置无效');
                return;
            }
        }

        saveAIConfig(config);
        setSaved(true);
        setError('');

        // 1秒后关闭弹窗
        setTimeout(() => {
            onClose();
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">AI 模型配置</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-6">
                    {/* 模型选择 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            选择 AI 服务商
                        </label>
                        <div className="flex gap-3">
                            <label className={`
                flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all
                ${config.provider === 'gemini'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'}
              `}>
                                <input
                                    type="radio"
                                    name="provider"
                                    value="gemini"
                                    checked={config.provider === 'gemini'}
                                    onChange={() => setConfig({ ...config, provider: 'gemini' })}
                                    className="sr-only"
                                />
                                <span className="font-medium">Google Gemini</span>
                            </label>

                            <label className={`
                flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all
                ${config.provider === 'openai'
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'}
              `}>
                                <input
                                    type="radio"
                                    name="provider"
                                    value="openai"
                                    checked={config.provider === 'openai'}
                                    onChange={() => setConfig({ ...config, provider: 'openai' })}
                                    className="sr-only"
                                />
                                <span className="font-medium">OpenAI</span>
                            </label>
                        </div>
                    </div>

                    {/* Gemini 说明 */}
                    {config.provider === 'gemini' && (
                        <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
                            <p>使用系统内置的 Gemini API Key，无需额外配置。</p>
                        </div>
                    )}

                    {/* OpenAI 配置 */}
                    {config.provider === 'openai' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Base URL
                                </label>
                                <input
                                    type="text"
                                    value={config.openai?.baseUrl || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        openai: { ...config.openai!, baseUrl: e.target.value }
                                    })}
                                    placeholder="https://api.openai.com/v1"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                />
                                <p className="mt-1 text-xs text-gray-500">支持自定义 API 地址，如使用代理或其他兼容服务</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    value={config.openai?.apiKey || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        openai: { ...config.openai!, apiKey: e.target.value }
                                    })}
                                    placeholder="sk-..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Model
                                </label>
                                <input
                                    type="text"
                                    value={config.openai?.model || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        openai: { ...config.openai!, model: e.target.value }
                                    })}
                                    placeholder="gpt-4o-mini"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                />
                                <p className="mt-1 text-xs text-gray-500">推荐：gpt-4o-mini、gpt-4o、gpt-3.5-turbo</p>
                            </div>
                        </div>
                    )}

                    {/* 错误提示 */}
                    {error && (
                        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* 保存成功提示 */}
                    {saved && (
                        <div className="p-3 bg-green-50 rounded-xl text-sm text-green-600">
                            ✓ 配置已保存
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-blue-500/25"
                    >
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
}
