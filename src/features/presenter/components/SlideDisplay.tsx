import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBibleStore } from '@/core/store/bibleStore';
import { usePresenterStore } from '@/core/store/presenterStore';
import { usePresentationStore } from '@/core/store/presentationStore';
import { useAtom } from 'jotai';
import { cn } from '@/core/utils/cn';
import { previewFontSizeAtom, showReferenceAtom, appModeAtom, sidebarOpenAtom, historyOpenAtom } from '@/core/store/uiAtoms';
import { VerseDisplay } from './VerseDisplay';
import { ParallelVerseDisplay } from './ParallelVerseDisplay';
import { MultiVerseDisplay } from './MultiVerseDisplay';
import { Verse, ISlide } from '@/core/types';
import { db } from '@/core/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContainFit } from '@/core/hooks/useContainFit';
import { Monitor, Music, Coins, Baby, Mic2, Megaphone, Presentation as PresentationIcon } from 'lucide-react';
import { LiveSyncService } from '@/core/services/liveSyncService';
import { SlideBackground } from './SlideBackground';

interface SlideDisplayProps {
  isProjector?: boolean;
  activeVerse?: Verse | null;
  selectedSlide?: ISlide | null;
  parallelVerse?: Verse | null;
  multiVerses?: Verse[] | null;
  appMode?: 'scripture' | 'presentation';
}

