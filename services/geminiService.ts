import { ExamData, ExamRequest } from "@/types";

// Streaming function to optimize the topic description
export const optimizeTopicDescriptionStream = async function* (rawInput: string, grade: string, subject: string) {
  try {
    const response = await fetch('/api/optimize-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawInput, grade, subject }),
    });

    if (!response.ok) {
      throw new Error('Optimization failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error("Optimization failed", error);
  }
};

export const generateExamPaper = async (request: ExamRequest): Promise<ExamData> => {
  const response = await fetch('/api/generate-exam', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '生成试卷失败，请重试。');
  }

  return response.json();
};