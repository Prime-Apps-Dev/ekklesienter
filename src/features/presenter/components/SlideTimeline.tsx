import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePresentationStore } from '@/core/store/presentationStore';
import { usePresenterStore } from '@/core/store/presenterStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import {
    Plus, GripVertical, Trash2, Layers, Music, Monitor, Coins, Baby, Mic2,
    Megaphone, Presentation, Copy, ArrowLeft, ArrowRight, LayoutTemplate, BookOpen,
    ChevronsLeft, ChevronsRight, Paintbrush, RotateCcw, CopyCheck,
    ChevronRight, ChevronDown as ChevronDownIcon, ExternalLink, Unlink2, Link2, Unplug, Clock, Timer
} from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { ISlide, IBlock, ITemplate, IPresentationFile } from '@/core/types';
import ContextMenu, { ContextMenuItem } from '@/shared/ui/ContextMenu';
import { useModalStore, ModalType } from '@/core/store/modalStore';
import SlideContentRenderer from './SlideContentRenderer';
import TrackContainer, { TrackContainerHandle } from './timeline/TrackContainer';
import { useAtom } from 'jotai';
import { appModeAtom, isTimelineHoveredAtom } from '@/core/store/uiAtoms';
import AudioTrack from './timeline/AudioTrack';
import NestedPresentationTile from './timeline/NestedPresentationTile';
import SmartBadge from './timeline/SmartBadge';
import { LiveSyncService } from '@/core/services/liveSyncService';
import { toast } from '@/core/utils/toast';
import {
    DndContext,
    closestCenter,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useDroppable } from '@dnd-kit/core';

const ICON_MAP: Record<string, React.FC<{ className?: string; strokeWidth?: number }>> = {
    Monitor, Music, Coins, Baby, Mic2, Megaphone, BookOpen, Plus, Presentation
};

interface SlideTileProps {
    slide: ISlide;
    index: number;
    activePresentationId: string;
    previewSlideId: string | null;
    selectedPresentationId: string | null;
    liveSlideId: string | null;
    blocksMap: Map<string, IBlock>;
    templatesMap: Map<string, ITemplate>;
    lang: string;
    onSelect: (id: string) => void;
    onLive: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onToggleExpansion: (id: string) => void;
    attributes?: any;
    listeners?: any;
}

const SlideTile: React.FC<SlideTileProps> = ({
    slide,
    index,
    activePresentationId,
    previewSlideId,
    selectedPresentationId,
    liveSlideId,
    blocksMap,
    templatesMap,
    lang,
    onSelect,
    onLive,
    onContextMenu,
    onToggleExpansion,
    attributes,
    listeners
}) => {
    const block = blocksMap.get(slide.blockId);
    const template = templatesMap.get(slide.templateId);
    const isPreview = previewSlideId === slide.id && selectedPresentationId === activePresentationId;
    const isLive = liveSlideId === slide.id;
    const isMaster = slide.blockId === 'master-presentation';

    return (
        <div
            {...attributes}
            {...listeners}
            data-slide-id={slide.id}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(slide.id);
            }}
            onDoubleClick={() => onLive(slide.id)}
            onContextMenu={(e) => onContextMenu(e, slide.id)}
            className={cn(
                "group relative shrink-0 w-32 aspect-video rounded-xl border-2 cursor-pointer overflow-hidden leading-none",
                isPreview && !isLive && "border-accent ring-2 ring-accent/20 scale-105 z-10 shadow-lg shadow-accent/10",
                isLive && !isPreview && "border-red-500 ring-2 ring-red-500/20 scale-105 z-10 shadow-lg shadow-red-500/10",
                isPreview && isLive && "border-emerald-500 ring-2 ring-emerald-500/30 scale-105 z-10 shadow-lg shadow-emerald-500/10",
                !isPreview && !isLive && "border-white/5 hover:border-white/20 bg-stone-900",
                isMaster && !isPreview && !isLive && "border-orange-500/30"
            )}
        >
            <div className="absolute inset-0 z-0 pointer-events-none isolate">
                <SlideContentRenderer
                    template={template}
                    block={block}
                    variables={slide.content.variables}
                    lang={lang}
                    isPreview={true}
                    scale={128 / 1920}
                    backgroundOverride={slide.backgroundOverride}
                    canvasItems={slide.content.canvasItems}
                    slide={slide}
                    slideId={slide.id}
                />
            </div>
            <div className="absolute inset-x-0 top-0 h-8 bg-linear-to-b from-black/60 to-transparent z-10 pointer-events-none" />
            <div className="absolute z-20"><SmartBadge slide={slide} /></div>
            {isMaster && (
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleExpansion(slide.id); }}
                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-orange-500/30 text-white/60 hover:text-orange-400 rounded-md transition-all border border-white/10 z-20 cursor-pointer"
                >
                    {slide.isExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
            )}
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/5 text-[8px] font-black text-stone-400 z-20">{slide.order + 1}</div>
            {isLive && <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-red-500/30 backdrop-blur-md border border-red-500/30 text-[7px] font-black text-red-300 uppercase tracking-wider animate-pulse z-20">LIVE</div>}
            {isMaster && <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-orange-500/20 border border-orange-500/20 text-[6px] font-black text-orange-400 uppercase tracking-tighter z-20">Master</div>}
        </div>
    );
};

