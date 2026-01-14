'use client';

import { useState, useEffect } from 'react';
import { Menu, Settings } from 'lucide-react';
import SettingsModal from '@/components/SettingsModal';
import { getAIConfig } from '@/services/aiConfigService';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentProvider, setCurrentProvider] = useState<string>('Gemini');

    // 加载当前配置
    useEffect(() => {
        const config = getAIConfig();
        if (config.provider === 'openai' && config.openai?.model) {
            setCurrentProvider(`OpenAI (${config.openai.model})`);
        } else {
            setCurrentProvider('Gemini');
        }
    }, [isSettingsOpen]); // 弹窗关闭时刷新

    return (
        <>
            <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shadow-sm no-print">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        className="p-2 -ml-2 text-gray-500 rounded-md md:hidden hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        onClick={onMenuClick}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Menu size={24} />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900 truncate">
                        AI 智能试卷生成器
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* 当前模型显示 */}
                    <div className="hidden md:block text-sm text-gray-500">
                        Powered by {currentProvider}
                    </div>

                    {/* 设置按钮 */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                        title="AI 模型配置"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* 设置弹窗 */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
}

