import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { Plus, Image as ImageIcon, Film, Music, Trash2, FolderOpen } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { IMediaItem, MediaType } from '@/core/types';

export const MediaPoolPanel: React.FC = () => {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<MediaType | 'all'>('all');

    const mediaItems = useLiveQuery(
        () => {
            if (filter === 'all') {
                return db.mediaPool.orderBy('createdAt').reverse().toArray();
            } else {
                return db.mediaPool.where('type').equals(filter).reverse().sortBy('createdAt');
            }
        },
        [filter]
    ) || [];

    const handleImportMedia = async () => {
        if (!window.electron?.ipcRenderer?.selectFile) {
            // Fallback for web/dev if bridge is missing
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,video/*,audio/*';
            input.onchange = async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (!files) return;
                const newItems: IMediaItem[] = [];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    let type: MediaType = 'image';
                    if (file.type.startsWith('video/')) type = 'video';
                    if (file.type.startsWith('audio/')) type = 'audio';
                    const path = (file as any).path || URL.createObjectURL(file);
                    newItems.push({
                        id: crypto.randomUUID(),
                        name: file.name,
                        path: path,
                        type,
                        createdAt: Date.now()
                    });
                }
                if (newItems.length > 0) await db.mediaPool.bulkAdd(newItems);
            };
            input.click();
            return;
        }

        try {
            const files = await window.electron.ipcRenderer.selectFile({
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Media Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp4', 'webm', 'ogg', 'mp3', 'wav', 'm4a', 'aac', 'flac'] }
                ]
            });

            if (!files) return;
            const filePaths = Array.isArray(files) ? files : [files];
            const newItems: IMediaItem[] = [];

            for (const filePath of filePaths) {
                const name = filePath.split(/[/\\]/).pop() || 'Untitled';
                const ext = filePath.split('.').pop()?.toLowerCase();

                let type: MediaType = 'image';
                if (['mp4', 'webm', 'mov'].includes(ext || '')) type = 'video';
                if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '')) type = 'audio';

                newItems.push({
                    id: crypto.randomUUID(),
                    name,
                    path: filePath,
                    type,
                    createdAt: Date.now()
                });
            }

            if (newItems.length > 0) {
                await db.mediaPool.bulkAdd(newItems);
            }
        } catch (error) {
            console.error('Failed to import media:', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await db.mediaPool.delete(id);
    };

    const handleDragStart = (e: React.DragEvent, item: IMediaItem) => {
        // We set the drag data payload so drop targets can read it
        e.dataTransfer.setData('application/json', JSON.stringify({
            source: 'media-pool',
            media: item
        }));

        // Native file dropping compatibility attempt if possible
        // Actually, you can't easily synthesize a File object in a browser drag event from a path unless you download it.
        // We rely on the app elements (SlideTimeline, AudioTrack) intercepting the JSON payload.
        e.dataTransfer.effectAllowed = 'copy';
    };

    const TypeIcon = ({ type, className }: { type: MediaType, className?: string }) => {
        switch (type) {
            case 'image': return <ImageIcon className={className} />;
            case 'video': return <Film className={className} />;
            case 'audio': return <Music className={className} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-stone-900/50 rounded-2xl border border-white/5 overflow-hidden">
            {/* Header & Controls */}
            <div className="p-3 border-b border-white/5 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                        <FolderOpen className="w-3 h-3" />
                        {t('media_pool', 'Media Pool')}
                    </span>
                    <button
                        onClick={handleImportMedia}
                        className="w-6 h-6 rounded-lg bg-accent/20 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/30 hover:scale-105 active:scale-95 transition-all shadow-lg"
                        title={t('import_media', 'Import Media')}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex bg-stone-950/40 p-1 rounded-xl">
                    {(['all', 'image', 'video', 'audio'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                filter === f
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-stone-500 hover:text-stone-300 hover:bg-white/5"
                            )}
                        >
                            {t(`filter_${f}`, f)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {mediaItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-3">
                            <FolderOpen className="w-5 h-5 text-stone-600" />
                        </div>
                        <span className="text-xs font-bold text-stone-400 max-w-[150px]">
                            {t('media_pool_empty', 'Drag files here or click + to import media')}
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {mediaItems.map(item => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                className="group relative aspect-square rounded-xl bg-stone-950/60 border border-white/5 overflow-hidden hover:border-accent/40 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing flex flex-col"
                            >
                                {/* Preview Thumbnail Area */}
                                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                                    {item.type === 'image' && (
                                        <img src={item.path} alt={item.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    {item.type === 'video' && (
                                        <video src={item.path} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                                    )}
                                    {item.type === 'audio' && (
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                            <Music className="w-5 h-5 text-purple-400" />
                                        </div>
                                    )}

                                    {/* Type Badge */}
                                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-stone-300 flex items-center gap-1 shadow-sm">
                                        <TypeIcon type={item.type} className="w-2.5 h-2.5" />
                                    </div>

                                    {/* Delete Button (Hover) */}
                                    <button
                                        onClick={(e) => handleDelete(e, item.id)}
                                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all shadow-sm"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Label Area */}
                                <div className="h-6 px-2 bg-stone-900/80 backdrop-blur-md border-t border-white/5 flex items-center justify-center z-10 shrink-0">
                                    <span className="text-[9px] font-bold text-stone-300 truncate w-full text-center group-hover:text-accent transition-colors">
                                        {item.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
