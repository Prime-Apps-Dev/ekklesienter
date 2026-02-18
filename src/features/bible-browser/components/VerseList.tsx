import React, { useMemo, useEffect, useRef } from 'react';
import { useBibleStore } from '@/core/store/bibleStore';
import { Verse } from '@/core/types';
import { List, Edit, CheckCircle2, Book, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import VerseEditor from './VerseEditor';
import ContextMenu, { ContextMenuItem } from '@/shared/ui/ContextMenu';
import TranslationPicker from '@/shared/ui/TranslationPicker';
import { getBookName } from '@/core/data/bookData';
import { useState } from 'react';
import { cn } from '@/core/utils/cn';
import { processChildren } from '@/core/utils/markdownUtils';

interface VerseItemProps {
  verse: Verse;
  isActive: boolean;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (verse: Verse) => void;
  onSelectMulti: (verse: Verse, event: React.MouseEvent) => void;
  onMouseEnter: (verse: Verse) => void;
  onContextMenu: (e: React.MouseEvent, verseId: number) => void;
}

// Memoized individual verse row to optimize rendering large chapters
const VerseItem = React.memo(({
  verse, isActive, isSelected, isDragging,
  onSelect, onSelectMulti, onMouseEnter, onContextMenu
}: VerseItemProps) => {
  const itemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll into view when active
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  return (
    <button
      ref={itemRef}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          onSelectMulti(verse, e);
        } else {
          onSelect(verse);
        }
      }}
      onMouseEnter={() => onMouseEnter(verse)}
      onContextMenu={(e) => {
        if (verse.id) onContextMenu(e, verse.id);
      }}
      className={cn(
        "group w-full text-left p-4 transition-all duration-300 relative focus:outline-none border-b border-white/5",
        isActive
          ? "bg-accent/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
          : isSelected
            ? "bg-accent/20"
            : !isDragging && "hover:bg-white/5",
        isSelected && isActive && "bg-accent/25"
      )}
    >
      <div className="flex gap-4">
        <div className={cn(
          "flex flex-col items-center min-w-8 pt-1 transition-colors duration-300",
          isActive || isSelected ? "text-accent" : "text-stone-600 group-hover:text-stone-400"
        )}>
          <span className="text-[10px] font-black font-sans tracking-tighter opacity-80 mb-1">
            {verse.verseNumber}
          </span>
          {(isActive || isSelected) && <div className={cn(
            "w-1.5 h-1.5 rounded-full bg-accent shadow-glow transition-all",
            isSelected && !isActive && "opacity-60 scale-75"
          )} />}
        </div>

        <div className={cn(
          "flex-1 font-serif text-lg leading-relaxed transition-colors duration-300",
          (isActive || isSelected) ? "text-stone-100" : "text-stone-400 group-hover:text-stone-200"
        )}>
          <ReactMarkdown
            components={{
              strong: ({ children }) => (
                <span className={cn("font-bold", isActive ? "text-accent/90" : "text-stone-200")}>
                  {processChildren(children)}
                </span>
              ),
              p: ({ children }) => (
                <span>
                  {processChildren(children)}
                </span>
              ),
              em: ({ children }) => (
                <em className="italic opacity-90">
                  {processChildren(children)}
                </em>
              )
            }}
          >
            {verse.text}
          </ReactMarkdown>
        </div>
      </div>

      {/* Active Indicator Side Bar */}
      <div className={cn(
        "absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300",
        isActive
          ? "bg-accent opacity-100 scale-y-100 shadow-glow"
          : isSelected
            ? "bg-accent opacity-60 scale-y-90"
            : "bg-accent opacity-0 scale-y-50"
      )} />
    </button>
  );
}, (prev, next) => {
  return prev.verse.id === next.verse.id &&
    prev.verse.text === next.verse.text &&
    prev.isActive === next.isActive &&
    prev.isSelected === next.isSelected &&
    prev.isDragging === next.isDragging;
});