// ─── Sortable Slide Block Container ──────────────────────────────────────
interface SortableSlideBlockProps {
    slide: ISlide;
    index: number;
    activePresentationId: string;
    previewSlideId: string | null;
    selectedPresentationId: string | null;
    liveSlideId: string | null;
    blocksMap: Map<string, any>;
    templatesMap: Map<string, any>;
    presentationsMap: Map<string, IPresentationFile>;
    lang: string;
    onSelect: (id: string) => void;
    onLive: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onToggleExpansion: (id: string) => void;
    setContextMenu: (menu: any) => void;
}

const SortableSlideBlock: React.FC<SortableSlideBlockProps> = ({
    slide,
    index,
    activePresentationId,
    previewSlideId,
    selectedPresentationId,
    liveSlideId,
    blocksMap,
    templatesMap,
    presentationsMap,
    lang,
    onSelect,
    onLive,
    onContextMenu,
    onToggleExpansion,
    setContextMenu
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: slide.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
    };

    const isMaster = slide.blockId === 'master-presentation';
    const nestedPres = slide.masterPresentationId ? presentationsMap.get(slide.masterPresentationId) : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative flex items-center",
                isDragging && "opacity-90 z-50 scale-[1.03] shadow-[0_0_30px_rgba(0,0,0,0.5)] rotate-1"
            )}
        >
            <SlideTile
                slide={slide}
                index={index}
                activePresentationId={activePresentationId}
                previewSlideId={previewSlideId}
                selectedPresentationId={selectedPresentationId}
                liveSlideId={liveSlideId}
                blocksMap={blocksMap}
                templatesMap={templatesMap}
                lang={lang}
                onSelect={onSelect}
                onLive={onLive}
                onContextMenu={onContextMenu}
                onToggleExpansion={onToggleExpansion}
                attributes={attributes}
                listeners={listeners}
            />

            {isMaster && slide.isExpanded && nestedPres && (
                <NestedPresentationTile
                    slide={slide}
                    nestedPresentation={nestedPres}
                    blocksMap={blocksMap}
                    templatesMap={templatesMap}
                    lang={lang}
                    previewSlideId={previewSlideId}
                    selectedPresentationId={selectedPresentationId}
                    onContextMenu={(e, slideId, presentationId) => {
                        setContextMenu({ x: e.clientX, y: e.clientY, slideId, presentationId });
                    }}
                />
            )}
        </div>
    );
};

const TimelineDroppableZone: React.FC<{ onAddSlide: (blockId: string) => void }> = ({ onAddSlide }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: 'timeline-droppable',
        data: {
            accepts: ['presentation', 'block']
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "absolute inset-0 z-40 pointer-events-none border-2 border-transparent transition-all",
                isOver && "border-accent/40 bg-accent/5 pointer-events-auto"
            )}
        >
            {isOver && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-accent/20 backdrop-blur-md px-4 py-2 rounded-full border border-accent/30 text-accent font-bold text-xs">
                        {/* {t('drop_to_add', 'Drop to Add to Timeline')} */}
                        Drop to Add to Timeline
                    </div>
                </div>
            )}
        </div>
    );
};

