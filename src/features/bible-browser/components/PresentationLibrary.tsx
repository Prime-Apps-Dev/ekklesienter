import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { usePresentationStore } from '@/core/store/presentationStore';
import { useModalStore, ModalType } from '@/core/store/modalStore';
import { useTranslation } from 'react-i18next';
import { BookOpen, Monitor, Music, Coins, Baby, Mic2, Megaphone, Plus, Presentation, LayoutTemplate, Layers } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { IBlock, ISlide, ITemplate } from '@/core/types';
import PresentationSelector from '@/features/presenter/components/PresentationSelector';
import SlideContentRenderer from '@/features/presenter/components/SlideContentRenderer';

const ICON_MAP: Record<string, React.FC<{ className?: string; strokeWidth?: number }>> = {
    Monitor, Music, Coins, Baby, Mic2, Megaphone, BookOpen, Plus, Presentation, Layers
};

const TemplatePreviewItem: React.FC<{
    template: ITemplate;
    selectedBlock: IBlock | undefined;
    selectedSlide: ISlide | undefined;
    lang: string;
    isRu: boolean;
    activePresentationId: string | null;
    onClick: (template: ITemplate) => void;
}> = ({ template, selectedBlock, selectedSlide, lang, isRu, activePresentationId, onClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.1);

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                if (width > 0) {
                    setScale(width / 1920);
                }
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <button
            onClick={() => onClick(template)}
            disabled={!activePresentationId}
            className={cn(
                "aspect-video rounded-xl border transition-all cursor-pointer group flex flex-col items-center justify-center p-2 text-center relative overflow-hidden min-w-[140px] max-w-full",
                activePresentationId
                    ? "border-white/5 hover:border-accent/40 hover:scale-[1.02] active:scale-[0.98]"
                    : "border-white/3 opacity-50 cursor-not-allowed"
            )}
        >
            {/* Live Preview Wrapper */}
            <div ref={containerRef} className="absolute inset-0 overflow-hidden">
                <SlideContentRenderer
                    template={template}
                    block={selectedBlock}
                    variables={selectedSlide?.content?.variables || {}}
                    lang={lang}
                    isPreview={true}
                    scale={scale}
                    canvasItems={template.canvasItems || []}
                    hideOverlays={false}
                />
            </div>

            {/* Overlay + Label (Only for Blank Template) */}
            {template.id === 'blank-dark' && (
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all z-10 flex flex-col items-center justify-center gap-1 p-2">
                    <LayoutTemplate className="w-5 h-5 text-white/50 group-hover:text-white/90 transition-all transform group-hover:scale-110" />
                    <span className="text-[10px] font-black text-white/70 group-hover:text-white uppercase tracking-wider transition-all line-clamp-2 drop-shadow-md">
                        {isRu ? template.nameRu : template.name}
                    </span>
                </div>
            )}
        </button>
    );
};

