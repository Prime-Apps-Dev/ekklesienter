import React, { useState, useCallback, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import NavigationPanel from '../features/bible-browser/components/NavigationPanel';
import VerseList from '../features/bible-browser/components/VerseList';
import SlideDisplay from '../features/presenter/components/SlideDisplay';
import ProjectorView from '../features/presenter/components/ProjectorView';
import LocalPresenterOverlay from '../features/presenter/components/LocalPresenterOverlay';
import { db } from '../core/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Verse } from '../core/types';
import { getBookName } from '../core/data/bookData';
import { useAtom } from 'jotai';
import { sidebarOpenAtom, themeAccentAtom, historyOpenAtom, searchOpenAtom, appModeAtom, blackoutActiveAtom, whiteoutActiveAtom, logoActiveAtom, liveLogoUrlAtom } from '../core/store/uiAtoms';
import { useBibleStore } from '../core/store/bibleStore';
import { SidebarClose, SidebarOpen, MonitorPlay, Presentation, Clock, Search as SearchIcon, Palette, Square, Circle, Image as ImageIcon } from 'lucide-react';
import SettingsModal from '@/features/settings/components/SettingsModal';
import HistoryPanel from '../features/bible-browser/components/HistoryPanel';
import QuickSearchModal from '../features/search/components/QuickSearchModal';
import CustomizationPanel from '@/features/presenter/components/CustomizationPanel';
import { usePresenterStore } from '@/core/store/presenterStore';
import { usePresentationStore } from '@/core/store/presentationStore';
import { useModalStore, ModalType } from '@/core/store/modalStore';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';
import { processVerseText, truncateMiddle } from '@/core/utils/markdownUtils';
import PresentationLibrary from '../features/bible-browser/components/PresentationLibrary';
import SlideTimeline from '../features/presenter/components/SlideTimeline';
import VariableEditor from '../features/presenter/components/VariableEditor';
import { LiveSyncService } from '@/core/services/liveSyncService';

// Custom resizable hook
function useResizable(
  storageKey: string,
  defaultSize: number,
  minSize: number,
  maxSize: number,
  orientation: 'horizontal' | 'vertical'
) {
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? Number(saved) : defaultSize;
  });

  // Sync size when storageKey changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setSize(saved ? Number(saved) : defaultSize);
  }, [storageKey, defaultSize]);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startPos.current = orientation === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;
    document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [size, orientation]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const currentPos = orientation === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem(storageKey, String(size));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [storageKey, size, minSize, maxSize, orientation]);

  return { size, handleMouseDown, containerRef };
}

const ControllerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [appMode] = useAtom(appModeAtom);
  const [themeAccent] = useAtom(themeAccentAtom);
  const [historyOpen, setHistoryOpen] = useAtom(historyOpenAtom);
  const [searchOpen, setSearchOpen] = useAtom(searchOpenAtom);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [presenterActive, setPresenterActive] = React.useState(false);
  const activeVerse = useBibleStore((state) => state.activeVerse);
  const currentTranslationId = useBibleStore((state) => state.currentTranslationId);
  const setBook = useBibleStore((state) => state.setBook);
  const setChapter = useBibleStore((state) => state.setChapter);
  const setActiveVerse = useBibleStore((state) => state.setActiveVerse);
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'en';

  // Fetch next verse for preview
  const nextVersePreview = useLiveQuery(
    async () => {
      if (!activeVerse) return null;
      return await db.verses
        .where('[translationId+bookId+chapter]')
        .equals([currentTranslationId, activeVerse.bookId, activeVerse.chapter])
        .and(v => v.verseNumber === activeVerse.verseNumber + 1)
        .first();
    },
    [activeVerse?.id, currentTranslationId]
  );

  // Fetch previous verse for preview
  const prevVersePreview = useLiveQuery(
    async () => {
      if (!activeVerse) return null;
      return await db.verses
        .where('[translationId+bookId+chapter]')
        .equals([currentTranslationId, activeVerse.bookId, activeVerse.chapter])
        .and(v => v.verseNumber === activeVerse.verseNumber - 1)
        .first();
    },
    [activeVerse?.id, currentTranslationId]
  );

  // Resizable navigation panel width - independent per mode
  const navPanel = useResizable(`nav-panel-width-${appMode}`, 200, 150, 350, 'horizontal');
  // Resizable side panel width - independent per mode
  const sidePanel = useResizable(`side-panel-width-${appMode}`, 280, 200, 500, 'horizontal');

  // Send current verse or multi-verses to projector — reads directly from store to avoid stale closures
  const sendVerseToProjector = useCallback(() => {
    const state = useBibleStore.getState();
    const { activeVerse, selectedVerses, isMultiVerseMode, secondTranslationId } = state;

    if (isMultiVerseMode && selectedVerses.length >= 2) {
      LiveSyncService.showMultiVerses(selectedVerses, secondTranslationId);
    } else if (activeVerse) {
      LiveSyncService.showVerse(activeVerse, secondTranslationId);
    }
  }, []);

  const openProjector = async () => {
    const displaySettings = usePresenterStore.getState().settings.display;
    if (window.electron && window.electron.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('open-projector', displaySettings);
      // Handshake listener in useEffect will trigger sendVerseToProjector() when window is ready
    } else {
      console.warn('Electron IPC not available');
      alert("Electron IPC not available. If you are in web mode, this feature requires Electron.");
    }
  };

  // Get navigation functions
  const navigateNext = useBibleStore((state) => state.navigateNext);
  const navigatePrev = useBibleStore((state) => state.navigatePrev);

  // Close projector window
  const closeProjector = useCallback(() => {
    LiveSyncService.clear();
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('close-projector');
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.getAttribute('contenteditable') === 'true'
      )) {
        return;
      }

      // Enter: Open projector and send content
      if (e.key === 'Enter') {
        const state = useBibleStore.getState();
        const hasContent = state.activeVerse || state.selectedVerses.length >= 2;

        if (hasContent) {
          e.preventDefault();
          if (window.electron?.ipcRenderer) {
            const displaySettings = usePresenterStore.getState().settings.display;
            await window.electron.ipcRenderer.invoke('open-projector', displaySettings);
          }
        }
      }

      // Escape: Clear presentation
      if (e.key === 'Escape') {
        e.preventDefault();
        closeProjector();
      }

      // Arrow Right or Down: Next verse
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        await navigateNext();
      }

      // Arrow Left or Up: Previous verse
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        await navigatePrev();
      }

      // Ctrl+H: Toggle History
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setHistoryOpen(prev => !prev);
      }

      // Ctrl+Shift+C: Copy current verse
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        if (activeVerse) {
          e.preventDefault();
          const text = `${activeVerse.bookId} ${activeVerse.chapter}:${activeVerse.verseNumber} (${activeVerse.translationId})\n${activeVerse.text}`;
          navigator.clipboard.writeText(text);
          // We don't have a toast system visible here, but we could add one
        }
      }

      // Ctrl+F: Open search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }

      // Live Controls shortcuts
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setBlackout(prev => !prev);
      }
      if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setWhiteout(prev => !prev);
      }
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLogo(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVerse, sendVerseToProjector, navigateNext, navigatePrev, closeProjector, setHistoryOpen, setSearchOpen]);

  // Listen for navigation commands from Projector window via IPC
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;

    const unsubscribe = window.electron.ipcRenderer.on('navigate-verse', (direction: string) => {
      if (direction === 'next') {
        navigateNext();
      } else if (direction === 'prev') {
        navigatePrev();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigateNext, navigatePrev]);

  // Listen for projector-ready event (Handshake for release builds)
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;

    const unsubscribe = window.electron.ipcRenderer.on('projector-ready', (payload?: { ratio: number }) => {
      console.log('Projector window ready, syncing data...');
      if (payload?.ratio) {
        usePresenterStore.getState().updateDisplay({ aspectRatio: payload.ratio });
      }
      // Send initial theme
      window.electron?.ipcRenderer.send('projector-command', 'update-theme', themeAccent);
      sendVerseToProjector();
    });

    return () => {
      unsubscribe?.();
    };
  }, [sendVerseToProjector]);

  // Detect external display aspect ratio at startup
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;

    const detectDisplayRatio = async () => {
      try {
        const data = await window.electron.ipcRenderer.invoke('get-displays');
        if (!data || data.length === 0) return;

        const { settings } = usePresenterStore.getState();
        if (!settings.display.autoDefine) return;

        // Prefer external display, fall back to primary
        const external = data.find((d: { bounds: { x: number; y: number } }) => d.bounds.x !== 0 || d.bounds.y !== 0);
        const display = external || data[0];
        const ratio = display.size.width / display.size.height;

        if (settings.display.aspectRatio !== ratio) {
          usePresenterStore.getState().updateDisplay({ aspectRatio: ratio });
        }
      } catch (err) {
        console.error('Failed to detect display ratio:', err);
      }
    };

    detectDisplayRatio();
  }, []);

  // Sync Live Modes with service
  const [blackout, setBlackout] = useAtom(blackoutActiveAtom);
  const [whiteout, setWhiteout] = useAtom(whiteoutActiveAtom);
  const [logo, setLogo] = useAtom(logoActiveAtom);
  const [logoUrl] = useAtom(liveLogoUrlAtom);

  useEffect(() => {
    LiveSyncService.setBlackout(blackout);
  }, [blackout]);

  useEffect(() => {
    LiveSyncService.setWhiteout(whiteout);
  }, [whiteout]);

  useEffect(() => {
    LiveSyncService.setLogo(logo, logoUrl);
  }, [logo, logoUrl]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-950 text-stone-200">
      {/* Sidebar Area */}
      {sidebarOpen && (
        <>
          {/* Column 1: Navigation / Library */}
          <div style={{ width: navPanel.size }} className="h-full shrink-0">
            <NavigationPanel onOpenSettings={() => setSettingsOpen(true)} />
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={navPanel.handleMouseDown}
            className="w-1 bg-stone-800 hover:bg-accent transition-colors cursor-col-resize shrink-0"
          />

          <div style={{ width: sidePanel.size }} className="h-full shrink-0">
            {appMode === 'scripture' ? (
              <VerseList />
            ) : (
              <PresentationLibrary />
            )}
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={sidePanel.handleMouseDown}
            className="w-1 bg-stone-800 hover:bg-accent transition-colors cursor-col-resize shrink-0"
          />
        </>
      )}

      {/* Main Stage (Slide Display) */}
      <main className="flex-1 h-full relative flex flex-col min-w-0 @container">
        {/* Toggle Buttons Area */}
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-stone-900/80 text-stone-400 rounded-md hover:text-amber-400 hover:bg-stone-800 border border-stone-800 backdrop-blur-md transition-colors"
            title={sidebarOpen ? t('hide_controls') : t('show_controls')}
          >
            {sidebarOpen ? <SidebarClose className="w-5 h-5" /> : <SidebarOpen className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className={cn(
              "p-2 rounded-md border backdrop-blur-md transition-colors",
              historyOpen
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                : "bg-stone-900/80 text-stone-400 hover:text-amber-400 hover:bg-stone-800 border-stone-800"
            )}
            title={t('history')}
          >
            <Clock className="w-5 h-5" />
          </button>

          <button
            onClick={openProjector}
            className="p-2 bg-stone-900/80 text-stone-400 rounded-md hover:text-accent hover:bg-stone-800 border border-stone-800 backdrop-blur-md transition-colors"
            title={t('open_projector')}
          >
            <MonitorPlay className="w-5 h-5" />
          </button>

          <button
            onClick={() => setPresenterActive(true)}
            className="p-2 bg-stone-900/80 text-stone-400 rounded-md hover:text-accent hover:bg-stone-800 border border-stone-800 backdrop-blur-md transition-colors"
            title={t('present_on_screen')}
          >
            <Presentation className="w-5 h-5" />
          </button>

          <button
            onClick={() => useModalStore.getState().openModal(ModalType.CUSTOMIZATION)}
            className="p-2 bg-stone-900/80 text-stone-400 rounded-md hover:text-accent hover:bg-stone-800 border border-stone-800 backdrop-blur-md transition-colors"
            title={t('customization')}
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Emergency Modes Controls */}
          <div className="h-9 w-px bg-white/5 mx-1" />

          <button
            onClick={() => setBlackout(!blackout)}
            className={cn(
              "p-2 rounded-md border backdrop-blur-md transition-all flex items-center justify-center relative group overflow-hidden",
              blackout
                ? "bg-red-500/20 text-red-500 border-red-500/50 shadow-lg shadow-red-500/10"
                : "bg-stone-900/80 text-stone-400 hover:text-white hover:bg-stone-800 border-stone-800"
            )}
            title={`${t('blackout', 'Black Out')} (B)`}
          >
            <Square className={cn("w-5 h-5 fill-current transition-transform", blackout ? "scale-110" : "scale-90 opacity-20")} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 text-[10px] font-bold">B</div>
          </button>

          <button
            onClick={() => setWhiteout(!whiteout)}
            className={cn(
              "p-2 rounded-md border backdrop-blur-md transition-all flex items-center justify-center relative group overflow-hidden",
              whiteout
                ? "bg-stone-100 text-black border-white shadow-lg shadow-white/10"
                : "bg-stone-900/80 text-stone-400 hover:text-white hover:bg-stone-800 border-stone-800"
            )}
            title={`${t('whiteout', 'White Out')} (W)`}
          >
            <Square className={cn("w-5 h-5 fill-current transition-transform", whiteout ? "scale-110" : "scale-90 opacity-20")} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/20 text-black text-[10px] font-bold">W</div>
          </button>

          <button
            onClick={() => setLogo(!logo)}
            className={cn(
              "p-2 rounded-md border backdrop-blur-md transition-all flex items-center justify-center relative group overflow-hidden",
              logo
                ? "bg-accent/20 text-accent border-accent/50 shadow-lg shadow-accent/10"
                : "bg-stone-900/80 text-stone-400 hover:text-white hover:bg-stone-800 border-stone-800"
            )}
            title={`${t('logo_mode', 'Show Logo')} (L)`}
          >
            <ImageIcon className={cn("w-5 h-5 transition-transform", logo ? "scale-110" : "scale-90")} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 text-[10px] font-bold">L</div>
          </button>

          {/* Live Indicator */}
          {(blackout || whiteout || logo) && (
            <div className="ml-2 px-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Live Override Active</span>
            </div>
          )}
        </div>

        {/* Slider Navigation */}
        <SlideDisplay />

        {/* Slide Variable Editor */}
        {appMode === 'presentation' && <VariableEditor />}

        {/* Slide Timeline (Bottom) */}
        {appMode === 'presentation' && <SlideTimeline />}

        {/* Customization Panel */}
        <CustomizationPanel />

        {/* Previous Verse Preview (Bottom Left) */}
        {prevVersePreview && !useModalStore.getState().isModalOpen(ModalType.CUSTOMIZATION) && (
          <div className="absolute bottom-6 left-6 z-40">
            <button
              onClick={() => {
                setActiveVerse(prevVersePreview);
              }}
              className="bg-stone-900/90 border border-white/10 px-4 py-3 rounded-xl backdrop-blur-xl shadow-2xl hover:border-accent/50 transition-all text-left group animate-in slide-in-from-bottom-4 duration-500 flex flex-col gap-1 @md:w-72 @md:h-32 @md:p-4 @md:rounded-2xl"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none whitespace-nowrap">
                  {t('prev_verse', 'Previous Verse')}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {getBookName(prevVersePreview.bookId, lang)} {prevVersePreview.chapter}:{prevVersePreview.verseNumber}
              </h4>
              <p className="hidden @md:block text-[10px] text-stone-400 line-clamp-3 italic leading-relaxed mt-1">
                {processVerseText(truncateMiddle(prevVersePreview.text, 120))}
              </p>
            </button>
          </div>
        )}

        {/* Next Verse Preview (Bottom Right) */}
        {nextVersePreview && !useModalStore.getState().isModalOpen(ModalType.CUSTOMIZATION) && (
          <div className="absolute bottom-6 right-6 z-40">
            <button
              onClick={() => {
                setActiveVerse(nextVersePreview);
              }}
              className="bg-stone-900/90 border border-white/10 px-4 py-3 rounded-xl backdrop-blur-xl shadow-2xl hover:border-amber-500/50 transition-all text-left group animate-in slide-in-from-bottom-4 duration-500 flex flex-col gap-1 @md:w-72 @md:h-32 @md:p-4 @md:rounded-2xl"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none whitespace-nowrap">
                  {t('next_verse', 'Next Verse')}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {getBookName(nextVersePreview.bookId, lang)} {nextVersePreview.chapter}:{nextVersePreview.verseNumber}
              </h4>
              <p className="hidden @md:block text-[10px] text-stone-400 line-clamp-3 italic leading-relaxed mt-1">
                {processVerseText(truncateMiddle(nextVersePreview.text, 120))}
              </p>
            </button>
          </div>
        )}
      </main>

      {/* History Panel (Right Side) */}
      {historyOpen && (
        <div style={{ width: 300 }} className="h-full shrink-0 animate-in slide-in-from-right duration-300">
          <HistoryPanel />
        </div>
      )}

      {/* Global Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <QuickSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Local Presenter Overlay */}
      {presenterActive && (
        <LocalPresenterOverlay onClose={() => setPresenterActive(false)} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ControllerLayout />} />
        <Route path="/projector" element={<ProjectorView />} />
      </Routes>
    </HashRouter>
  );
};

export default App;