const SlideTimeline: React.FC = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language?.substring(0, 2) || 'en';
    const {
        activePresentationId,
        selectedPresentationId,
        previewSlideId,
        liveSlideId,
        setActivePresentation,
        setPreviewSlide,
        setLiveSlide,
        updatePresentationSlides,
        updateSlideBackground,
        toggleSlideExpansion,
        detachNestedInstance,
        selectAudioScope,
        duplicateSlide,
        moveSlide,
        removeSlide,
        addPresentationToTimeline
    } = usePresentationStore();
    const { openModal } = useModalStore();
    const trackRef = useRef<TrackContainerHandle>(null);
    const [appMode] = useAtom(appModeAtom);
    const [, setIsHovered] = useAtom(isTimelineHoveredAtom);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slideId: string; presentationId: string } | null>(null);


    const isDetached = previewSlideId !== null && liveSlideId !== null && previewSlideId !== liveSlideId;

    const [localSlides, setLocalSlides] = useState<ISlide[]>([]);
    const dragActiveRef = useRef(false);
    const pendingUpdateRef = useRef(false);

    const activePresentation = usePresentationStore(s => s.activePresentation);
    const selectedPresentation = usePresentationStore(s => s.selectedPresentation);

    const dbPresentation = useLiveQuery(
        () => activePresentationId ? db.presentationFiles.get(activePresentationId) : undefined,
        [activePresentationId]
    );

    // Prioritize store's active presentation for the timeline
    const presentation = useMemo(() => {
        if (activePresentation?.id === activePresentationId) return activePresentation;
        return dbPresentation;
    }, [activePresentation, dbPresentation, activePresentationId]);

    // Sync localSlides with database updates only if we aren't dragging/updating
    useEffect(() => {
        if (!presentation?.slides) return;

        if (!dragActiveRef.current && !pendingUpdateRef.current) {
            setLocalSlides(presentation.slides);
        } else {
            // Give DB 100ms to catch up so we don't flash old state
            if (pendingUpdateRef.current) {
                const timer = setTimeout(() => {
                    pendingUpdateRef.current = false;
                    setLocalSlides(presentation.slides);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [presentation?.slides]);

    const allPresentations = useLiveQuery(() => db.presentationFiles.toArray()) || [];
    const presentationsMap = useMemo(() => {
        const map = new Map(allPresentations.map(p => [p.id, p]));
        if (selectedPresentation) map.set(selectedPresentation.id, selectedPresentation);
        if (activePresentation) map.set(activePresentation.id, activePresentation);
        return map;
    }, [allPresentations, activePresentation, selectedPresentation]);

    const blocks = useLiveQuery(() => db.blocks.toArray()) || [];
    const blocksMap = new Map(blocks.map(b => [b.id, b]));

    const templates = useLiveQuery(() => db.templates.toArray()) || [];
    const templatesMap = new Map(templates.map(t => [t.id, t]));

    const slides = presentation?.slides || [];

    // ── Compute Flattened Visual Timeline ──
    const visualTimeline = useMemo(() => {
        const items: Array<{
            id: string,
            width: number,
            x: number,
            type: 'slide' | 'nested' | 'edit-button' | 'spacer',
            slide?: ISlide,
            presentationId?: string,
            parentSlideId?: string
        }> = [];

        const TILE_WIDTH = 128;
        const TILE_GAP = 12; // gap-3

        let currentX = 0;

        for (const slide of slides) {
            // Top level slide
            items.push({
                id: slide.id,
                width: TILE_WIDTH,
                x: currentX,
                type: 'slide',
                slide,
                presentationId: activePresentationId!
            });

            const nextTopLevelX = currentX + TILE_WIDTH + TILE_GAP;

            // If expanded, insert its children
            if (slide.isExpanded && slide.masterPresentationId) {
                const nested = presentationsMap.get(slide.masterPresentationId);

                // The NestedPresentationTile is a sibling of the slide in the flex container
                // but its internal layout is handled inside.
                let nestedTrackX = nextTopLevelX;

                if (nested) {
                    // Start border/accent (20px)
                    items.push({
                        id: `spacer-start-${slide.id}`,
                        width: 20,
                        x: nestedTrackX,
                        type: 'spacer',
                        parentSlideId: slide.id
                    });
                    nestedTrackX += 20;

                    nested.slides.forEach((ns, idx) => {
                        items.push({
                            id: ns.id,
                            width: 96,
                            x: nestedTrackX,
                            type: 'nested',
                            slide: ns,
                            presentationId: nested.id,
                            parentSlideId: slide.id
                        });
                        nestedTrackX += 96;

                        // Gap between nested slides (10px)
                        if (idx < nested.slides.length - 1) {
                            items.push({
                                id: `spacer-ns-${ns.id}`,
                                width: 10,
                                x: nestedTrackX,
                                type: 'spacer',
                                parentSlideId: slide.id
                            });
                            nestedTrackX += 10;
                        }
                    });

                    // Gap before Edit button (10px) + Edit button (40px)
                    items.push({
                        id: `spacer-mid-${slide.id}`,
                        width: 10,
                        x: nestedTrackX,
                        type: 'spacer',
                        parentSlideId: slide.id
                    });
                    nestedTrackX += 10;

                    items.push({
                        id: `edit-${slide.id}`,
                        width: 40,
                        x: nestedTrackX,
                        type: 'edit-button',
                        parentSlideId: slide.id
                    });
                    nestedTrackX += 40;

                    // End accent/padding (20px)
                    items.push({
                        id: `spacer-end-${slide.id}`,
                        width: 20,
                        x: nestedTrackX,
                        type: 'spacer',
                        parentSlideId: slide.id
                    });
                    nestedTrackX += 20;
                }

                // The next top-level item (e.g. next slide) starts after the NestedPresentationTile
                currentX = nestedTrackX + TILE_GAP;
            } else {
                currentX = nextTopLevelX;
            }
        }
        return items;
    }, [slides, presentationsMap, activePresentationId]);

    useEffect(() => {
        if (appMode !== 'presentation') return;

        if (!liveSlideId) {
            LiveSyncService.clear();
            return;
        }

        const liveItem = visualTimeline.find(item => item.id === liveSlideId);
        if (liveItem?.slide) {
            LiveSyncService.showSlide(liveItem.slide);
        }
    }, [liveSlideId, visualTimeline, appMode]);

    // Handle projector handshake
    useEffect(() => {
        if (!window.electron?.ipcRenderer) return;

        const unsub = window.electron.ipcRenderer.on('projector-ready', () => {
            if (appMode === 'presentation' && liveSlideId) {
                const liveItem = visualTimeline.find(item => item.id === liveSlideId);
                if (liveItem?.slide) {
                    LiveSyncService.showSlide(liveItem.slide);
                }
            }
        });

        return () => unsub?.();
    }, [appMode, liveSlideId, visualTimeline]);

    const handleAddSlide = async (blockId: string) => {
        console.log('[SlideTimeline] handleAddSlide', { blockId, activePresentationId, presentationLoaded: !!presentation });
        if (!activePresentationId) {
            toast.error(t('error_no_active_presentation', 'No active presentation'));
            return;
        }

        // Wait for presentation to load to avoid overwriting existing slides with an empty array
        if (!presentation) {
            toast.info(t('loading_presentation', 'Loading presentation...'));
            return;
        }

        const block = blocksMap.get(blockId);
        if (!block && blockId !== 'default' && blockId !== 'bible') {
            console.error('[SlideTimeline] Block not found:', blockId);
            toast.error(t('error_block_not_found', 'Block type not found: {{blockId}}', { blockId }));
            return;
        }

        if (blockId === 'bible') {
            openModal(ModalType.BIBLE_SELECTION);
            return;
        }

        // Find first template for this block
        const blockTemplates = templates.filter(t => t.category === blockId);
        const templateId = blockTemplates.length > 0 ? blockTemplates[0].id : (blockId === 'default' ? 'empty-slide' : 'default');

        const newSlide: ISlide = {
            id: crypto.randomUUID(),
            order: slides.length,
            blockId,
            templateId,
            content: { variables: {} },
        };

        try {
            const newSlides = [...slides, newSlide];
            await updatePresentationSlides(activePresentationId, newSlides);
            setPreviewSlide(newSlide.id, activePresentationId);
            toast.success(t('slide_added', 'Slide added'));
        } catch (error) {
            console.error('[SlideTimeline] Failed to add slide:', error);
            toast.error(t('error_add_slide_failed', 'Failed to add slide'));
        }
    };

    const handleAddTimer = async () => {
        console.log('[SlideTimeline] handleAddTimer', { activePresentationId, presentationLoaded: !!presentation });
        if (!activePresentationId) return;
        if (!presentation) return;

        // Use 'default' block for timer slides or maybe a dedicated timer block if we had one
        const newSlide: ISlide = {
            id: crypto.randomUUID(),
            type: 'timer',
            order: slides.length,
            blockId: 'default',
            templateId: 'blank-dark', // Use existing blank template
            content: { variables: {} },
            timerSettings: {
                duration: 300, // 5 minutes
                style: 'digital',
                endAction: 'none'
            }
        };

        try {
            const newSlides = [...slides, newSlide];
            await updatePresentationSlides(activePresentationId, newSlides);
            setPreviewSlide(newSlide.id, activePresentationId);
            toast.success(t('timer_added', 'Timer added'));
        } catch (error) {
            console.error('[SlideTimeline] Failed to add timer:', error);
            toast.error(t('error_add_timer_failed', 'Failed to add timer'));
        }
    };

    const handleRestoreTemplateBg = async (slideId: string) => {
        // Clear backgroundOverride → falls back to template default
        await updateSlideBackground(slideId, null);
    };

    const handleApplyBgToAll = async (slideId: string) => {
        if (!activePresentationId) return;
        const slide = slides.find(s => s.id === slideId);
        if (!slide) return;

        // Use slide's backgroundOverride, or template's background as base
        const template = slide?.templateId ? templatesMap.get(slide.templateId) : undefined;
        const bgToApply = slide?.backgroundOverride || template?.background;
        if (!bgToApply) return;

        const { applyBackgroundToAll } = usePresentationStore.getState();
        await applyBackgroundToAll(bgToApply);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        dragActiveRef.current = false;
        const { active, over } = event;

        if (over && active.id === 'presentation-item-drag') {
            // This is a presentation drop from sidebar (assuming we set id: 'presentation-item-drag' data: { presentationId })
            const presentationId = active.data.current?.presentationId;
            if (presentationId) {
                await addPresentationToTimeline(presentationId);
                return;
            }
        }

        if (over && active.id !== over.id) {
            const oldIndex = localSlides.findIndex((s) => s.id === active.id);
            const newIndex = localSlides.findIndex((s) => s.id === over.id);

            const reorderedSlides = arrayMove(localSlides, oldIndex, newIndex).map((s, i) => ({
                ...s,
                order: i,
            }));

            // Optimistic update
            pendingUpdateRef.current = true;
            setLocalSlides(reorderedSlides);

            if (activePresentationId) {
                await updatePresentationSlides(activePresentationId, reorderedSlides);
            }
        }
    };

    // Sync scroll to selected slide
    useEffect(() => {
        if (previewSlideId) {
            trackRef.current?.scrollToSlide(previewSlideId);
        }
    }, [previewSlideId]);

    if (!activePresentationId) return null;

    return (
        <div
            data-timeline-root
            className="absolute bottom-0 left-0 right-0 bg-stone-900/60 backdrop-blur-xl border-t border-white/5 flex flex-col z-30 animate-in slide-in-from-bottom duration-500"
            style={{ height: 236 }}
            onClick={() => selectAudioScope(null)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header / Toolbar */}
            <TimelineDroppableZone onAddSlide={handleAddSlide} />
            <div className="px-4 h-10 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        {t('timeline', 'Timeline')}
                    </span>
                    <div className="h-4 w-px bg-white/5" />
                    <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                        {slides.length} {t('slides', 'Slides')}
                    </span>

                    {/* Detached Mode Warning */}
                    {isDetached && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/15 border border-red-500/30 rounded-lg animate-in fade-in zoom-in-90 duration-300">
                            <Unlink2 className="w-3 h-3 text-red-400" />
                            <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">
                                {t('detached_mode', 'Detached')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Quick Add Toolbar */}
                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => handleAddSlide('default')} // Use 'default' block for blank slides
                        className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-all group relative border border-accent/20"
                        title={t('add_blank_slide', 'Add Blank Slide')}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button
                        onClick={() => openModal(ModalType.BIBLE_SELECTION)}
                        className="p-1.5 text-stone-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-all group relative"
                        title={t('add_bible_verse', 'Add Bible Verse')}
                    >
                        <BookOpen className="w-4 h-4" />
                        <div className="absolute -top-1 -right-1">
                            <Plus className="w-2.5 h-2.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </button>
                    <button
                        onClick={handleAddTimer}
                        className="p-1.5 text-stone-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-all group relative"
                        title={t('add_timer_slide', 'Add Timer Slide')}
                    >
                        <Timer className="w-4 h-4" />
                        <div className="absolute -top-1 -right-1">
                            <Plus className="w-2.5 h-2.5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Timeline Scroll — Slide & Audio Tracks */}
            <div className="flex bg-stone-950/20 overflow-hidden flex-1 relative">

                {/* Fixed Track Headers (Left Column) */}
                <div className="w-20 shrink-0 border-r border-white/5 bg-stone-950/40 flex flex-col z-20 backdrop-blur-md">
                    {/* Slides Track Header */}
                    <div className="h-[98px] flex flex-col items-center justify-center p-2 opacity-50 hover:opacity-100 transition-opacity">
                        <Monitor className="w-5 h-5 mb-1 text-stone-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 text-center">
                            {t('slides', 'Slides')}
                        </span>
                    </div>
                    {/* Audio Track Header */}
                    {slides.length > 0 && (
                        <div className="h-[98px] shrink-0 flex flex-col items-center justify-center p-2 bg-purple-500/5 hover:bg-purple-500/10 transition-colors border-t border-white/5">
                            <Music className="w-4 h-4 mb-1 text-purple-400/70" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-purple-500/70 text-center">
                                {t('audio', 'Audio')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Scrollable Tracks Area */}
                <div className="flex-1 overflow-hidden relative">
                    <TrackContainer ref={trackRef}>
                        <div className="flex flex-col min-h-full">
                            {/* Lane 1: Slides */}
                            <div className="flex items-center px-8 py-4 min-w-full">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCorners}
                                    onDragStart={() => {
                                        dragActiveRef.current = true;
                                    }}
                                    onDragEnd={handleDragEnd}
                                    onDragCancel={() => {
                                        dragActiveRef.current = false;
                                    }}
                                    modifiers={[restrictToHorizontalAxis]}
                                >
                                    <div className="flex gap-2 relative">
                                        <SortableContext
                                            items={localSlides.map(s => s.id)}
                                            strategy={horizontalListSortingStrategy}
                                        >
                                            {localSlides.map((slide, index) => (
                                                <SortableSlideBlock
                                                    key={slide.id}
                                                    slide={slide}
                                                    index={index}
                                                    activePresentationId={activePresentationId!}
                                                    previewSlideId={previewSlideId}
                                                    selectedPresentationId={selectedPresentationId}
                                                    liveSlideId={liveSlideId}
                                                    blocksMap={blocksMap}
                                                    templatesMap={templatesMap}
                                                    presentationsMap={presentationsMap}
                                                    lang={lang}
                                                    onSelect={(id) => {
                                                        setPreviewSlide(id, activePresentationId);
                                                        // Assuming selectAudioScope is defined elsewhere or passed as prop
                                                        // For now, commenting out as it's not in the provided snippet
                                                        // selectAudioScope(null);
                                                    }}
                                                    onLive={async (id) => {
                                                        setPreviewSlide(id, activePresentationId);
                                                        setLiveSlide(id);

                                                        if (window.electron?.ipcRenderer) {
                                                            const displaySettings = usePresenterStore.getState().settings.display;
                                                            await window.electron.ipcRenderer.invoke('open-projector', displaySettings);
                                                        }
                                                    }}
                                                    onContextMenu={(e, id) => {
                                                        e.preventDefault();
                                                        setContextMenu({ x: e.clientX, y: e.clientY, slideId: id, presentationId: activePresentationId! });
                                                    }}
                                                    onToggleExpansion={(id) => toggleSlideExpansion(id)}
                                                    setContextMenu={setContextMenu}
                                                />
                                            ))}
                                        </SortableContext>
                                    </div>
                                </DndContext>
                            </div>

                            {/* Lane 2: Audio */}
                            {localSlides.length > 0 && (
                                <div className="flex items-center px-4 pt-[10px] pb-4 shrink-0 overflow-visible h-[98px] border-t border-white/5">
                                    <AudioTrack visualTimeline={visualTimeline} />
                                </div>
                            )}
                        </div>
                    </TrackContainer>
                </div>

                {localSlides.length === 0 && (
                    <div className="flex-1 flex items-center justify-center gap-4 text-stone-700 italic border-2 border-dashed border-white/5 rounded-2xl h-full mx-4 min-h-[128px]">
                        <Layers className="w-6 h-6 opacity-20" />
                        <span className="text-xs">{t('timeline_empty_hint', 'Add slides from the toolbar or drag blocks here.')}</span>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                >
                    {/* Bible-specific: Change Verse */}
                    {presentationsMap.get(contextMenu.presentationId)?.slides?.find(s => s.id === contextMenu.slideId)?.blockId === 'bible' && (
                        <ContextMenuItem
                            icon={<BookOpen className="w-4 h-4" />}
                            label={t('change_verse', 'Change Verse')}
                            onClick={() => {
                                openModal(ModalType.BIBLE_SELECTION, { slideId: contextMenu.slideId, presentationId: contextMenu.presentationId });
                                setContextMenu(null);
                            }}
                        />
                    )}

                    {/* Change Template (non-bible, non-master) */}
                    {(() => {
                        const slide = presentationsMap.get(contextMenu.presentationId)?.slides?.find(s => s.id === contextMenu.slideId);
                        if (slide && slide.blockId !== 'bible' && slide.blockId !== 'master-presentation') {
                            return (
                                <ContextMenuItem
                                    icon={<LayoutTemplate className="w-4 h-4" />}
                                    label={t('change_template', 'Change Template')}
                                    onClick={() => {
                                        openModal(ModalType.TEMPLATE_PICKER, {
                                            slideId: contextMenu.slideId,
                                            blockId: slide.blockId,
                                            presentationId: contextMenu.presentationId
                                        });
                                        setContextMenu(null);
                                    }}
                                />
                            );
                        }
                        return null;
                    })()}

                    <div className="h-px bg-white/5 my-1" />

                    <ContextMenuItem
                        icon={<Copy className="w-4 h-4" />}
                        label={t('duplicate', 'Duplicate')}
                        onClick={() => {
                            duplicateSlide(contextMenu.presentationId, contextMenu.slideId);
                            setContextMenu(null);
                        }}
                        shortcut="CMD+D"
                    />

                    <div className="h-px bg-white/5 my-1" />

                    {/* Detach Nested (for linked/master slides) */}
                    {(() => {
                        const slide = presentationsMap.get(contextMenu.presentationId)?.slides?.find(s => s.id === contextMenu.slideId);
                        if (slide && (slide.linkedPresentationId || slide.masterPresentationId)) {
                            return (
                                <ContextMenuItem
                                    icon={<Unplug className="w-4 h-4" />}
                                    label={t('detach_nested', 'Detach Nested')}
                                    onClick={() => {
                                        detachNestedInstance(contextMenu.slideId);
                                        setContextMenu(null);
                                    }}
                                />
                            );
                        }
                        return null;
                    })()}

                    <ContextMenuItem
                        icon={<ArrowLeft className="w-4 h-4" />}
                        label={t('move_back', 'Move Back')}
                        onClick={() => {
                            moveSlide(contextMenu.presentationId, contextMenu.slideId, 'back');
                            setContextMenu(null);
                        }}
                    />
                    <ContextMenuItem
                        icon={<ArrowRight className="w-4 h-4" />}
                        label={t('move_forth', 'Move Forth')}
                        onClick={() => {
                            moveSlide(contextMenu.presentationId, contextMenu.slideId, 'forth');
                            setContextMenu(null);
                        }}
                    />
                    <ContextMenuItem
                        icon={<ChevronsLeft className="w-4 h-4" />}
                        label={t('move_to_start', 'Move to Start')}
                        onClick={() => {
                            moveSlide(contextMenu.presentationId, contextMenu.slideId, 'start');
                            setContextMenu(null);
                        }}
                    />
                    <ContextMenuItem
                        icon={<ChevronsRight className="w-4 h-4" />}
                        label={t('move_to_end', 'Move to End')}
                        onClick={() => {
                            moveSlide(contextMenu.presentationId, contextMenu.slideId, 'end');
                            setContextMenu(null);
                        }}
                    />

                    <div className="h-px bg-white/5 my-1" />

                    <ContextMenuItem
                        icon={<Trash2 className="w-4 h-4" />}
                        label={t('delete', 'Delete')}
                        danger
                        onClick={() => {
                            removeSlide(contextMenu.presentationId, contextMenu.slideId);
                            setContextMenu(null);
                        }}
                    />
                </ContextMenu>
            )}
        </div>
    );
};

export default SlideTimeline;
