import { ExamData } from '@/types';

export interface SavedExam extends ExamData {
    id: string;
    createdAt: number;
}

const STORAGE_KEY = 'exam_history';

export const saveExam = (exam: ExamData): SavedExam => {
    const history = getHistory();
    const newExam: SavedExam = {
        ...exam,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
    };

    const updatedHistory = [newExam, ...history];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return newExam;
};

export const getHistory = (): SavedExam[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to parse exam history', e);
        return [];
    }
};

export const getExam = (id: string): SavedExam | null => {
    const history = getHistory();
    return history.find((exam) => exam.id === id) || null;
};

export const deleteExam = (id: string): void => {
    const history = getHistory();
    const updated = history.filter((exam) => exam.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