const VerseList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    activeVerse,
    setActiveVerse,
    currentBookId,
    currentChapter,
    updateVerseText,
    currentTranslationId,
    secondTranslationId,
    setSecondTranslation,
    navigateNext,
    navigatePrev,
    // Multi-verse state
    selectedVerses,
    setSelectedVerses,
    toggleVerseSelection,
    selectVerseRange,
    isMultiVerseMode,
    activateMultiVerseMode,
    exitMultiVerseMode,
    lastClickedVerseId,
    setLastClickedVerseId
  } = useBibleStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; verseId: number } | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartVerse, setDragStartVerse] = useState<Verse | null>(null);

  // Get verses for current chapter selection
  const verses = useLiveQuery(
    () => db.verses
      .where('[translationId+bookId+chapter]')
      .equals([currentTranslationId, currentBookId, currentChapter])
      .sortBy('verseNumber'),
    [currentTranslationId, currentBookId, currentChapter]
  ) || [];

  const lang = useMemo(() => i18n.language?.substring(0, 2) || 'en', [i18n.language]);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if editing or if focus is in an input/textarea
      if (editingId !== null) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Handle Arrow keys (disabled in multi-mode)
      if (isMultiVerseMode || selectedVerses.length >= 2) {
        if (e.key.startsWith('Arrow')) return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (!activeVerse && verses.length > 0) {
          setActiveVerse(verses[0]);
        } else {
          navigateNext();
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!activeVerse && verses.length > 0) {
          setActiveVerse(verses[0]);
        } else {
          navigatePrev();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedVerses.length >= 2) {
          activateMultiVerseMode();
        } else if (selectedVerses.length === 1) {
          setActiveVerse(selectedVerses[0]);
          exitMultiVerseMode();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeVerse,
    editingId,
    verses,
    setActiveVerse,
    navigateNext,
    navigatePrev,
    isMultiVerseMode,
    selectedVerses,
    activateMultiVerseMode,
    exitMultiVerseMode
  ]);

  const handleContextMenu = (e: React.MouseEvent, verseId: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, verseId });
  };

  const handleSelect = (verse: Verse) => {
    if (isMultiVerseMode) {
      exitMultiVerseMode();
    }
    setActiveVerse(verse);
    setSelectedVerses([]);
    setLastClickedVerseId(verse.id || null);
  };

  const handleSelectMulti = (verse: Verse, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedVerseId) {
      const lastVerse = verses.find(v => v.id === lastClickedVerseId);
      if (lastVerse) {
        selectVerseRange(lastVerse, verse, verses);
      }
    } else {
      toggleVerseSelection(verse);
      setLastClickedVerseId(verse.id || null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, verse: Verse) => {
    if (e.button !== 0) return; // Left click only
    // Skip if target is a scrollbar - checking if event target is the button itself roughly
    if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'P' && (e.target as HTMLElement).tagName !== 'SPAN') {
      // if we clicked some other UI bit insideVerseItem
    }

    setIsDragging(true);
    setDragStartVerse(verse);
    // Initial selection or range depends on if Shift is pressed
    if (e.shiftKey && lastClickedVerseId) {
      const lastVerse = verses.find(v => v.id === lastClickedVerseId);
      if (lastVerse) selectVerseRange(lastVerse, verse, verses);
    } else if (e.ctrlKey || e.metaKey) {
      toggleVerseSelection(verse);
      setLastClickedVerseId(verse.id || null);
    } else {
      // Normal click start for drag
      setSelectedVerses([verse]);
      setLastClickedVerseId(verse.id || null);
    }

    e.preventDefault(); // Prevent text selection
  };

  const handleMouseEnter = (verse: Verse) => {
    if (isDragging && dragStartVerse) {
      selectVerseRange(dragStartVerse, verse, verses);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStartVerse(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleEdit = () => {
    if (contextMenu) {
      setEditingId(contextMenu.verseId);
      setContextMenu(null);
    }
  };

  const handleSave = async (newText: string) => {
    if (editingId !== null) {
      const verse = verses.find(v => v.id === editingId);
      if (verse) {
        await updateVerseText(verse, newText);
      }
      setEditingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-900/40 backdrop-blur-xl border-r border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-stone-950/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-accent/20 rounded-lg">
            <List className="w-4 h-4 text-accent" />
          </div>
          <h2 className="font-bold text-stone-200 text-sm uppercase">
            {t('verses')}
          </h2>
        </div>
        <div className="px-2 py-0.5 bg-white/5 rounded-full flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">
            {verses.length}
          </span>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className={cn(
        "flex-1 overflow-y-auto no-scrollbar pb-32 relative",
        isDragging && "select-none"
      )}>
        {verses.map((verse) => (
          editingId === verse.id ? (
            <VerseEditor
              key={`editor-${verse.id}`}
              verse={verse}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={`${verse.bookId}-${verse.chapter}-${verse.verseNumber}`}
              onMouseDown={(e) => handleMouseDown(e, verse)}
            >
              <VerseItem
                verse={verse}
                isActive={activeVerse?.id === verse.id}
                isSelected={selectedVerses.some(v => v.id === verse.id)}
                isDragging={isDragging}
                onSelect={handleSelect}
                onSelectMulti={handleSelectMulti}
                onMouseEnter={handleMouseEnter}
                onContextMenu={handleContextMenu}
              />
            </div>
          )
        ))}

        {/* Floating Multi-Verse Button */}
        {selectedVerses.length >= 2 && (
          <div className="absolute bottom-36 left-0 right-0 px-4 flex justify-center z-40 pointer-events-none">
            <button
              onClick={() => isMultiVerseMode ? exitMultiVerseMode() : activateMultiVerseMode()}
              className={cn(
                "pointer-events-auto flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm shadow-2xl transition-all active:scale-95 animate-in slide-in-from-bottom fade-in duration-300",
                isMultiVerseMode
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 backdrop-blur-md"
                  : "bg-accent hover:bg-accent-hover text-accent-foreground"
              )}
            >
              {isMultiVerseMode ? (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{t('exit_mode', 'Exit Mode')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('show_n_verses', 'Show {{count}} verses', { count: selectedVerses.length })} [Enter]</span>
                </>
              )}
            </button>
          </div>
        )}

        {verses.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <List className="w-10 h-10 text-stone-800 mx-auto" strokeWidth={1} />
            <p className="text-sm text-stone-600 italic">
              {t('no_verses_found', 'No verses found for this chapter')}
            </p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 bg-stone-950/40 relative z-30">
        {secondTranslationId ? (
          <div className="group relative">
            <button
              ref={triggerRef}
              onClick={() => {
                if (triggerRef.current) setTriggerRect(triggerRef.current.getBoundingClientRect());
                setIsPickerOpen(true);
              }}
              className="w-full h-[60px] flex items-center gap-3 p-3 rounded-2xl bg-stone-900/40 border border-white/5 hover:border-accent/40 hover:bg-stone-800/60 transition-all group active:scale-95 shadow-xl shadow-black/20"
            >
              <div className="min-w-10 h-8 px-2 rounded-xl bg-accent flex items-center justify-center border border-accent/20 shadow-lg shadow-accent/10 shrink-0 group-hover:shadow-accent/20 transition-all">
                <span className="text-[10px] font-black text-accent-foreground uppercase">{secondTranslationId}</span>
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[10px] font-bold text-stone-300 uppercase leading-none truncate group-hover:text-white transition-colors">
                  {currentBookId ? getBookName(currentBookId, lang) : '-'}
                </span>
                <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mt-1 truncate group-hover:text-stone-400">
                  {currentChapter ? `${t('chapter')} ${currentChapter}` : '-'}
                </span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSecondTranslation(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-stone-950/50 hover:bg-red-500/20 text-stone-600 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-xl"
              title={t('clear_selection', 'Clear Selection')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            ref={triggerRef}
            onClick={() => {
              if (triggerRef.current) setTriggerRect(triggerRef.current.getBoundingClientRect());
              setIsPickerOpen(true);
            }}
            className="w-full h-[60px] flex items-center gap-3 p-3 rounded-2xl bg-stone-900/40 border border-dashed border-white/10 hover:border-accent/40 hover:bg-accent/5 transition-all group active:scale-95"
          >
            <div className="w-10 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0 group-hover:bg-accent/10 group-hover:border-accent/20 transition-all">
              <Plus className="w-4 h-4 text-stone-600 group-hover:text-accent" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest leading-none group-hover:text-stone-400 transition-colors">
                {t('multi_translation', 'Multi-Translation')}
              </span>
              <p className="text-[9px] text-stone-700 uppercase tracking-wider font-bold mt-1">
                {t('multi_select_hint', 'Show side-by-side')}
              </p>
            </div>
          </button>
        )}

        {isPickerOpen && (
          <TranslationPicker
            title={t('select_second_translation', 'Second Translation')}
            currentTranslationId={secondTranslationId}
            onSelect={setSecondTranslation}
            onClose={() => setIsPickerOpen(false)}
            triggerRect={triggerRect}
          />
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
          <ContextMenuItem
            icon={<Edit className="w-4 h-4" />}
            label={t('edit_verse', 'Edit Verse')}
            onClick={handleEdit}
          />
        </ContextMenu>
      )}
    </div>
  );
};

export default VerseList;