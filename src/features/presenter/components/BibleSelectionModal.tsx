import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { useModalStore, ModalType } from '@/core/store/modalStore';
import { usePresentationStore } from '@/core/store/presentationStore';
import { getBookName, BOOK_ORDER } from '@/core/data/bookData';
import { Book, Translation, Verse } from '@/core/types';
import { X, Check, ChevronDown, BookOpen, Layers, Type, Search } from 'lucide-react';

import { cn } from '@/core/utils/cn';
import TranslationPicker from '@/shared/ui/TranslationPicker';
import { formatMultiVerseReference, formatVerseRange } from '@/core/utils/bibleUtils';

const BibleSelectionModal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language?.substring(0, 2) || 'en';
    const { closeModal, isModalOpen, stack } = useModalStore();
    const modalData = stack.find(m => m.id === ModalType.BIBLE_SELECTION);
    const isOpen = !!modalData;
    const slideId = modalData?.props?.slideId as string | undefined;


    const { activePresentation, updatePresentationSlides, activePresentationId } = usePresentationStore();

    const [selectedTranslationId, setSelectedTranslationId] = useState<string>('');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [selectedChapter, setSelectedChapter] = useState<number>(1);
    const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);
    const [lastClickedVerseNumber, setLastClickedVerseNumber] = useState<number | null>(null);

    const [insertMode, setInsertMode] = useState<'single' | 'multiple'>('single');

    const translations = useLiveQuery(() => db.translations.toArray()) || [];
    const books = useLiveQuery(() => db.books.where('translationId').equals(selectedTranslationId || '').toArray(), [selectedTranslationId]) || [];

    // Sort books by canonical order
    const sortedBooks = useMemo(() => {
        return [...books].sort((a, b) => {
            const orderA = BOOK_ORDER.find(o => o.id === a.bookId)?.order || 99;
            const orderB = BOOK_ORDER.find(o => o.id === b.bookId)?.order || 99;
            return orderA - orderB;
        });

    }, [books]);

    // Fetch verses for the selected chapter to get max verse count
    const versesInChapter = useLiveQuery(async () => {
        if (!selectedTranslationId || !selectedBookId) return [];
        return await db.verses
            .where('[translationId+bookId+chapter]')
            .equals([selectedTranslationId, selectedBookId, selectedChapter])
            .toArray();
    }, [selectedTranslationId, selectedBookId, selectedChapter]) || [];

    // Get max chapter count for the selected book
    const chaptersCount = useMemo(() => {
        return 150; // Fallback
    }, [selectedBookId]);

    useEffect(() => {
        if (translations.length > 0 && !selectedTranslationId) {
            setSelectedTranslationId(translations[0].id);
        }
    }, [translations, selectedTranslationId]);

    useEffect(() => {
        if (sortedBooks.length > 0 && !selectedBookId) {
            setSelectedBookId(sortedBooks[0].bookId);
        }
    }, [sortedBooks, selectedBookId]);

    useEffect(() => {
        if (!slideId || !activePresentation?.slides) return;
        const slide = activePresentation.slides.find(s => s.id === slideId);
        if (!slide) return;

        const vars = slide.content.variables;
        if (vars.translationId) setSelectedTranslationId(String(vars.translationId));
        if (vars.bookId) setSelectedBookId(String(vars.bookId));
        if (vars.chapter) setSelectedChapter(Number(vars.chapter));
        if (vars.verseStart) {
            const start = Number(vars.verseStart);
            const end = vars.verseEnd ? Number(vars.verseEnd) : start;
            const range: number[] = [];
            for (let i = start; i <= end; i++) range.push(i);
            setSelectedVerseNumbers(range);
        } else if (vars.verses) {
            try {
                setSelectedVerseNumbers(JSON.parse(String(vars.verses)));
            } catch (e) {
                setSelectedVerseNumbers([]);
            }
        }
    }, [slideId, activePresentation]);

    if (!isOpen) return null;

    const handleApply = async () => {
        if (!activePresentation || !activePresentationId) return;

        const sortedSelected = [...selectedVerseNumbers].sort((a, b) => a - b);
        const selectedVerses = versesInChapter.filter(v =>
            selectedVerseNumbers.includes(v.verseNumber)
        ).sort((a, b) => a.verseNumber - b.verseNumber);

        if (selectedVerses.length === 0) return;

        let newSlides = [...(activePresentation?.slides || [])];

        const getReference = (verses: number[]) => {
            if (verses.length === 0) return '';
            const bookName = getBookName(selectedBookId, lang);
            // Use the utility for robust formatting
            const sortedVerses = versesInChapter.filter(v => verses.includes(v.verseNumber));
            return formatMultiVerseReference(sortedVerses, bookName, lang);
        };

        if (slideId) {
            // Update existing slide
            const verseText = selectedVerses.map(v => v.text).join(' ');
            const reference = getReference(selectedVerseNumbers);

            newSlides = newSlides.map(s => s.id === slideId ? {
                ...s,
                content: {
                    ...s.content,
                    variables: {
                        ...s.content.variables,
                        title: reference,
                        content: verseText,
                        // Compatibility for older templates or specific logic
                        text: verseText,
                        reference: reference,
                        translationId: selectedTranslationId,
                        bookId: selectedBookId,
                        chapter: selectedChapter,
                        verses: JSON.stringify(sortedSelected),
                        verseStart: sortedSelected[0],
                        verseEnd: sortedSelected[sortedSelected.length - 1]
                    }
                }
            } : s);
        } else {
            // Add new slide(s)
            if (insertMode === 'single') {
                const verseText = selectedVerses.map(v => v.text).join(' ');
                const reference = getReference(selectedVerseNumbers);

                newSlides.push({
                    id: crypto.randomUUID(),
                    order: newSlides.length,
                    blockId: 'bible',
                    templateId: 'bible-default',
                    content: {
                        variables: {
                            title: reference,
                            content: verseText,
                            text: verseText,
                            reference: reference,
                            translationId: selectedTranslationId,
                            bookId: selectedBookId,
                            chapter: selectedChapter,
                            verses: JSON.stringify(sortedSelected),
                            verseStart: sortedSelected[0],
                            verseEnd: sortedSelected[sortedSelected.length - 1]
                        }
                    }
                });
            } else {
                // Multiple slides mode (one slide per verse)
                selectedVerses.forEach((verse) => {
                    newSlides.push({
                        id: crypto.randomUUID(),
                        order: newSlides.length,
                        blockId: 'bible',
                        templateId: 'bible-default',
                        content: {
                            variables: {
                                title: `${getBookName(selectedBookId, lang)} ${selectedChapter}:${verse.verseNumber}`,
                                content: verse.text,
                                text: verse.text,
                                reference: `${getBookName(selectedBookId, lang)} ${selectedChapter}:${verse.verseNumber}`,
                                translationId: selectedTranslationId,
                                bookId: selectedBookId,
                                chapter: selectedChapter,
                                verseStart: verse.verseNumber,
                                verseEnd: verse.verseNumber
                            }
                        }
                    });
                });
            }
        }

        await updatePresentationSlides(activePresentationId, newSlides);
        closeModal(ModalType.BIBLE_SELECTION);
    };

    return createPortal(
        <div className="fixed inset-0 z-10001 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">

            <div className="bg-stone-900 border border-white/10 rounded-[32px] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-stone-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <BookOpen className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight uppercase">
                                {slideId ? t('edit_verse', 'Edit Verse') : t('select_verse', 'Select Verse')}
                            </h2>
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em] mt-0.5">
                                {t('bible_browser', 'Bible Browser')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => closeModal(ModalType.BIBLE_SELECTION)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-stone-400 hover:text-white transition-all border border-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden p-5 gap-5">
                    {/* Left: Books & Translation */}
                    <div className="w-1/3 flex flex-col gap-4 min-w-0">
                        <div className="space-y-4 flex-1 flex flex-col min-h-0">
                            <div className="shrink-0">
                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 block px-2">
                                    {t('translation', 'Translation')}
                                </label>
                                <div className="bg-stone-950/50 border border-white/5 rounded-2xl p-1 max-h-32 overflow-y-auto no-scrollbar">
                                    {translations.map(tr => (
                                        <button
                                            key={tr.id}
                                            onClick={() => setSelectedTranslationId(tr.id)}
                                            className={cn(
                                                "w-full px-4 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between group",
                                                selectedTranslationId === tr.id
                                                    ? "bg-amber-500 text-black"
                                                    : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                                            )}
                                        >
                                            <span className="truncate">{tr.name}</span>
                                            {selectedTranslationId === tr.id && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 block px-2 shrink-0">
                                    {t('book', 'Book')}
                                </label>
                                <div className="flex-1 overflow-y-auto no-scrollbar bg-stone-950/50 border border-white/5 rounded-3xl p-1.5 space-y-0.5">
                                    {sortedBooks.map(book => (
                                        <button
                                            key={book.id}
                                            onClick={() => {
                                                setSelectedBookId(book.bookId);
                                                setSelectedChapter(1);
                                                setSelectedVerseNumbers([]);
                                            }}

                                            className={cn(
                                                "w-full px-4 py-2.5 rounded-2xl text-left text-xs font-bold transition-all relative group overflow-hidden",
                                                selectedBookId === book.bookId
                                                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                    : "text-stone-400 hover:bg-white/5 hover:text-stone-200 border border-transparent"
                                            )}

                                        >
                                            {getBookName(book.bookId, lang)}

                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Chapters & Verses */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                        <div className="shrink-0">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 block px-1">
                                {t('chapter', 'Chapter')}
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar p-1">
                                {Array.from({ length: chaptersCount }, (_, i) => i + 1).map(ch => (
                                    <button
                                        key={ch}
                                        onClick={() => {
                                            setSelectedChapter(ch);
                                            setSelectedVerseNumbers([]);
                                        }}
                                        className={cn(
                                            "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all border",
                                            selectedChapter === ch
                                                ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20"
                                                : "bg-stone-950/50 text-stone-400 border-white/5 hover:border-white/20 hover:text-white"
                                        )}
                                    >
                                        {ch}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 block px-2 shrink-0">
                                {t('verses', 'Verses')}
                            </label>
                            <div className="flex-1 overflow-y-auto no-scrollbar bg-stone-950/50 border border-white/5 rounded-[32px] p-3 space-y-1.5">
                                {versesInChapter.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={(e) => {
                                            const isShift = e.shiftKey;
                                            const isCmdCtrl = e.metaKey || e.ctrlKey;

                                            if (isShift && lastClickedVerseNumber !== null) {
                                                const start = Math.min(lastClickedVerseNumber, v.verseNumber);
                                                const end = Math.max(lastClickedVerseNumber, v.verseNumber);
                                                const range: number[] = [];
                                                for (let i = start; i <= end; i++) range.push(i);

                                                setSelectedVerseNumbers(prev => {
                                                    const others = prev.filter(n => n < start || n > end);
                                                    return [...new Set([...others, ...range])];
                                                });
                                            } else if (isCmdCtrl) {
                                                setSelectedVerseNumbers(prev =>
                                                    prev.includes(v.verseNumber)
                                                        ? prev.filter(n => n !== v.verseNumber)
                                                        : [...prev, v.verseNumber]
                                                );
                                            } else {
                                                setSelectedVerseNumbers([v.verseNumber]);
                                            }
                                            setLastClickedVerseNumber(v.verseNumber);
                                        }}
                                        className={cn(
                                            "w-full p-3 rounded-2xl text-left transition-all border group relative overflow-hidden",
                                            selectedVerseNumbers.includes(v.verseNumber)
                                                ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20"
                                                : "bg-stone-900 border-white/5 hover:border-white/10"
                                        )}

                                    >
                                        <div className="flex gap-3">
                                            <span className={cn(
                                                "text-[10px] font-black mt-0.5 shrink-0",
                                                selectedVerseNumbers.includes(v.verseNumber)
                                                    ? "text-amber-500" : "text-stone-600"
                                            )}>
                                                {v.verseNumber}
                                            </span>
                                            <p className={cn(
                                                "text-xs leading-relaxed transition-colors line-clamp-2",
                                                selectedVerseNumbers.includes(v.verseNumber)
                                                    ? "text-stone-100" : "text-stone-400 group-hover:text-stone-300"
                                            )}>
                                                {v.text}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 bg-stone-950/50 backdrop-blur-xl flex items-center justify-between shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">
                            {t('selection', 'Selection')}
                        </span>
                        <p className="text-xs font-bold text-amber-500">
                            {selectedBookId ? getBookName(selectedBookId, lang) : ''} {selectedChapter}:{formatVerseRange(selectedVerseNumbers)}
                        </p>
                    </div>

                    {!slideId && (
                        <div className="hidden sm:flex bg-stone-900 border border-white/10 rounded-xl p-1 shrink-0 mx-4">
                            <button
                                onClick={() => setInsertMode('single')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all",
                                    insertMode === 'single' ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
                                )}
                            >
                                {t('single_slide', 'Single Slide')}
                            </button>
                            <button
                                onClick={() => setInsertMode('multiple')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all",
                                    insertMode === 'multiple' ? "bg-white/10 text-white" : "text-stone-500 hover:text-stone-300"
                                )}
                            >
                                {t('multiple_slides', 'Multiple Slides')}
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => closeModal(ModalType.BIBLE_SELECTION)}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-stone-400 font-bold rounded-2xl transition-all border border-white/5 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {t('cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-8 py-2.5 bg-amber-500 text-black font-black rounded-2xl transition-all border border-amber-600 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] text-[10px] uppercase tracking-widest"
                        >
                            {slideId ? t('update_slide', 'Update Slide') : t('apply', 'Apply')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BibleSelectionModal;
