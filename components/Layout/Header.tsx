'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    return (
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
                {/* Place for future header items like User Profile, Notifications */}
                <div className="hidden md:block text-sm text-gray-500">
                    Powered by {process.env.NEXT_PUBLIC_GEMINI_MODEL || 'Gemini 2.5 Flash'}
                </div>
            </div>
        </header>
    );
}
