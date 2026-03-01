import { create } from 'zustand';
import { ICanvasItem, IStyleLayer, Verse } from '../types';

export interface IHistorySnapshot {
    id: string;
    timestamp: number;
    slideId: string;
    canvasItems: ICanvasItem[];
    background?: IStyleLayer[];
}

interface HistoryState {
    past: IHistorySnapshot[];
    future: IHistorySnapshot[];
    limit: number;

    // Verse navigation history
    history: Verse[];

    setLimit: (limit: number) => void;
    pushSnapshot: (snapshot: Omit<IHistorySnapshot, 'id' | 'timestamp'>) => void;
    undo: () => IHistorySnapshot | null;
    redo: () => IHistorySnapshot | null;
    clear: () => void;

    // Verse history actions
    addToHistory: (verse: Verse) => void;
    clearHistory: () => void;
}


export const useHistoryStore = create<HistoryState>((set, get) => ({
    past: [],
    future: [],
    limit: 64,
    history: [],

    setLimit: (limit) => set({ limit }),

    pushSnapshot: (snapshot) => {
        const { past, limit } = get();
        const newSnapshot: IHistorySnapshot = {
            ...snapshot,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };

        const newPast = [...past, newSnapshot];
        if (newPast.length > limit) {
            newPast.shift();
        }

        set({
            past: newPast,
            future: [], // Clear redo stack on new action
        });
    },

    undo: () => {
        const { past, future } = get();
        if (past.length === 0) return null;

        const newPast = [...past];
        const current = newPast.pop()!;

        set({
            past: newPast,
            future: [current, ...future],
        });

        // The state to RESTORE is the one BEFORE the current one in the stack
        // Wait, if we just popped the "latest" change, we want to return the state the slide SHOULD be in now.
        // Actually, snapshots should represent the state AFTER an action.
        // So Undo would mean:
        // 1. Move current to future.
        // 2. Return the state from the NEW top of past, or some initial state.

        return newPast.length > 0 ? newPast[newPast.length - 1] : null;
    },

    redo: () => {
        const { past, future } = get();
        if (future.length === 0) return null;

        const newFuture = [...future];
        const next = newFuture.shift()!;

        set({
            past: [...past, next],
            future: newFuture,
        });

        return next;
    },

    clear: () => set({ past: [], future: [] }),

    // Verse navigation history
    addToHistory: (verse) => {
        const { history } = get();
        // Avoid consecutive duplicates
        if (history.length > 0 && history[0].id === verse.id) return;
        const newHistory = [verse, ...history].slice(0, 50);
        set({ history: newHistory });
    },

    clearHistory: () => set({ history: [] }),
}));
