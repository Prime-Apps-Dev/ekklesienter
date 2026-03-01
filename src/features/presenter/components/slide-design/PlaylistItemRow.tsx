import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { Music, Trash2 } from 'lucide-react';

interface IPlaylistItemRowProps {
    id: string;
    index: number;
    onRemove: (index: number) => void;
    t: (key: string, fallback?: string) => string;
}

export const PlaylistItemRow: React.FC<IPlaylistItemRowProps> = ({ id, index, onRemove, t }) => {
    const mediaItem = useLiveQuery(() => db.mediaPool.get(id), [id]);

    return (
        <div className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
                <Music className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{mediaItem?.name || t('unknown_file', 'Unknown File')}</p>
                <p className="text-[9px] text-stone-600 font-bold uppercase tracking-wider">{t('audio_item', 'Audio Item')}</p>
            </div>
            <button
                onClick={() => onRemove(index)}
                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-stone-500 hover:text-red-400 rounded-lg transition-all cursor-pointer"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};