const PresentationLibrary: React.FC = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language?.substring(0, 2) || 'en';
    const isRu = lang === 'ru';

    const {
        activePresentationId,
        activeServiceId,
        activeService,
        updatePresentationSlides,
        setPreviewSlide,
        activeBlockId,
        setActiveBlockId,
        previewSlideId
    } = usePresentationStore();

    const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
    const presentation = useLiveQuery(
        () => activePresentationId ? db.presentationFiles.get(activePresentationId) : undefined,
        [activePresentationId]
    );
    const allPresentations = useLiveQuery(() => db.presentationFiles.toArray()) || [];

    const templates = useLiveQuery(
        () => activeBlockId ? db.templates.where('category').equals(activeBlockId).toArray() : [],
        [activeBlockId]
    ) || [];

    const selectedSlide = useMemo(() =>
        presentation?.slides?.find(s => s.id === previewSlideId),
        [presentation, previewSlideId]
    );

    const handleTemplateClick = async (template: ITemplate) => {
        if (!activePresentationId || !presentation) return;

        const slides = presentation.slides || [];

        // Deep clone canvas items to prevent reference issues
        const sourceCanvasItems = template.canvasItems || [];
        const newCanvasItems = sourceCanvasItems.map(item => ({
            ...item,
            id: crypto.randomUUID()
        }));

        const newSlide: ISlide = {
            id: crypto.randomUUID(),
            order: slides.length,
            blockId: template.category,
            templateId: template.id,
            backgroundOverride: undefined,
            content: {
                variables: template.assets?.[0]?.type === 'text' ? { content: template.assets[0].content } : {},
                canvasItems: newCanvasItems.length > 0 ? newCanvasItems : undefined
            },
        };

        const newSlides = [...slides, newSlide];
        await updatePresentationSlides(activePresentationId, newSlides);
        setPreviewSlide(newSlide.id);
    };

    const handlePresentationClick = async (targetPres: any) => {
        if (!activePresentationId || !presentation) return;
        if (targetPres.id === activePresentationId) return;

        const slides = presentation.slides || [];
        const newSlide: ISlide = {
            id: crypto.randomUUID(),
            order: slides.length,
            blockId: 'master-presentation',
            templateId: 'default', // Master presentations don't use templates in the same way, but we need a valid ID
            backgroundOverride: undefined,
            content: { variables: {} },
            masterPresentationId: targetPres.id,
            isExpanded: false
        };

        const newSlides = [...slides, newSlide];
        await updatePresentationSlides(activePresentationId, newSlides);
        setPreviewSlide(newSlide.id);
    };

    const selectedBlock = blocks.find(b => b.id === activeBlockId);

    return (
        <div className="h-full flex flex-col bg-stone-900/30 border-r border-white/5">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 h-[60px]">
                <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                    <LayoutTemplate className="w-3 h-3" />
                    {selectedBlock ? (isRu ? selectedBlock.nameRu : selectedBlock.name) : t('templates', 'Templates')}
                </h3>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                {activeBlockId ? (
                    /* Templates Grid for selected block */
                    <>
                        {selectedBlock && (
                            <div className="mb-3">
                                <p className="text-[10px] text-stone-600 px-1">
                                    {t('select_template', 'Select Template')}
                                </p>
                            </div>
                        )}

                        {activeBlockId === 'master-presentation' ? (
                            /* Presentation Selection for Master slides */
                            <div className="space-y-2">
                                {allPresentations.filter(p => p.id !== activePresentationId).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePresentationClick(p)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-accent/10 hover:border-accent/40 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:bg-orange-500/20">
                                            <Layers className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[11px] font-bold text-stone-200 truncate">{p.name}</span>
                                            <span className="text-[9px] text-stone-600 font-bold uppercase">{p.slides.length} {t('slides', 'slides')}</span>
                                        </div>
                                        <Plus className="w-3.5 h-3.5 text-stone-700 group-hover:text-accent" />
                                    </button>
                                ))}
                                {allPresentations.length <= 1 && (
                                    <div className="py-8 text-center px-4">
                                        <p className="text-[10px] text-stone-600 italic">
                                            {t('no_presentations_available', 'No other presentations available to insert')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Templates Grid */
                            templates.length > 0 ? (
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                                    {templates.map((template) => (
                                        <TemplatePreviewItem
                                            key={template.id}
                                            template={template}
                                            selectedBlock={selectedBlock}
                                            selectedSlide={selectedSlide}
                                            lang={lang}
                                            isRu={isRu}
                                            activePresentationId={activePresentationId}
                                            onClick={handleTemplateClick}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-[10px] text-stone-600 italic">
                                        {t('no_templates', 'No templates available')}
                                    </p>
                                </div>
                            )
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-600 gap-3 px-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-stone-800/50 flex items-center justify-center">
                            <Presentation className="w-6 h-6 opacity-30" />
                        </div>
                        <p className="text-xs font-medium italic opacity-50">
                            {t('select_block_hint_templates', 'Select a block in the left panel to see its templates')}
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom: Presentation Selector Only */}
            <div className="shrink-0 p-3 border-t border-white/5 bg-stone-950/40 relative z-30">
                <PresentationSelector className="h-[60px]" />
            </div>
        </div>
    );
};

export default PresentationLibrary;
