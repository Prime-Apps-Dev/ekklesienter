import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';
import { themeAccentAtom } from '@/core/store/uiAtoms';
import { useHistoryStore } from '@/core/store/historyStore';
import { Globe, Palette, Clock } from 'lucide-react';
import { cn } from '@/core/utils/cn';

const GeneralSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [themeAccent, setThemeAccent] = useAtom(themeAccentAtom);

    const languages = [
        { code: 'en', label: 'English', native: 'English' },
        { code: 'ru', label: 'Русский', native: 'Russian' },
    ];

    const themes = [
        { id: 'amber', label: t('theme_amber'), color: 'bg-amber-500', glow: 'shadow-amber-500/20' },
        { id: 'rose', label: t('theme_rose'), color: 'bg-rose-500', glow: 'shadow-rose-500/20' },
        { id: 'blue', label: t('theme_blue'), color: 'bg-blue-500', glow: 'shadow-blue-500/20' },
        { id: 'stone', label: t('theme_stone'), color: 'bg-stone-500', glow: 'shadow-stone-500/20' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Language Selection Card */}
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-accent/10 transition-colors" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-stone-800 rounded-xl">
                        <Globe className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{t('language')}</h3>
                        <p className="text-xs text-stone-500 font-medium lowercase">{t('language_selection_desc')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                    {languages.map((lang) => {
                        const isSelected = i18n.language.startsWith(lang.code);
                        return (
                            <button
                                key={lang.code}
                                onClick={() => i18n.changeLanguage(lang.code)}
                                className={cn(
                                    "flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group/btn border",
                                    isSelected
                                        ? "bg-white/10 border-white/20 text-white shadow-xl scale-[1.02]"
                                        : "bg-stone-950/50 border-white/5 text-stone-500 hover:text-stone-300 hover:bg-stone-800/40"
                                )}
                            >
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-sm font-bold">{lang.label}</span>
                                    <span className="text-[10px] mt-1 opacity-50 font-mono tracking-widest uppercase">{lang.native}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Theme / Appearance Card */}
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 blur-3xl rounded-full -translate-x-20 translate-y-20 group-hover:bg-accent/10 transition-colors" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-stone-800 rounded-xl">
                        <Palette className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{t('theme')}</h3>
                        <p className="text-xs text-stone-500 font-medium">{t('theme_description')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                    {themes.map((theme) => {
                        const isSelected = themeAccent === theme.id;
                        return (
                            <button
                                key={theme.id}
                                onClick={() => setThemeAccent(theme.id)}
                                className={cn(
                                    "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 border",
                                    isSelected
                                        ? "bg-white/10 border-white/20 shadow-xl scale-[1.05]"
                                        : "bg-stone-950/50 border-white/5 hover:bg-stone-800/40"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-500",
                                    theme.color,
                                    isSelected ? "scale-110 shadow-[0_0_20px_currentColor]" : "opacity-60",
                                    theme.glow
                                )}>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest",
                                    isSelected ? "text-white" : "text-stone-600"
                                )}>
                                    {theme.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* History Settings Card */}
            <div className="col-span-1 md:col-span-2 bg-stone-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-stone-800 rounded-xl">
                        <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{t('history_settings')}</h3>
                        <p className="text-xs text-stone-500 font-medium">{t('history_limit_desc')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                    {[10, 30, 50].map((num) => {
                        const limit = useHistoryStore(state => state.limit);
                        const setLimit = useHistoryStore(state => state.setLimit);
                        const isSelected = limit === num;
                        return (
                            <button
                                key={num}
                                onClick={() => setLimit(num)}
                                className={cn(
                                    "px-6 py-3 rounded-2xl font-bold transition-all border",
                                    isSelected
                                        ? "bg-white/10 border-white/20 text-white shadow-xl scale-[1.05]"
                                        : "bg-stone-950/50 border-white/5 text-stone-500 hover:text-stone-300 hover:bg-stone-800/40"
                                )}
                            >
                                {num}
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default GeneralSettings;
