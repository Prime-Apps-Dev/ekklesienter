import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBibleStore } from '@/core/store/bibleStore';
import { usePresenterStore } from '@/core/store/presenterStore';
import { usePresentationStore } from '@/core/store/presentationStore';
import { useAtom } from 'jotai';
import { cn } from '@/core/utils/cn';
import {
  previewFontSizeAtom,
  showReferenceAtom,
  appModeAtom,
  sidebarOpenAtom,
  historyOpenAtom,
  activeOverrideAtom
} from '@/core/store/uiAtoms';
import { VerseDisplay } from './VerseDisplay';
import { ParallelVerseDisplay } from './ParallelVerseDisplay';
import { MultiVerseDisplay } from './MultiVerseDisplay';
import { Verse, ISlide, PresenterSettings } from '@/core/types';
import { db } from '@/core/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContainFit } from '@/core/hooks/useContainFit';
import {
  Monitor, Music, Coins, Baby, Mic2, Megaphone,
  Presentation as PresentationIcon, CheckCircle2, Trash2
} from 'lucide-react';
import { LiveSyncService } from '@/core/services/liveSyncService';
import { SlideBackground } from './SlideBackground';
import SlideContentRenderer from './SlideContentRenderer';
import SlideCanvas from './SlideCanvas';

interface SlideDisplayProps {
  isProjector?: boolean;
  activeVerse?: Verse | null;
  selectedSlide?: ISlide | null;
  parallelVerse?: Verse | null;
  multiVerses?: Verse[] | null;
  isMultiVerseMode?: boolean;
  appMode?: 'scripture' | 'presentation';
  settings?: PresenterSettings;
}

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

