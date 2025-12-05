import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 智能试卷生成器',
  description: '使用 AI 一键生成专业试卷，支持直接打印和导出 PDF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
