# AI 智能试卷生成器 (Smart Exam Generator)

这是一个基于 Google Gemini API 的现代化 React 应用，旨在帮助教师和教育工作者通过自然语言描述，一键生成排版专业、内容丰富的试卷。

应用支持从小学到高中的各个学科，能够自动生成多种题型，并支持流式 AI 文本润色、自动配图（几何/物理场景）以及 A4 标准打印导出。

## ✨ 核心功能

*   **多学段支持**：涵盖小学、初中、高中，自动适配不同难度的知识点。
*   **智能出题**：
    *   支持选择题、判断题、填空题、简答题、计算题、应用题等多种题型。
    *   支持生成数学几何图形、物理电路图等辅助图片（自动生成黑白线稿风格）。
*   **AI 智能润色 (流式交互)**：
    *   用户输入简单的知识点描述（如“三年级加减法”），AI 会流式地将其改写为更专业、详细的考试范围描述。
    *   采用打字机效果，提升交互体验。
*   **专业排版**：
    *   生成标准的 A4 试卷布局。
    *   包含密封线（装订线）、考生信息栏、总分栏。
    *   针对不同题型自动预留答题空间（横线、括号）。
*   **导出与打印**：
    *   支持浏览器原生打印（自动适配 A4 纸张）。
    *   支持一键导出为 PDF 文件。

## 🛠 技术栈

*   **前端框架**: [React 19](https://react.dev/)
*   **开发语言**: [TypeScript](https://www.typescriptlang.org/)
*   **样式库**: [Tailwind CSS](https://tailwindcss.com/)
*   **AI 模型**: [Google Gemini API](https://ai.google.dev/) (`@google/genai` SDK)
    *   文本生成: `gemini-2.5-flash`
    *   图像生成: `gemini-2.5-flash-image`
*   **PDF 生成**: `html2pdf.js`
*   **图标库**: `lucide-react`

## 🚀 快速开始

### 1. 环境准备

确保您拥有一个有效的 Google Gemini API Key。

### 2. 配置

本项目依赖环境变量 `API_KEY`。在您的运行环境中（如 `.env` 文件或部署平台的坏境变量设置中）添加：

```bash
API_KEY=your_google_gemini_api_key_here
```

### 3. 运行项目

本项目结构设计为既可以通过现代构建工具（如 Vite）运行，也可以在支持 ESM Import Maps 的在线环境中运行。

如果是本地开发 (推荐使用 Vite):

```bash
# 安装依赖 (假设您已初始化 package.json)
npm install react react-dom lucide-react @google/genai

# 启动
npm run dev
```

## 📖 使用指南

1.  **设置基本信息**：
    *   选择学段（小学/初中/高中）和具体年级。
    *   输入科目（如：数学、语文）。
    *   选择难度（基础/适中/挑战）。

2.  **输入考点描述**：
    *   在文本框中输入您想考察的知识点。
    *   **✨ 魔法功能**：点击右上角的 **"AI 智能润色"**。AI 会清空您的输入，并实时流式生成更完善、更专业的考试大纲描述。

3.  **生成试卷**：
    *   点击“立即生成试卷”。
    *   系统将调用 Gemini 模型生成试卷结构，并并行生成必要的插图。

4.  **打印/导出**：
    *   生成完成后，您将看到试卷预览。
    *   点击 **"打印试卷"**：唤起浏览器打印窗口，推荐选择 "另存为 PDF" 或直接连接打印机。
    *   点击 **"导出 PDF"**：使用内置生成器直接下载 PDF 文件。

## 📂 项目结构

```
.
├── index.html              # 入口 HTML (包含 Tailwind CDN 和 Import Maps)
├── index.tsx               # React 入口文件
├── App.tsx                 # 主应用组件
├── types.ts                # TypeScript 类型定义 (ExamData, Question 等)
├── metadata.json           # 应用元数据
├── components/
│   ├── ExamForm.tsx        # 表单组件 (含 AI 流式润色逻辑)
│   └── ExamPaper.tsx       # 试卷渲染组件 (含打印和 PDF 导出逻辑)
└── services/
    └── geminiService.ts    # Gemini API 调用逻辑 (文本生成、流式生成、图像生成)
```

## ⚠️ 注意事项

*   **API 配额**：图像生成和长文本生成可能会消耗较多的 API Token，请留意您的 Google AI Studio 配额。
*   **图像生成限制**：程序已配置为仅针对“应用题”、“计算题”或“简答题”生成必要的几何或物理示意图，并强制要求为黑白线稿风格，以适应试卷打印。
*   **打印兼容性**：建议使用 Chrome 或 Edge 浏览器以获得最佳的打印渲染效果。

## 📄 License

MIT License
