import React from 'react';
import {
    Music, Type, Clock, Trash2, Plus, Palette, Zap, Sun,
} from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { CustomColorPicker } from '@/components/CustomColorPicker';
import { ISlide, ITimerSettings } from '@/core/types';
import { ModalType } from '@/core/store/modalStore';
import type { TFunction } from 'i18next';
import { ScrubbableInput } from './ScrubbableInput';
import { PlaylistItemRow } from './PlaylistItemRow';

interface ITimerTabContentProps {
    selectedSlide: ISlide;
    updateTimerSettings: (id: string, updates: Partial<ITimerSettings>) => void;
    openModal: (type: ModalType, props?: Record<string, unknown>) => void;
    t: TFunction;
}

export const TimerTabContent: React.FC<ITimerTabContentProps> = ({
    selectedSlide, updateTimerSettings, openModal, t,
}) => {
    const ts = selectedSlide.timerSettings;

    return (
        <div className="pb-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Duration */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{t('duration', 'Duration')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2 group hover:border-white/10 transition-colors">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600 block group-hover:text-stone-400 transition-colors">{t('minutes', 'Minutes')}</span>
                        <input type="number" min="0" value={Math.floor((ts?.duration || 0) / 60)} onChange={(e) => { const mins = parseInt(e.target.value) || 0; const secs = (ts?.duration || 0) % 60; updateTimerSettings(selectedSlide.id, { duration: mins * 60 + secs }); }} className="w-full bg-transparent text-sm font-mono font-bold text-white focus:outline-none" />
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2 group hover:border-white/10 transition-colors">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600 block group-hover:text-stone-400 transition-colors">{t('seconds', 'Seconds')}</span>
                        <input type="number" min="0" max="59" value={(ts?.duration || 0) % 60} onChange={(e) => { const mins = Math.floor((ts?.duration || 0) / 60); const secs = parseInt(e.target.value) || 0; updateTimerSettings(selectedSlide.id, { duration: mins * 60 + secs }); }} className="w-full bg-transparent text-sm font-mono font-bold text-white focus:outline-none" />
                    </div>
                </div>
            </div>

            {/* Style Picker */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{t('style', 'Visual Style')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {['digital', 'circular', 'minimal', 'neon', 'bar', 'flip', 'modern', 'dots', 'glass', 'bold'].map((style) => (
                        <button key={style} onClick={() => updateTimerSettings(selectedSlide.id, { style: style as ITimerSettings['style'] })} className={cn("px-3 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer", ts?.style === style ? "bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-lg shadow-orange-500/10" : "bg-white/3 border-white/5 text-stone-500 hover:border-white/10 hover:text-stone-300")}>
                            {style}
                        </button>
                    ))}
                </div>
            </div>

            {/* Prefix Text */}
            <div className="space-y-4">
                <div className="flex items-center gap-2"><Type className="w-3.5 h-3.5 text-stone-400" /><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{t('prefix', 'Prefix Text')}</span></div>
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <input type="text" placeholder={t('prefix_placeholder', 'e.g. Starting in...')} value={ts?.prefix || ''} onChange={(e) => updateTimerSettings(selectedSlide.id, { prefix: e.target.value })} className="w-full bg-transparent text-sm font-bold text-white focus:outline-none placeholder:text-stone-700" />
                </div>
            </div>

            {/* Theme Color */}
            <div className="space-y-4">
                <div className="flex items-center gap-2"><Sun className="w-3.5 h-3.5 text-stone-400" /><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{t('accent_color', 'Accent Color')}</span></div>
                <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl border border-white/10 shrink-0 shadow-inner group relative overflow-hidden cursor-pointer" style={{ backgroundColor: ts?.themeColor || '#f97316' }}>
                        <CustomColorPicker color={ts?.themeColor || '#f97316'} onChange={(color) => updateTimerSettings(selectedSlide.id, { themeColor: color })} className="absolute inset-0 opacity-0" />
                    </div>
                    <span className="text-xs font-mono text-stone-400">{ts?.themeColor || '#f97316'}</span>
                </div>
            </div>

            {/* Playlist */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Music className="w-3.5 h-3.5 text-stone-400" /><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{t('playlist', 'Playlist')}</span></div>
                    <button onClick={() => openModal(ModalType.AUDIO_PICKER, { type: 'audio', multi: true, onSelect: (ids: string[]) => { const current = ts?.playlist || []; updateTimerSettings(selectedSlide.id, { playlist: Array.from(new Set([...current, ...ids])) }); } })} className="p-1.5 hover:bg-accent/10 rounded-lg text-accent transition-all active:scale-95 group cursor-pointer"><Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /></button>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-inner">
                    {(ts?.playlist || []).length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {(ts?.playlist || []).map((id, index) => (
                                <PlaylistItemRow key={`${id}-${index}`} id={id} index={index} onRemove={(idx) => { const p = [...(ts?.playlist || [])]; p.splice(idx, 1); updateTimerSettings(selectedSlide.id, { playlist: p }); }} t={t as never} />
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center"><Music className="w-8 h-8 text-stone-800 mx-auto mb-3 opacity-50" strokeWidth={1.5} /><p className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">{t('playlist_empty', 'Playlist Empty')}</p></div>
                    )}
                </div>
            </div>

            {/* Triggers & Actions */}
            <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-stone-400" /><span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{t('triggers_actions', 'Triggers & Actions')}</span></div>
                    <button onClick={() => { const current = ts?.triggers || []; updateTimerSettings(selectedSlide.id, { triggers: [...current, { id: crypto.randomUUID(), type: 'on_end' as never, value: 0, actions: [{ id: crypto.randomUUID(), type: 'next_slide' as never }] }] }); }} className="p-1.5 hover:bg-accent/10 rounded-lg text-accent transition-all active:scale-95 group cursor-pointer"><Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /></button>
                </div>
                {(ts?.triggers || []).map((trigger, idx) => (
                    <div key={idx} className="bg-black/40 rounded-3xl border border-white/5 overflow-hidden shadow-inner p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20"><Zap className="w-3 h-3 text-accent" /></div><span className="text-[11px] font-black uppercase tracking-widest text-white">#{idx + 1}</span></div>
                            <button onClick={() => { const p = [...(ts?.triggers || [])]; p.splice(idx, 1); updateTimerSettings(selectedSlide.id, { triggers: p }); }} className="p-1.5 hover:bg-red-500/20 text-stone-600 hover:text-red-400 rounded-lg transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-stone-600 px-1">{t('trigger', 'When')}</label>
                                <select value={trigger.type || 'on_end'} onChange={(e) => { const p = [...(ts?.triggers || [])]; p[idx] = { ...p[idx], type: e.target.value as never }; updateTimerSettings(selectedSlide.id, { triggers: p }); }} className="w-full bg-stone-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent/40">
                                    <option value="on_start">{t('on_start', 'On Start')}</option><option value="on_end">{t('on_end', 'On End')}</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-stone-600 px-1">{t('action', 'Do')}</label>
                                <select value={trigger.actions?.[0]?.type || 'next_slide'} onChange={(e) => { const p = [...(ts?.triggers || [])]; p[idx] = { ...p[idx], actions: [{ id: crypto.randomUUID(), type: e.target.value as never }] }; updateTimerSettings(selectedSlide.id, { triggers: p }); }} className="w-full bg-stone-900/50 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent/40">
                                    <option value="next_slide">{t('next_slide', 'Next Slide')}</option><option value="change_bg">{t('change_bg', 'Change Background')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
