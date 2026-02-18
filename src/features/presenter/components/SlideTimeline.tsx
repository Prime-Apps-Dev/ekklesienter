import React, { useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { usePresentationStore } from '@/core/store/presentationStore';
import { useTranslation } from 'react-i18next';
import { Plus, GripVertical, Trash2, Layers, Music, Monitor, Coins, Baby, Mic2, Megaphone, Presentation } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { ISlide, IBlock } from '@/core/types';

const SlideTimeline: React.FC = () => {
    const { t } = useTranslation();
    const { activePresentationId, selectedSlideId, setSelectedSlide, updatePresentationSlides } = usePresentationStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    const presentation = useLiveQuery(
        () => activePresentationId ? db.presentationFiles.get(activePresentationId) : undefined,
        [activePresentationId]
    );

    const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
    const blocksMap = new Map(blocks.map(b => [b.id, b]));

    const slides = presentation?.slides || [];

    const handleAddSlide = async (blockId: string) => {
        if (!activePresentationId) return;
        const block = blocksMap.get(blockId);
        if (!block) return;

        const newSlide: ISlide = {
            id: crypto.randomUUID(),
            order: slides.length,
            blockId,
            templateId: 'default', // Placeholder
            content: { variables: {} },
        };

        const newSlides = [...slides, newSlide];
        await updatePresentationSlides(activePresentationId, newSlides);
        setSelectedSlide(newSlide.id);
    };

    const handleRemoveSlide = async (e: React.MouseEvent, slideId: string) => {
        e.stopPropagation();
        if (!activePresentationId) return;
        const newSlides = slides.filter(s => s.id !== slideId).map((s, i) => ({ ...s, order: i }));
        await updatePresentationSlides(activePresentationId, newSlides);
        if (selectedSlideId === slideId) {
            setSelectedSlide(null);
        }
    };

    // Sync scroll to selected slide
    useEffect(() => {
        if (selectedSlideId && scrollRef.current) {
            const activeEl = scrollRef.current.querySelector(`[data-slide-id="${selectedSlideId}"]`);
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [selectedSlideId]);

    if (!activePresentationId) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-stone-900/60 backdrop-blur-xl border-t border-white/5 flex flex-col z-30 animate-in slide-in-from-bottom duration-500">
            {/* Header / Toolbar */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        {t('timeline', 'Timeline')}
                    </span>
                    <div className="h-4 w-px bg-white/5" />
                    <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                        {slides.length} {t('slides', 'Slides')}
                    </span>
                </div>

                {/* Quick Add Toolbar */}
                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                    {blocks.map((block) => {
                        const IconMap: any = { Monitor, Music, Coins, Baby, Mic2, Megaphone };
                        const BlockIcon = IconMap[block.icon] || Presentation;
                        return (
                            <button
                                key={block.id}
                                onClick={() => handleAddSlide(block.id)}
                                className="p-1.5 text-stone-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-all group relative"
                                title={`${t('add_slide', 'Add')}: ${block.name}`}
                            >
                                <BlockIcon className="w-4 h-4" />
                                <div className="absolute -top-1 -right-1">
                                    <Plus className="w-2.5 h-2.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Timeline Scroll */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center p-4 gap-3 bg-stone-950/20"
            >
                {slides.map((slide) => {
                    const block = blocksMap.get(slide.blockId);
                    const IconMap: any = { Monitor, Music, Coins, Baby, Mic2, Megaphone };
                    const BlockIcon = block ? (IconMap[block.icon] || Presentation) : Presentation;
                    const isSelected = selectedSlideId === slide.id;

                    return (
                        <div
                            key={slide.id}
                            data-slide-id={slide.id}
                            onClick={() => setSelectedSlide(slide.id)}
                            className={cn(
                                "group relative shrink-0 w-32 aspect-video rounded-xl border transition-all cursor-pointer overflow-hidden",
                                isSelected
                                    ? "border-accent ring-2 ring-accent/20 scale-105 z-10 shadow-lg shadow-accent/10"
                                    : "border-white/5 hover:border-white/20 bg-stone-900"
                            )}
                        >
                            {/* Slide Preview Placeholder */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 bg-linear-to-br from-white/2 to-transparent">
                                <BlockIcon className={cn("w-6 h-6", isSelected ? "text-accent" : "text-stone-700")} strokeWidth={1.5} />
                                <span className={cn(
                                    "text-[8px] font-bold uppercase tracking-tight text-center line-clamp-2",
                                    isSelected ? "text-stone-300" : "text-stone-600"
                                )}>
                                    {block?.name || 'Slide'}
                                </span>
                            </div>

                            {/* Slide Index Badge */}
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/5 text-[8px] font-black text-stone-500">
                                {slide.order + 1}
                            </div>

                            {/* Actions Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={(e) => handleRemoveSlide(e, slide.id)}
                                    className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors border border-red-500/20"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <div className="p-1.5 text-stone-400 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Bottom Accent Bar */}
                            {block && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-1"
                                    style={{ backgroundColor: isSelected ? 'var(--color-accent)' : block.color }}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Empty State / End of Timeline */}
                {slides.length === 0 && (
                    <div className="flex-1 flex items-center justify-center gap-4 text-stone-700 italic border-2 border-dashed border-white/5 rounded-2xl h-full mx-4">
                        <Layers className="w-6 h-6 opacity-20" />
                        <span className="text-xs">{t('timeline_empty_hint', 'Add slides from the toolbar or drag blocks here.')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlideTimeline;
