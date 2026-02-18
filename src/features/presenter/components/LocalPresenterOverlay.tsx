import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBibleStore } from '@/core/store/bibleStore';
import { ChevronLeft, ChevronRight, Maximize, X, Palette } from 'lucide-react';
import { VerseDisplay } from './VerseDisplay';
import { useModalStore, ModalType } from '@/core/store/modalStore';
import { usePresenterStore } from '@/core/store/presenterStore';
import CustomizationPanel from './CustomizationPanel';
import { useContainFit } from '@/core/hooks/useContainFit';

interface LocalPresenterOverlayProps {
    onClose: () => void;
}


const LocalPresenterOverlay: React.FC<LocalPresenterOverlayProps> = ({ onClose }) => {
    const { t } = useTranslation();
    const { activeVerse, navigateNext, navigatePrev } = useBibleStore();
    const { openModal } = useModalStore();
    const settings = usePresenterStore(state => state.settings);
    const aspectRatio = settings.display.aspectRatio || 16 / 9;
    const { width: fitW, height: fitH, containerRef: screenRef } = useContainFit(aspectRatio, 24);

    // Keyboard navigation
    // ... (rest same)

    return (
        <div ref={screenRef} className="fixed inset-0 z-9999 bg-stone-900/40 backdrop-blur-xl flex flex-col items-center justify-center select-none overflow-hidden">
            {/* Customization Panel is now at App.tsx root level */}

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 bg-linear-to-b from-black/40 to-transparent pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
                            <Maximize className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-stone-300 text-sm font-medium uppercase tracking-widest">
                            {t('preview_mode') || 'Preview Mode'}
                        </span>
                    </div>

                    <button
                        onClick={() => openModal(ModalType.CUSTOMIZATION)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-stone-300 hover:text-white rounded-xl transition-all border border-white/5 bg-black/20 group"
                    >
                        <Palette className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{t('customization') || 'Customization'}</span>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 text-stone-400 hover:text-white rounded-xl transition-all pointer-events-auto group"
                    title={t('exit_presenter') || 'Exit Presenter'}
                >
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>


            {/* Simulated Screen Container */}
            <div
                className="relative bg-black shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden group/screen"
                style={{
                    borderRadius: settings.display.cornerRadius ? `${settings.display.cornerRadius}px` : undefined,
                    ...(fitW !== undefined ? { width: fitW, height: fitH } : {
                        maxWidth: 'calc(100% - 48px)',
                        maxHeight: 'calc(100% - 48px)',
                        aspectRatio,
                        width: '100%'
                    })
                }}
            >
                {activeVerse ? (
                    <VerseDisplay
                        verse={activeVerse}
                        autoFit={true}
                        showReference={true}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <p className="text-stone-600 text-3xl italic">
                            {t('no_verse_selected') || 'Select a verse to present'}
                        </p>
                    </div>
                )}

                {/* Left/Right Overlays for Quick Navigation (inside the simulated screen but subtle) */}
                <button
                    onClick={navigatePrev}
                    className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-start pl-4 opacity-0 group-hover/screen:opacity-100 transition-opacity bg-linear-to-r from-black/40 to-transparent pointer-events-auto cursor-pointer"
                >
                    <ChevronLeft className="w-10 h-10 text-white/40 hover:text-white transition-colors" />
                </button>

                <button
                    onClick={navigateNext}
                    className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-4 opacity-0 group-hover/screen:opacity-100 transition-opacity bg-linear-to-l from-black/40 to-transparent pointer-events-auto cursor-pointer"
                >
                    <ChevronRight className="w-10 h-10 text-white/40 hover:text-white transition-colors" />
                </button>
            </div>

            {/* Bottom Bar Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-4 bg-linear-to-t from-black/60 to-transparent">
                {/* Navigation Pills */}
                <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 shadow-2xl">
                    <button
                        onClick={navigatePrev}
                        className="p-3 hover:bg-white/10 text-stone-400 hover:text-white rounded-xl transition-all active:scale-95"
                        title={t('previous') || 'Previous'}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1" />

                    <button
                        onClick={navigateNext}
                        className="p-3 hover:bg-white/10 text-stone-400 hover:text-white rounded-xl transition-all active:scale-95"
                        title={t('next') || 'Next'}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-stone-500 text-xs font-medium uppercase tracking-[0.3em] bg-black/20 px-4 py-1.5 rounded-full border border-white/5">
                    {t('presenter_controls_hint') || 'Use arrow keys or click edges to navigate'}
                </p>
            </div>
        </div>
    );
};

export default LocalPresenterOverlay;
