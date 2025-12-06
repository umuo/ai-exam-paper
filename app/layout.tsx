import type { Metadata } from 'next';
import AppShell from '@/components/Layout/AppShell';
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
      <body className="text-gray-900 antialiased">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
