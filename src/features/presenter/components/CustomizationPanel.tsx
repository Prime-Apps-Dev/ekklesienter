import React, { useState } from 'react';
import { usePresenterStore } from '@/core/store/presenterStore';
import { createPortal } from 'react-dom';
import { useModalStore, ModalType } from '@/core/store/modalStore';
import { X, Palette, Type, Layout, RotateCcw, Languages, Image as ImageIcon, Underline } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';
import { BackgroundPicker } from './BackgroundPicker';
import { FontPicker } from './FontPicker';
import { ReferenceStylePicker } from './ReferenceStylePicker';
import { TranslationLabelPicker } from './TranslationLabelPicker';
import { LayoutSettingsPicker } from './LayoutSettingsPicker';
import { VerseDisplay } from './VerseDisplay';
import { useBibleStore } from '@/core/store/bibleStore';
import { useContainFit } from '@/core/hooks/useContainFit';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { ParallelVerseDisplay } from './ParallelVerseDisplay';

type Tab = 'background' | 'font' | 'translation' | 'style' | 'layout';

const CustomizationPanel: React.FC = () => {
    const { t } = useTranslation();
    const { closeModal, isModalOpen } = useModalStore();
    const {
        settings,
        draftSettings,
        startEditing,
        updateDraft,
        commitDraft,
        cancelEditing,
        resetSettings
    } = usePresenterStore();
    const { activeVerse, secondTranslationId } = useBibleStore();

    const parallelVerse = useLiveQuery(
        async () => {
            if (!activeVerse || !secondTranslationId) return null;
            return await db.verses
                .where('[translationId+bookId+chapter]')
                .equals([secondTranslationId, activeVerse.bookId, activeVerse.chapter])
                .and(v => v.verseNumber === activeVerse.verseNumber)
                .first();
        },
        [activeVerse?.bookId, activeVerse?.chapter, activeVerse?.verseNumber, secondTranslationId]
    );

    const [activeTab, setActiveTab] = useState<Tab>('background');

    const isOpen = isModalOpen(ModalType.CUSTOMIZATION);
    const ratio = settings.display.aspectRatio || 16 / 9;
    const { width: fitW, height: fitH, containerRef: previewRef } = useContainFit(ratio, 24);

    const currentVerse = activeVerse || {
        bookId: 'GEN',
        chapter: 1,
        verseNumber: 1,
        text: 'In the beginning God created the heaven and the earth.',
        translationId: 'KJV'
    };

    // Initialize/Cleanup Design Mode
    React.useEffect(() => {
        if (isOpen) {
            startEditing();
        } else {
            cancelEditing();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
        { id: 'background', icon: ImageIcon, label: t('background') || 'Background' },
        { id: 'font', icon: Type, label: t('typography') || 'Typography' },
        { id: 'translation', icon: Languages, label: t('translations') || 'Translations' },
        { id: 'style', icon: Underline, label: t('reference_style') || 'Style' },
        { id: 'layout', icon: Layout, label: t('layout') || 'Layout' },
    ];

    const handleDone = () => {
        commitDraft();
        closeModal(ModalType.CUSTOMIZATION);
    };

    const handleCancel = () => {
        cancelEditing();
        closeModal(ModalType.CUSTOMIZATION);
    };

    return createPortal(
        <div className="fixed inset-0 z-10000 flex overflow-hidden bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
            {/* Left Side: Live Preview */}
            <div ref={previewRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
                {/* Close/Cancel Backdrop Click */}
                <div className="absolute inset-0 cursor-zoom-out" onClick={handleCancel} />

                {/* Preview Container (JS-computed contain-fit dimensions) */}
                <div
                    className="relative z-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-700 delay-200 fill-mode-both ring-1 ring-white/5 transition-all"
                    style={{
                        borderRadius: (draftSettings || settings).display.cornerRadius ? `${(draftSettings || settings).display.cornerRadius}px` : undefined,
                        ...(fitW !== undefined ? { width: fitW, height: fitH } : {
                            maxWidth: 'calc(100% - 48px)',
                            maxHeight: 'calc(100% - 48px)',
                            aspectRatio: ratio,
                            width: '100%'
                        })
                    }}
                >
                    {parallelVerse ? (
                        <ParallelVerseDisplay
                            verse1={currentVerse as any}
                            verse2={parallelVerse}
                            autoFit={true}
                            settings={draftSettings || settings}
                        />
                    ) : (
                        <VerseDisplay
                            verse={currentVerse as any}
                            settings={draftSettings || settings}
                            autoFit={true}
                            showReference={true}
                        />
                    )}

                    {/* Live Badge */}
                    <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">{t('live_preview')}</span>
                    </div>
                </div>
            </div>

            {/* ─── Right Panel: Design Studio ─── */}
            <div className="relative w-[460px] h-full flex flex-col animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
                {/* Background layers */}
                <div className="absolute inset-0 bg-stone-950/98 shadow-[-40px_0_80px_rgba(0,0,0,0.6)] border-l border-white/5" />
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                {/* ─── Header ─── */}
                <div className="relative z-10 px-6 pt-6 pb-0 shrink-0">
                    {/* Top Row: Title + Close */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                                <Palette className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight leading-none">
                                    {t('design_studio') || 'Design Studio'}
                                </h2>
                                <p className="text-[9px] text-stone-600 uppercase tracking-[0.2em] font-bold mt-1">{t('appearance_editor')}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="p-2 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl text-stone-500 transition-all border border-white/5 active:scale-95"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ─── Segmented Tab Control ─── */}
                    <div className="bg-white/3 rounded-2xl border border-white/5 p-1 flex gap-1 shadow-inner">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-200 relative group",
                                    activeTab === tab.id
                                        ? "text-accent bg-accent/10"
                                        : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
                                )}
                                title={tab.label}
                            >
                                <tab.icon className={cn("w-5 h-5 transition-transform duration-300", activeTab === tab.id && "scale-110")} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Scrollable Content ─── */}
                <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-6 py-6 scroll-smooth min-h-0">
                    <div className="pb-4">
                        {activeTab === 'background' && <BackgroundPicker />}
                        {activeTab === 'font' && <FontPicker />}
                        {activeTab === 'translation' && <TranslationLabelPicker />}
                        {activeTab === 'style' && <ReferenceStylePicker />}
                        {activeTab === 'layout' && <LayoutSettingsPicker />}
                    </div>
                </div>

                {/* ─── Footer Actions ─── */}
                <div className="relative z-10 px-6 pb-6 pt-4 border-t border-white/5 bg-stone-950/80 backdrop-blur-xl shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-stone-500 hover:text-stone-200 rounded-2xl transition-all border border-white/5 active:scale-95 text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                            {t('discard') || 'Discard'}
                        </button>
                        <button
                            onClick={handleDone}
                            className="flex-2 py-3.5 bg-accent text-accent-foreground rounded-2xl transition-all border border-accent/20 shadow-[0_8px_30px_rgba(var(--accent-rgb),0.25)] hover:shadow-[0_8px_40px_rgba(var(--accent-rgb),0.35)] hover:scale-[1.02] active:scale-[0.98] text-[11px] font-black uppercase tracking-widest cursor-pointer"
                        >
                            {t('save_profile') || 'Save Design Profile'}
                        </button>
                    </div>
                    <div className="mt-3 flex justify-center">
                        <button
                            onClick={resetSettings}
                            className="group flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                        >
                            <RotateCcw className="w-3 h-3 text-stone-700 group-hover:text-stone-400 transition-colors" />
                            <span className="text-[10px] font-bold text-stone-700 group-hover:text-stone-400 uppercase tracking-widest transition-colors">
                                {t('restore_factory_settings') || 'Restore Defaults'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CustomizationPanel;
