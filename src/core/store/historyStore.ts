import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Verse } from '../types';

interface HistoryState {
    history: Verse[];
    limit: number;

    // Actions
    addToHistory: (verse: Verse) => void;
    clearHistory: () => void;
    setLimit: (limit: number) => void;
}

export const useHistoryStore = create<HistoryState>()(
    persist(
        (set, get) => ({
            history: [],
            limit: 10,

            addToHistory: (verse: Verse) => {
                const { history, limit } = get();

                // Remove if already exists (bring to top)
                const filtered = history.filter(v => v.id !== verse.id);

                // Add to top and slice to limit
                const newHistory = [verse, ...filtered].slice(0, limit);

                set({ history: newHistory });
            },

            clearHistory: () => set({ history: [] }),

            setLimit: (limit: number) => {
                const { history } = get();
                set({
                    limit,
                    history: history.slice(0, limit)
                });
            },
        }),
        {
            name: 'scripture-presenter-history',
        }
    )
);