const SlideDisplay: React.FC<SlideDisplayProps> = ({
  isProjector: isProjectorProp,
  activeVerse: propVerse,
  selectedSlide: propSlide,
  parallelVerse: propParallel,
  multiVerses: propMultiVerses,
  isMultiVerseMode: propIsMultiVerseMode,
  appMode: propAppMode,
  settings: propSettings,
}) => {
  // ... existing store hooks ...
  const {
    activeVerse: storeVerse,
    navigateNext,
    navigatePrev,
    secondTranslationId,
    selectedVerses,
    isMultiVerseMode: storeIsMultiVerseMode,
    commitToProjector,
    exitMultiVerseMode,
    projectorIsLive,
  } = useBibleStore();
  const { settings: globalSettings, updateBackground } = usePresenterStore();

  const settings = propSettings || globalSettings;
  const activePresentationId = usePresentationStore(s => s.activePresentationId);
  const selectedPresentationId = usePresentationStore(s => s.selectedPresentationId);
  const activePresentation = usePresentationStore(s => s.activePresentation);
  const selectedPresentation = usePresentationStore(s => s.selectedPresentation);
  const previewSlideId = usePresentationStore(s => s.previewSlideId);
  const setPreviewSlide = usePresentationStore(s => s.setPreviewSlide);

  const [storeAppMode] = useAtom(appModeAtom);
  const [previewFontSize] = useAtom(previewFontSizeAtom);
  const [showRef] = useAtom(showReferenceAtom);
  const [activeOverride] = useAtom(activeOverrideAtom as any);
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'en';

  const isProjector = !!isProjectorProp;
  const [windowRatio, setWindowRatio] = React.useState(window.innerWidth / window.innerHeight);

  const appMode = propAppMode !== undefined ? propAppMode : storeAppMode;

  React.useEffect(() => {
    if (!isProjector) return;
    const handleResize = () => setWindowRatio(window.innerWidth / window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isProjector]);

  // For presentation mode, we always want a 16:9 logical area that we then scale
  const ratio = (appMode === 'presentation')
    ? (BASE_WIDTH / BASE_HEIGHT)
    : (isProjector ? windowRatio : (settings.display.aspectRatio || 16 / 9));

  const { width: fitW, height: fitH, containerRef } = useContainFit(ratio, isProjector ? 0 : 24);

  // ... data resolution ...
  const activeVerse = isProjector ? propVerse : storeVerse;

  const isMultiVerseMode = isProjector
    ? !!propIsMultiVerseMode
    : (storeIsMultiVerseMode || selectedVerses.length >= 2);

  const multiVerses = isProjector ? propMultiVerses : selectedVerses;

  // DB Query for persistence/fallback
  const dbPresentation = useLiveQuery(
    () => {
      const targetId = selectedPresentationId || activePresentationId;
      return targetId ? db.presentationFiles.get(targetId) : undefined;
    },
    [selectedPresentationId, activePresentationId]
  );

  // Priority 1: Current selected presentation from store (nested editor)
  // Priority 2: Active presentation from store (master timeline)
  // Priority 3: Database fallback
  const presentation = useMemo(() => {
    if (selectedPresentation && selectedPresentation.id === selectedPresentationId) return selectedPresentation;
    if (activePresentation && activePresentation.id === activePresentationId) return activePresentation;
    return dbPresentation;
  }, [selectedPresentation, selectedPresentationId, activePresentation, activePresentationId, dbPresentation]);

  const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
  const blocksMap = useMemo(() => new Map(blocks.map(b => [b.id, b])), [blocks]);
  const templates = useLiveQuery(() => db.templates.toArray()) || [];
  const templatesMap = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);

  // Derived slide selection
  const selectedSlideFromStore = useMemo(() =>
    presentation?.slides?.find(s => s.id === previewSlideId),
    [presentation, previewSlideId]
  );
  const selectedSlide = isProjector ? propSlide : selectedSlideFromStore;

  const parallelVerseFromStore = useLiveQuery(
    async () => {
      if (!activeVerse || !secondTranslationId || appMode !== 'scripture' || isMultiVerseMode) return null;
      return await db.verses
        .where('[translationId+bookId+chapter]')
        .equals([secondTranslationId, activeVerse.bookId, activeVerse.chapter])
        .and(v => v.verseNumber === activeVerse.verseNumber)
        .first();
    },
    [activeVerse?.bookId, activeVerse?.chapter, activeVerse?.verseNumber, secondTranslationId, appMode, isMultiVerseMode]
  );
  const parallelVerse = (isProjector && propParallel !== undefined) ? propParallel : parallelVerseFromStore;

  // ... navigation effect ...
  // Scripture-mode keyboard navigation (presentation mode is handled by useTimelineHotkeys)

  // ... projector-ready effect ...
  React.useEffect(() => {
    if (isProjector || !window.electron?.ipcRenderer) return;

    const unsub = window.electron.ipcRenderer.on('projector-ready', () => {
      const store = useBibleStore.getState();
      const { activeVerse, isMultiVerseMode: multiMode, selectedVerses, secondTranslationId: secId } = store;

      LiveSyncService.showAppMode(appMode);

      if (appMode === 'scripture') {
        if (multiMode && selectedVerses.length >= 2) {
          LiveSyncService.showMultiVerses(selectedVerses, secId);
        } else if (activeVerse) {
          LiveSyncService.showVerse(activeVerse, secId);
        }
      }
    });

    return () => unsub?.();
  }, [isProjector, appMode, selectedSlide]);

  // ... app mode sync effects ...
  React.useEffect(() => {
    if (isProjector) return;
    LiveSyncService.showAppMode(appMode);
  }, [appMode, isProjector]);

  // Fetch verses if it's a multi-verse Bible slide
  // We move this to the top level to follow rules of hooks
  const bibleVerses = useLiveQuery(async () => {
    if (selectedSlide?.blockId !== 'bible' || !selectedSlide.content.variables.verses) return null;
    try {
      const verseNumbers = JSON.parse(selectedSlide.content.variables.verses as string) as number[];
      const translationId = selectedSlide.content.variables.translationId as string;
      const bookId = selectedSlide.content.variables.bookId as string;
      const chapter = Number(selectedSlide.content.variables.chapter);

      return await db.verses
        .where('[translationId+bookId+chapter]')
        .equals([translationId || 'KJV', bookId || 'GEN', chapter || 1])
        .filter(v => verseNumbers.includes(v.verseNumber))
        .toArray();
    } catch (e) {
      return null;
    }
  }, [selectedSlide]);


  // ─── Render ───────────────────────────────────────────────────────────────
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
          key={`${activeVerse.bookId}.${activeVerse.chapter}.${activeVerse.verseNumber}`}
          verse={activeVerse}
          showReference={showRef}
          fontSize={previewFontSize}
          autoFit={true}
          className="h-full w-full"
          isProjector={isProjector}
          settings={settings}
        />
      );
    }

    if (!selectedSlide) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-stone-700 italic gap-4">
          <PresentationIcon className="w-12 h-12 opacity-10" strokeWidth={1} />
          <p className="text-sm">{t('select_slide_hint', 'Select a slide to preview')}</p>
        </div>
      );
    }

    const block = blocksMap.get(selectedSlide.blockId);
    const template = templatesMap.get(selectedSlide.templateId);

    // Presentation Mode Scale Calculation
    const scale = fitW ? (fitW / BASE_WIDTH) : 1;

    if (selectedSlide.blockId === 'bible') {
      const isMulti = !!selectedSlide.content.variables.verses && bibleVerses && bibleVerses.length > 1;

      return (
        <div
          key={selectedSlide.id}
          className="relative origin-top-left pointer-events-none"
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          <div className="relative z-10 w-full h-full pointer-events-auto">
            {isMulti ? (
              <MultiVerseDisplay
                verses={bibleVerses!}
                showReference={showRef}
                autoFit={true}
                className="h-full w-full"
                settings={settings}
              />
            ) : (
              <VerseDisplay
                verse={{
                  id: selectedSlide.id as any,
                  bookId: selectedSlide.content.variables.bookId as string || 'GEN',
                  chapter: Number(selectedSlide.content.variables.chapter) || 1,
                  verseNumber: Number(selectedSlide.content.variables.verse) || 1,
                  text: selectedSlide.content.variables.content as string || '',
                  translationId: selectedSlide.content.variables.translationId as string || 'KJV'
                }}
                showReference={showRef}
                autoFit={true}
                className="h-full w-full"
                isProjector={isProjector}
                settings={settings}
              />
            )}
          </div>
        </div>
      )
    }

    return (
      <div
        key={selectedSlide.id}
        className="relative origin-top-left pointer-events-none"
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <div className="relative z-10 w-full h-full pointer-events-auto">
          <SlideContentRenderer
            template={template}
            block={block}
            variables={selectedSlide.content.variables}
            lang={lang}
            backgroundOverride={selectedSlide.backgroundOverride}
            canvasItems={isProjector ? selectedSlide.content.canvasItems : undefined}
            slide={selectedSlide}
            slideId={selectedSlide.id}
            isPreview={!isProjector}
          />
          {!isProjector && (
            <SlideCanvas slideId={selectedSlide.id} canvasItems={selectedSlide.content.canvasItems || []} />
          )}
        </div>
      </div>
    );
  };

  const [sidebarOpen] = useAtom(sidebarOpenAtom);
  const [historyOpen] = useAtom(historyOpenAtom);

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full w-full relative group overflow-hidden flex items-center justify-center transition-all duration-500 ease-in-out',
        isProjector ? 'bg-black p-0' : cn(
          'bg-black/20',
          (sidebarOpen || historyOpen || appMode === 'presentation') ? 'pt-20 pb-48 px-12' : 'p-12'
        )
      )}
    >
      <div
        className={cn(
          'relative z-10 overflow-hidden transition-all duration-300',
          !isProjector && 'shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/10 border border-white/5'
        )}
        style={fitW !== undefined ? {
          width: isProjector ? '100vw' : fitW,
          height: isProjector ? '100vh' : fitH,
          borderRadius: settings?.display?.cornerRadius ? `${settings.display.cornerRadius}px` : undefined,
        } : {
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: ratio,
          width: '100%',
          borderRadius: settings?.display?.cornerRadius ? `${settings.display.cornerRadius}px` : undefined,
        }}
      >
        <SlideBackground background={settings?.background} />
        <div className="relative z-10 w-full h-full">{renderContent()}</div>
      </div>
    </div>
  );
};


export default SlideDisplay;
