import { create } from 'zustand';
import { Verse } from '../types';
import { db } from '../db';
import { useHistoryStore } from './historyStore';
import { LiveSyncService } from '../services/liveSyncService';

interface BibleStoreState {
  // Selection State
  currentTranslationId: string;
  currentBookId: string;
  currentChapter: number;

  // Active Verse (The one on slide)
  activeVerse: Verse | null;

  // Multi-translation
  secondTranslationId: string | null;

  // Multi-verse Selection
  selectedVerses: Verse[];
  lastClickedVerseId: number | null;
  isMultiVerseMode: boolean;

  // Actions
  setTranslation: (translationId: string) => void;
  setSecondTranslation: (translationId: string | null) => void;
  setBook: (bookId: string) => void;
  setChapter: (chapter: number) => void;
  setActiveVerse: (verse: Verse, emitIpc?: boolean) => void;
  navigateNext: () => Promise<void>;
  navigatePrev: () => Promise<void>;
  updateVerseText: (verse: Verse, newText: string) => Promise<void>;

  // Multi-verse Actions
  setSelectedVerses: (verses: Verse[]) => void;
  toggleVerseSelection: (verse: Verse) => void;
  selectVerseRange: (from: Verse, to: Verse, allVerses: Verse[]) => void;
  activateMultiVerseMode: () => void;
  exitMultiVerseMode: () => void;
  setLastClickedVerseId: (id: number | null) => void;
}

export const useBibleStore = create<BibleStoreState>((set, get) => ({
  currentTranslationId: 'KJV',
  currentBookId: 'GEN',
  currentChapter: 1,
  activeVerse: null,
  secondTranslationId: null,

  // Multi-verse Defaults
  selectedVerses: [],
  lastClickedVerseId: null,
  isMultiVerseMode: false,

  setTranslation: (translationId) => set({ currentTranslationId: translationId }),

  setSecondTranslation: (translationId) => set({ secondTranslationId: translationId }),

  setBook: (bookId) => {
    // We don't have synchronous access to books here easily, 
    // so we just set the ID. Creating smart defaults (auto-selecting chapter 1)
    // might need to happen in the UI or via an async action if strictly required,
    // but for now setting chapter to 1 is a safe default.
    set({
      currentBookId: bookId,
      currentChapter: 1,
      // Reset multi-verse selection on navigation
      selectedVerses: [],
      isMultiVerseMode: false,
      lastClickedVerseId: null
    });
  },

  setChapter: (chapter) => {
    set({
      currentChapter: chapter,
      // Reset multi-verse selection on navigation
      selectedVerses: [],
      isMultiVerseMode: false,
      lastClickedVerseId: null
    });
  },

  setActiveVerse: (verse: Verse, emitIpc = true) => {
    set({ activeVerse: verse });

    // Add to history
    useHistoryStore.getState().addToHistory(verse);

    // Send to Projector window via LiveSyncService
    if (emitIpc) {
      LiveSyncService.showVerse(verse, get().secondTranslationId);
    }
  },

  navigateNext: async () => {
    const { activeVerse } = get();
    if (!activeVerse) return;

    // Find next verse in DB
    // Logic: Look for verseNumber + 1 in same chapter
    const nextVerse = await db.verses
      .where('[translationId+bookId+chapter]')
      .equals([activeVerse.translationId, activeVerse.bookId, activeVerse.chapter])
      .and(v => v.verseNumber === activeVerse.verseNumber + 1)
      .first();

    if (nextVerse) {
      set({ activeVerse: nextVerse });
      LiveSyncService.showVerse(nextVerse, get().secondTranslationId);
    } else {
      // Try next chapter? (Optional feature for later)
    }
  },

  navigatePrev: async () => {
    const { activeVerse } = get();
    if (!activeVerse) return;

    const prevVerse = await db.verses
      .where('[translationId+bookId+chapter]')
      .equals([activeVerse.translationId, activeVerse.bookId, activeVerse.chapter])
      .and(v => v.verseNumber === activeVerse.verseNumber - 1)
      .first();

    if (prevVerse) {
      set({ activeVerse: prevVerse });
      LiveSyncService.showVerse(prevVerse, get().secondTranslationId);
    }
  },

  updateVerseText: async (verse, newText) => {
    if (verse.id) {
      await db.verses.update(verse.id, { text: newText });

      const { activeVerse } = get();
      if (activeVerse && activeVerse.id === verse.id) {
        set({ activeVerse: { ...activeVerse, text: newText } });
      }
    }
  },

  // Multi-verse Actions Implementation
  setSelectedVerses: (verses) => {
    // Automagically sort by verseNumber
    const sorted = [...verses].sort((a, b) => a.verseNumber - b.verseNumber);
    set({ selectedVerses: sorted });
  },

  toggleVerseSelection: (verse) => {
    const { selectedVerses, isMultiVerseMode } = get();
    const isSelected = selectedVerses.some(v => v.id === verse.id);

    let newSelected: Verse[];
    if (isSelected) {
      newSelected = selectedVerses.filter(v => v.id !== verse.id);
    } else {
      newSelected = [...selectedVerses, verse].sort((a, b) => a.verseNumber - b.verseNumber);
    }

    let newIsMultiMode = isMultiVerseMode;
    if (newSelected.length <= 1) {
      newIsMultiMode = false;
    }

    set({
      selectedVerses: newSelected,
      isMultiVerseMode: newIsMultiMode
    });
  },

  selectVerseRange: (from, to, allVerses) => {
    const start = Math.min(from.verseNumber, to.verseNumber);
    const end = Math.max(from.verseNumber, to.verseNumber);

    const range = allVerses.filter(v =>
      v.verseNumber >= start && v.verseNumber <= end
    );

    range.sort((a, b) => a.verseNumber - b.verseNumber);
    set({ selectedVerses: range });
  },

  activateMultiVerseMode: () => {
    set({ isMultiVerseMode: true });

    // Proactively send to projector
    const { selectedVerses, secondTranslationId } = get();
    if (selectedVerses.length >= 2) {
      LiveSyncService.showMultiVerses(selectedVerses, secondTranslationId);
    }
  },

  exitMultiVerseMode: () => {
    set({
      isMultiVerseMode: false,
      selectedVerses: [],
      lastClickedVerseId: null
    });
  },

  setLastClickedVerseId: (id) => {
    set({ lastClickedVerseId: id });
  }

}));