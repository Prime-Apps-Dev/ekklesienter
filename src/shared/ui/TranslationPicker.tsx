import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { Search, X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';

interface TranslationPickerProps {
    currentTranslationId: string | null;
    onSelect: (translationId: string) => void;
    onClose: () => void;
    title?: string;
    triggerRect?: DOMRect | null;
}

/**
 * Helper to highlight search matches
 */
const SearchHighlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-accent/30 text-accent px-0.5 rounded-sm ring-1 ring-accent/20">{part}</mark>
                    : <React.Fragment key={i}>{part}</React.Fragment>
            )}
        </>
    );
};

const TranslationPicker: React.FC<TranslationPickerProps> = ({
    currentTranslationId,
    onSelect,
    onClose,
    title,
    triggerRect
}) => {
    const { t } = useTranslation();
    const [view, setView] = useState<'languages' | 'translations'>('languages');
    const [selectedLang, setSelectedLang] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const translations = useLiveQuery(() => db.translations.toArray()) || [];

    const pickerData = useMemo(() => {
        const filtered = translations.filter(tr =>
            tr.name.toLowerCase().includes(search.toLowerCase()) ||
            tr.id.toLowerCase().includes(search.toLowerCase())
        );

        const groups: Record<string, typeof translations> = {};
        filtered.forEach(tr => {
            const l = tr.language || 'Unknown';
            if (!groups[l]) groups[l] = [];
            groups[l].push(tr);
        });

        const uniqueLangs = Object.keys(groups).sort();
        return { groups, uniqueLangs };
    }, [translations, search]);

    // Positioning logic
    const position = useMemo(() => {
        if (!triggerRect) return { bottom: '1rem', left: '1rem', width: '320px' };

        const spacing = 4;
        const windowHeight = window.innerHeight;
        const menuHeight = 500;

        let bottom = windowHeight - triggerRect.top + spacing;
        let left = triggerRect.left;
        let width = triggerRect.width;

        // If it overlaps the top of the window, flip it to open downwards
        if (triggerRect.top < menuHeight + spacing) {
            return {
                top: triggerRect.bottom + spacing,
                left,
                width
            };
        }

        return { bottom, left, width };
    }, [triggerRect]);

    return createPortal(
        <div className="fixed inset-0 z-9999 pointer-events-none">
            {/* Backdrop - Transparent for dropdown feel */}
            <div
                className="absolute inset-0 bg-transparent pointer-events-auto"
                onClick={onClose}
            />

            {/* Dropdown Content */}
            <div
                className="absolute bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
                style={position}
            >
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-stone-950/40">
                    <div className="flex items-center gap-2">
                        {view === 'translations' && (
                            <button
                                onClick={() => setView('languages')}
                                className="p-1 hover:bg-white/5 rounded-lg text-stone-500 hover:text-white transition-all"
                            >
                                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                            </button>
                        )}
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                            {view === 'languages' ? t('languages') : (selectedLang || title || t('translations'))}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/5 rounded-lg text-stone-600 hover:text-white transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="p-2 border-b border-white/5 bg-stone-950/20">
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-600 group-focus-within:text-accent" />
                        <input
                            type="text"
                            autoFocus
                            placeholder={t('search_bibles_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-stone-200 focus:outline-none focus:border-accent/40 transition-all placeholder:text-stone-700"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar min-h-0">
                    {search ? (
                        pickerData.uniqueLangs.flatMap(langKey =>
                            pickerData.groups[langKey].map(tr => (
                                <button
                                    key={tr.id}
                                    onClick={() => {
                                        onSelect(tr.id);
                                        onClose();
                                    }}
                                    className={cn(
                                        "w-full flex flex-col gap-0.5 p-2 rounded-lg transition-all group text-left border",
                                        currentTranslationId === tr.id
                                            ? "bg-accent/10 border-accent/20"
                                            : "hover:bg-white/5 border-transparent hover:border-white/5"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-[11px] font-bold", currentTranslationId === tr.id ? "text-accent" : "text-stone-300")}>
                                            <SearchHighlight text={tr.name} query={search} />
                                        </span>
                                        <span className="text-[8px] font-bold text-stone-600 bg-white/5 px-1 py-0.5 rounded uppercase tracking-tighter">{tr.language}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-stone-600 uppercase tracking-widest leading-none">
                                        <SearchHighlight text={tr.id} query={search} />
                                    </span>
                                </button>
                            ))
                        )
                    ) : view === 'languages' ? (
                        pickerData.uniqueLangs.map(langKey => (
                            <button
                                key={langKey}
                                onClick={() => {
                                    setSelectedLang(langKey);
                                    setView('translations');
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group text-left"
                            >
                                <span className="text-[11px] font-bold text-stone-300 group-hover:text-white uppercase tracking-tight">{langKey}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-stone-600 font-bold">{pickerData.groups[langKey].length}</span>
                                    <ChevronRight className="w-2.5 h-2.5 text-stone-700 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </button>
                        ))
                    ) : (
                        (selectedLang ? pickerData.groups[selectedLang] || [] : translations).map(tr => (
                            <button
                                key={tr.id}
                                onClick={() => {
                                    onSelect(tr.id);
                                    onClose();
                                }}
                                className={cn(
                                    "w-full flex flex-col gap-0.5 p-2 rounded-lg transition-all group text-left border",
                                    currentTranslationId === tr.id
                                        ? "bg-accent/10 border-accent/20"
                                        : "hover:bg-white/5 border-transparent hover:border-white/5"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={cn("text-[11px] font-bold", currentTranslationId === tr.id ? "text-accent" : "text-stone-300")}>
                                        {tr.name}
                                    </span>
                                    {currentTranslationId === tr.id && <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />}
                                </div>
                                <span className="text-[9px] font-bold text-stone-600 uppercase tracking-widest leading-none">{tr.id}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TranslationPicker;
