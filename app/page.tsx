'use client';

import Link from 'next/link';
import { FileText, ArrowRight, History, Sparkles } from 'lucide-react';

export default function Dashboard() {
    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 pb-5">
                <h3 className="text-2xl font-semibold leading-6 text-gray-900">仪表盘</h3>
                <p className="mt-2 text-sm text-gray-500">欢迎回来！准备好为学生们创建新的试卷了吗？</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Quick Action: Generate Exam */}
                <div className="relative group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300">
                    <div className="absolute top-6 right-6 text-blue-100 group-hover:text-blue-50 transition-colors">
                        <FileText size={48} />
                    </div>
                    <div className="flex flex-col h-full">
                        <div className="p-2 bg-blue-50 w-fit rounded-lg text-blue-600 mb-4">
                            <Sparkles size={24} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">快速生成试卷</h4>
                        <p className="mt-2 text-sm text-gray-500 mb-6 flex-1">
                            输入知识点，AI 立即生成完整试卷。支持数学、语文、英语等全学科。
                        </p>
                        <Link
                            href="/generate"
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                            开始生成 <ArrowRight className="ml-1 w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Quick Action: History */}
                <div className="relative group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300">
                    <div className="absolute top-6 right-6 text-purple-100 group-hover:text-purple-50 transition-colors">
                        <History size={48} />
                    </div>
                    <div className="flex flex-col h-full">
                        <div className="p-2 bg-purple-50 w-fit rounded-lg text-purple-600 mb-4">
                            <History size={24} />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">历史试卷</h4>
                        <p className="mt-2 text-sm text-gray-500 mb-6 flex-1">
                            查看并管理您过去生成的试卷。支持重新编辑和下载。
                        </p>
                        <Link
                            href="/history"
                            className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800"
                        >
                            查看历史 <ArrowRight className="ml-1 w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2">💡 使用小贴士</h4>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    <li>尝试在生成时描述具体的题型，例如“需要5道选择题和3道应用题”。</li>
                    <li>生成的试卷可以直接导出为 PDF，方便打印。</li>
                    <li>如果对题目不满意，可以说“换一题”来重新生成（功能开发中）。</li>
                </ul>
            </div>
        </div>
    );
}
