import React, { useState } from 'react';
import { usePresenterStore } from '@/core/store/presenterStore';
import { useTranslation } from 'react-i18next';

const UNSPLASH_ACCESS_KEY = 'i-LgE2hgIfWqxDD17rja_1zoGRncuabMf6a4s0irhX0';
const PEXELS_API_KEY = 'YLQ6AjT3THV9CnA9JX0FckiITayzUi0V8HTbQ5S0rfso2tmwdTVxswYy';
import { Palette, Image as ImageIcon, Video, Layers, Upload, Search, Play, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { CustomSlider } from '@/components/CustomSlider';
import { CustomColorPicker } from '@/components/CustomColorPicker';
import { CompactColorPicker } from '@/components/CompactColorPicker';
import { GradientPicker } from '@/components/GradientPicker';


const PRESET_GRADIENTS = [
    { from: '#020617', to: '#1e1b4b', angle: 135 }, // Night Deep
    { from: '#1e3a8a', to: '#172554', angle: 45 },  // Royal Blue
    { from: '#4c1d95', to: '#2e1065', angle: 180 }, // Royal Purple
    { from: '#064e3b', to: '#022c22', angle: 90 },  // Emerald Dark
    { from: '#1e293b', to: '#0f172a', angle: 135 }, // Slate Shadow
    { from: '#451a03', to: '#78350f', angle: 45 },  // Amber Warmth
];

const PRESET_SOLID_COLORS = [
    '#000000', '#1c1917', '#1e3a8a', '#1e1b4b', '#312e81', '#4c1d95',
    '#064e3b', '#422006', '#451a03', '#7c2d12', '#991b1b', '#111827'
];

export const BackgroundPicker: React.FC = () => {
    const { settings: globalSettings, draftSettings, updateBackground, updateDraft } = usePresenterStore();
    const { t } = useTranslation();

    // Always prefer draft settings if available (Design Mode)
    const settings = draftSettings || globalSettings;
    const { background } = settings;

    const [activeSubTab, setActiveSubTab] = useState<'solid' | 'gradient' | 'image' | 'video'>('solid');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const handleColorSelect = (color: string) => {
        if (draftSettings) {
            updateDraft({ background: { ...background, type: 'color', color } });
        } else {
            updateBackground({ type: 'color', color });
        }
    };

    const handleGradientSelect = (grad: { from: string; to: string; angle: number }) => {
        if (draftSettings) {
            updateDraft({ background: { ...background, type: 'gradient', gradient: grad } });
        } else {
            updateBackground({ type: 'gradient', gradient: grad });
        }
    };

    const searchUnsplash = async (query: string) => {
        if (!query) return;
        setIsLoading(true);
        try {
            const resp = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=12`);
            const data = await resp.json();
            setSearchResults(data.results.map((r: any) => ({
                id: r.id,
                url: r.urls.regular,
                thumb: r.urls.small,
                author: r.user.name,
                source: 'unsplash'
            })));
        } catch (error) {
            console.error('Unsplash search failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    const searchPexels = async (query: string, type: 'image' | 'video') => {
        if (!query) return;
        setIsLoading(true);
        try {
            const endpoint = type === 'image' ? 'search' : 'videos/search';
            const resp = await fetch(`https://api.pexels.com/v1/${endpoint}?query=${encodeURIComponent(query)}&per_page=12`, {
                headers: { Authorization: PEXELS_API_KEY }
            });
            const data = await resp.json();
            if (type === 'image') {
                setSearchResults(data.photos.map((p: any) => ({
                    id: p.id.toString(),
                    url: p.src.large,
                    thumb: p.src.small,
                    source: 'pexels'
                })));
            } else {
                setSearchResults(data.videos.map((v: any) => ({
                    id: v.id.toString(),
                    url: v.video_files.find((f: any) => f.quality === 'hd')?.link || v.video_files[0].link,
                    thumb: v.image,
                    source: 'pexels'
                })));
            }
        } catch (error) {
            console.error('Pexels search failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageSelect = (img: { url: string; thumb?: string; author?: string; source: string }) => {
        const update = { type: 'image' as const, image: { url: img.url, thumb: img.thumb, author: img.author, source: img.source as any } };
        if (draftSettings) {
            updateDraft({ background: { ...background, ...update } });
        } else {
            updateBackground(update);
        }
    };

    const handleVideoSelect = (vid: { url: string; thumb?: string; author?: string; source: string; id?: string }) => {
        const update = { type: 'video' as const, video: { url: vid.url, thumb: vid.thumb, author: vid.author, source: vid.source as any, id: vid.id, isMuted: true, isLooping: true } };
        if (draftSettings) {
            updateDraft({ background: { ...background, ...update } });
        } else {
            updateBackground(update);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (type === 'image') {
            if (draftSettings) {
                updateDraft({ background: { ...background, type: 'image', image: { url, source: 'local' } } });
            } else {
                updateBackground({ type: 'image', image: { url, source: 'local' } });
            }
        } else {
            if (draftSettings) {
                updateDraft({ background: { ...background, type: 'video', video: { url, source: 'local', isMuted: true, isLooping: true } } });
            } else {
                updateBackground({ type: 'video', video: { url, source: 'local', isMuted: true, isLooping: true } });
            }
        }
    };

    const handleYoutubeSelect = () => {
        if (!youtubeUrl) return;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = youtubeUrl.match(regExp);
        const id = (match && match[2].length === 11) ? match[2] : null;
        if (id) {
            const update = {
                type: 'video' as const,
                video: { url: `https://www.youtube.com/watch?v=${id}`, id, source: 'youtube' as const, isMuted: true, isLooping: true }
            };
            if (draftSettings) {
                updateDraft({ background: { ...background, ...update } });
            } else {
                updateBackground(update);
            }
            setYoutubeUrl('');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            {/* Type Selector - Bento Header */}
            <div className="bg-white/3 backdrop-blur-xl rounded-2xl border border-white/5 p-1.5 flex gap-1.5 shadow-inner">
                {[
                    { id: 'solid', icon: Palette, label: t('bg_solid') },
                    { id: 'gradient', icon: Layers, label: t('bg_gradient') },
                    { id: 'image', icon: ImageIcon, label: t('bg_image') },
                    { id: 'video', icon: Video, label: t('bg_video') },
                ].map((type) => (
                    <button
                        key={type.id}
                        onClick={() => {
                            setActiveSubTab(type.id as any);
                            setSearchResults([]);
                            setSearchQuery('');
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300",
                            activeSubTab === type.id
                                ? "bg-accent/15 text-accent border border-accent/20 shadow-sm shadow-accent/10"
                                : "text-stone-500 hover:text-stone-300 hover:bg-white/5 border border-transparent"
                        )}
                    >
                        <type.icon className={cn("w-3.5 h-3.5", activeSubTab === type.id ? "text-accent" : "text-stone-600")} />
                        <span>{type.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Bento Container */}
            <div className="space-y-6">
                {/* Solid Color Selection */}
                {activeSubTab === 'solid' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                        {/* Preset Card */}
                        <div className="bg-white/2 border border-white/5 rounded-3xl p-6 space-y-4">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] px-1">{t('modern_palettes')}</label>
                            <div className="grid grid-cols-6 gap-3">
                                {PRESET_SOLID_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => handleColorSelect(c)}
                                        className={cn(
                                            "aspect-square rounded-xl border-2 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg",
                                            background.color === c ? "border-accent ring-4 ring-accent/10" : "border-white/5 hover:border-white/20"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Custom Picker Card */}
                        <div className="bg-white/2 border border-white/5 rounded-3xl p-6">
                            <CompactColorPicker
                                label={t('precision_picker')}
                                color={background.color || '#000000'}
                                onChange={(color) => handleColorSelect(color)}
                            />
                        </div>
                    </div>
                )}

                {/* Gradient Selection */}
                {activeSubTab === 'gradient' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                        {/* Preset Card */}
                        <div className="bg-white/2 border border-white/5 rounded-3xl p-6 space-y-4">
                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] px-1">{t('curated_gradients')}</label>
                            <div className="grid grid-cols-2 gap-4">
                                {PRESET_GRADIENTS.map((grad, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleGradientSelect(grad)}
                                        className={cn(
                                            "h-24 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-xl group relative overflow-hidden",
                                            background.type === 'gradient' &&
                                                background.gradient?.from === grad.from &&
                                                background.gradient?.to === grad.to
                                                ? "border-accent ring-4 ring-accent/10"
                                                : "border-white/5 hover:border-white/10"
                                        )}
                                        style={{
                                            background: `linear-gradient(${grad.angle}deg, ${grad.from}, ${grad.to})`
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Gradient Tools */}
                        <div className="bg-white/2 border border-white/5 rounded-3xl p-6">
                            <GradientPicker
                                from={background.gradient?.from || '#1c1917'}
                                to={background.gradient?.to || '#000000'}
                                angle={background.gradient?.angle ?? 135}
                                onChange={(from, to, angle) => handleGradientSelect({ from, to, angle })}
                            />
                        </div>
                    </div>
                )}

                {/* Media Search & Selection */}
                {(activeSubTab === 'image' || activeSubTab === 'video') && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                        {/* Search Card */}
                        <div className="bg-white/2 border border-white/5 rounded-3xl p-6 space-y-5">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">
                                    {activeSubTab === 'image' ? t('visual_library') : t('motion_library')}
                                </label>
                                <div className="flex gap-4">
                                    <button onClick={() => searchUnsplash(searchQuery)} className={cn("text-[9px] font-bold uppercase tracking-widest transition-colors", activeSubTab === 'image' ? "text-accent" : "text-stone-600 hover:text-stone-400")}>Unsplash</button>
                                    <button onClick={() => searchPexels(searchQuery, activeSubTab as any)} className="text-[9px] font-bold text-stone-600 hover:text-stone-400 uppercase tracking-widest transition-colors">Pexels</button>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-stone-600 group-focus-within:text-accent transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (activeSubTab === 'image' ? searchUnsplash(searchQuery) : searchPexels(searchQuery, 'video'))}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-14 py-4 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all shadow-inner"
                                    placeholder={activeSubTab === 'image' ? t('search_imagery_placeholder') : t('search_motion_placeholder')}
                                />
                                <button
                                    onClick={() => activeSubTab === 'image' ? searchUnsplash(searchQuery) : searchPexels(searchQuery, 'video')}
                                    disabled={isLoading}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl border border-accent/20 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg"
                                >
                                    {isLoading ? <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* YouTube Card (Inside Media Block) */}
                            {activeSubTab === 'video' && (
                                <div className="pt-4 border-t border-white/5 space-y-3">
                                    <div className="flex bg-white/3 rounded-2xl border border-white/5 p-1.5 gap-2 shadow-inner group focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent/40 transition-all">
                                        <input
                                            type="text"
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            className="flex-1 bg-transparent border-none px-3 py-1.5 text-xs text-stone-300 focus:outline-none placeholder:text-stone-700"
                                            placeholder={t('paste_youtube_link')}
                                        />
                                        <button
                                            onClick={handleYoutubeSelect}
                                            className="px-4 py-1.5 bg-accent/20 text-accent hover:bg-accent/30 rounded-xl text-[10px] font-black uppercase tracking-widest border border-accent/20 transition-all shadow-md"
                                        >
                                            {t('sync') || 'Sync'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Results Grid */}
                            {searchResults.length > 0 && (
                                <div className="grid grid-cols-3 gap-3 pt-2 animate-in fade-in zoom-in-95 duration-500">
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.id}
                                            onClick={() => {
                                                if (activeSubTab === 'image') {
                                                    handleImageSelect({ url: result.url, source: result.source, thumb: result.thumb });
                                                } else {
                                                    handleVideoSelect({ url: result.url, source: result.source, id: result.id, thumb: result.thumb });
                                                }
                                            }}
                                            className={cn(
                                                "aspect-16/10 rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.05] group relative shadow-lg bg-stone-900/50",
                                                (background.image?.url === result.url || background.video?.url === result.url)
                                                    ? "border-accent ring-4 ring-accent/10"
                                                    : "border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <img src={result.thumb} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                                            <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Upload Bento Card */}
                            <div className="pt-2">
                                <label className="flex items-center justify-center gap-4 p-5 border-2 border-dashed border-white/5 rounded-2xl bg-black/20 hover:bg-black/40 hover:border-accent/30 cursor-pointer transition-all group shadow-inner">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                                        <Upload className="w-5 h-5 text-stone-500 group-hover:text-accent" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-bold text-stone-300 group-hover:text-white uppercase tracking-wider">{t('local_assets')}</p>
                                        <p className="text-[9px] text-stone-600 group-hover:text-stone-400 font-medium">{t('local_assets_desc')}</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept={activeSubTab === 'image' ? 'image/*' : 'video/*'}
                                        onChange={(e) => handleFileSelect(e, activeSubTab as any)}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Effects Bento Block */}
                        <div className="bg-white/2 border border-white/5 rounded-3xl p-8 shadow-xl">
                            <CustomSlider
                                label={t('background_softness')}
                                min={0}
                                max={20}
                                step={1}
                                value={background.blur || 0}
                                onChange={(val) => {
                                    if (draftSettings) {
                                        updateDraft({ background: { ...background, blur: val } });
                                    } else {
                                        updateBackground({ blur: val });
                                    }
                                }}
                                unit="px"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