const SlideDisplay: React.FC<SlideDisplayProps> = ({
  isProjector: isProjectorProp,
  activeVerse: propVerse,
  selectedSlide: propSlide,
  parallelVerse: propParallel,
  multiVerses: propMultiVerses,
  appMode: propAppMode
}) => {
  const {
    activeVerse: storeVerse,
    navigateNext,
    navigatePrev,
    secondTranslationId,
    selectedVerses: storeSelectedVerses,
    isMultiVerseMode: storeIsMultiMode,
  } = useBibleStore();
  const { activePresentationId, selectedSlideId, setSelectedSlide } = usePresentationStore();
  const [storeAppMode] = useAtom(appModeAtom); // Renamed to avoid conflict
  const { settings } = usePresenterStore();
  const [previewFontSize] = useAtom(previewFontSizeAtom);
  const [showRef] = useAtom(showReferenceAtom);
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'en';

  const isProjector = !!isProjectorProp;
  const ratio = settings.display.aspectRatio || 16 / 9;
  const { width: fitW, height: fitH, containerRef } = useContainFit(ratio, 24);

  // Presentation Mode Data
  const presentation = useLiveQuery(
    () => activePresentationId ? db.presentationFiles.get(activePresentationId) : undefined,
    [activePresentationId]
  );
  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
  const blocksMap = useMemo(() => new Map(blocks.map(b => [b.id, b])), [blocks]);

  // Unified data resolution (Prop > Store)
  const activeVerse = propVerse !== undefined ? propVerse : storeVerse;
  const appMode = propAppMode !== undefined ? propAppMode : storeAppMode; // Resolve appMode from prop or store

  const selectedSlideFromStore = useMemo(() =>
    presentation?.slides.find(s => s.id === selectedSlideId)
    , [presentation, selectedSlideId]);
  const selectedSlide = propSlide !== undefined ? propSlide : selectedSlideFromStore;

  // Fetch parallel verse if second translation is selected (Scripture Mode)
  const parallelVerseFromStore = useLiveQuery(
    async () => {
      if (!activeVerse || !secondTranslationId || appMode !== 'scripture') return null;
      return await db.verses
        .where('[translationId+bookId+chapter]')
        .equals([secondTranslationId, activeVerse.bookId, activeVerse.chapter])
        .and(v => v.verseNumber === activeVerse.verseNumber)
        .first();
    },
    [activeVerse?.bookId, activeVerse?.chapter, activeVerse?.verseNumber, secondTranslationId, appMode]
  );
  const parallelVerse = propParallel !== undefined ? propParallel : parallelVerseFromStore;

  const multiVerses = propMultiVerses !== undefined ? propMultiVerses : storeSelectedVerses;
  const isMultiVerseMode = isProjector
    ? (multiVerses && multiVerses.length >= 2)
    : (storeIsMultiMode && multiVerses && multiVerses.length >= 2);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space') {
        if (appMode === 'scripture') {
          navigateNext();
        } else if (appMode === 'presentation' && presentation && selectedSlideId) {
          const currentIndex = presentation.slides.findIndex(s => s.id === selectedSlideId);
          if (currentIndex < presentation.slides.length - 1) {
            setSelectedSlide(presentation.slides[currentIndex + 1].id);
          }
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (appMode === 'scripture') {
          navigatePrev();
        } else if (appMode === 'presentation' && presentation && selectedSlideId) {
          const currentIndex = presentation.slides.findIndex(s => s.id === selectedSlideId);
          if (currentIndex > 0) {
            setSelectedSlide(presentation.slides[currentIndex - 1].id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateNext, navigatePrev, appMode, presentation, selectedSlideId]);

  // Handle Live Sync to Projector
  React.useEffect(() => {
    if (isProjector) return; // Don't sync from projector window back to itself

    // Always sync the current app mode
    LiveSyncService.showAppMode(appMode);

    if (appMode === 'scripture') {
      if (isMultiVerseMode && multiVerses && multiVerses.length >= 2) {
        LiveSyncService.showMultiVerses(multiVerses, secondTranslationId);
      } else if (activeVerse && !isMultiVerseMode) {
        LiveSyncService.showVerse(activeVerse, secondTranslationId);
      }
    } else if (appMode === 'presentation' && selectedSlide) {
      LiveSyncService.showSlide(selectedSlide);
    }
  }, [activeVerse, secondTranslationId, selectedSlide, appMode, isProjector, isMultiVerseMode, multiVerses]);

  const renderContent = () => {
    if (appMode === 'scripture') {
      if (isMultiVerseMode && multiVerses && multiVerses.length >= 2) {
        return (
          <MultiVerseDisplay
            verses={multiVerses}
            showReference={showRef}
            autoFit={true}
            className="h-full w-full"
            settings={settings}
          />
        );
      }

      if (!activeVerse) {
        return (
          <div className="h-full flex items-center justify-center text-stone-700 italic text-sm">
            <p>{t('no_verse_selected_short')}</p>
          </div>
        );
      }

      return parallelVerse ? (
        <ParallelVerseDisplay
          verse1={activeVerse}
          verse2={parallelVerse}
          fontSize={previewFontSize}
          autoFit={true}
          settings={settings}
        />
      ) : (
        <VerseDisplay
          key={`${activeVerse?.bookId}.${activeVerse?.chapter}.${activeVerse?.verseNumber}`}
          verse={activeVerse}
          showReference={showRef}
          fontSize={previewFontSize}
          autoFit={true}
          className="h-full w-full"
          isProjector={isProjector}
          settings={settings}
        />
      );
    } else {
      // Presentation Mode Rendering
      if (!selectedSlide) {
        return (
          <div className="h-full flex flex-col items-center justify-center text-stone-700 italic gap-4">
            <PresentationIcon className="w-12 h-12 opacity-10" strokeWidth={1} />
            <p className="text-sm">{t('select_slide_hint', 'Select a slide to preview')}</p>
          </div>
        );
      }

      const block = blocksMap.get(selectedSlide.blockId);
      const IconMap: any = { Monitor, Music, Coins, Baby, Mic2, Megaphone };
      const BlockIcon = block ? (IconMap[block.icon] || PresentationIcon) : PresentationIcon;
      const vars = selectedSlide.content.variables;

      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-300">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center border-4 border-white/5 shadow-2xl mb-8"
            style={{ backgroundColor: block?.color || '#333' }}
          >
            <BlockIcon className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 max-w-2xl">
            {vars.title || (lang === 'ru' ? block?.nameRu : block?.name)}
          </h2>

          {vars.subtitle && (
            <p className="text-xl text-stone-400 font-medium uppercase tracking-widest">
              {vars.subtitle}
            </p>
          )}

          {vars.content && (
            <p className="text-lg text-stone-500 mt-6 max-w-xl leading-relaxed">
              {vars.content}
            </p>
          )}
        </div>
      );
    }
  };

  const [sidebarOpen] = useAtom(sidebarOpenAtom);
  const [historyOpen] = useAtom(historyOpenAtom);
  const hasNextPrev = !!storeVerse;

  return (
    <div
      ref={isProjector ? undefined : containerRef}
      className={cn(
        "h-full w-full relative group overflow-hidden flex items-center justify-center transition-all duration-500 ease-in-out",
        isProjector
          ? "bg-black p-0"
          : cn(
            "bg-black/20",
            (sidebarOpen || historyOpen || appMode === 'presentation')
              ? "pt-20 pb-48 px-12" // Offset centering to clear UI/timeline
              : "p-12"              // Balanced centering when clean
          )
      )}
    >
      {/* Aspect Ratio Container (JS-computed contain-fit dimensions) */}
      <div
        className={cn(
          "relative z-10 overflow-hidden transition-all duration-300",
          !isProjector && "shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/10 border border-white/5"
        )}
        style={{
          ...(isProjector ? {
            width: '100%',
            height: '100%',
            borderRadius: 0
          } : fitW !== undefined ? {
            width: fitW,
            height: fitH,
            borderRadius: settings.display.cornerRadius ? `${settings.display.cornerRadius}px` : undefined,
          } : {
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: ratio,
            width: '100%',
            borderRadius: settings.display.cornerRadius ? `${settings.display.cornerRadius}px` : undefined,
          })
        }}
      >
        {/* Universal Background Layer */}
        <SlideBackground settings={settings} />

        <div className="relative z-10 w-full h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SlideDisplay;