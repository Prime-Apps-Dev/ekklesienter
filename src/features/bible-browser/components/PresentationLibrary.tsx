import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { usePresentationStore } from '@/core/store/presentationStore';
import { useTranslation } from 'react-i18next';
import { FilePlus, FileText, ChevronRight, Clock, Trash2, LayoutTemplate, Download, Upload } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { format } from 'date-fns';
import { EktService } from '@/core/services/ektService';

const PresentationLibrary: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { activeWorkflowId, activePresentationId, setActivePresentation, createPresentation } = usePresentationStore();
    const lang = i18n.language?.substring(0, 2) || 'en';
    const isRu = lang === 'ru';

    const presentations = useLiveQuery(
        () => activeWorkflowId ? db.presentationFiles.where('workflowId').equals(activeWorkflowId).reverse().sortBy('updatedAt') : [],
        [activeWorkflowId]
    ) || [];

    const handleCreateNew = async () => {
        const name = `${t('new_presentation', 'New Presentation')} - ${format(new Date(), 'HH:mm')}`;
        await createPresentation(name, activeWorkflowId || undefined);
    };

    const handleExport = async (e: React.MouseEvent, pres: any) => {
        e.stopPropagation();
        try {
            const blob = await EktService.pack(pres.id);
            EktService.download(blob, pres.name);
        } catch (error) {
            console.error('Failed to export .ekt:', error);
            alert('Failed to export presentation');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const presentation = await EktService.unpack(file);
            // Ensure workflowId is set to current or null if importing from outside
            const newPres = {
                ...presentation,
                id: crypto.randomUUID(), // Generate new ID to avoid collisions
                workflowId: activeWorkflowId || null,
                updatedAt: new Date(),
                createdAt: new Date()
            };
            await db.presentationFiles.add(newPres as any);
            setActivePresentation(newPres.id);
        } catch (error) {
            console.error('Failed to import .ekt:', error);
            alert('Failed to import .ekt file. Please ensure it is a valid Ekklesienter bundle.');
        } finally {
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm(t('confirm_delete_presentation', 'Are you sure you want to delete this presentation?'))) {
            await db.presentationFiles.delete(id);
            if (activePresentationId === id) {
                setActivePresentation(null);
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-stone-900/30 border-r border-white/5">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    {t('presentations', 'Presentations')}
                </h3>
                <div className="flex items-center gap-1.5">
                    <input
                        type="file"
                        id="import-ekt"
                        className="hidden"
                        accept=".ekt,.zip"
                        onChange={handleImport}
                    />
                    <label
                        htmlFor="import-ekt"
                        className="p-1.5 text-stone-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer group"
                        title={t('import_ekt', 'Import .ekt')}
                    >
                        <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </label>
                    <button
                        onClick={handleCreateNew}
                        className="p-1.5 bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors group"
                        title={t('new_presentation', 'New Presentation')}
                    >
                        <FilePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4">
                {/* Active Workflow filter info */}
                {activeWorkflowId ? (
                    <div className="space-y-2">
                        {presentations.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {presentations.map((pres) => (
                                    <button
                                        key={pres.id}
                                        onClick={() => setActivePresentation(pres.id)}
                                        className={cn(
                                            "w-full group p-3 rounded-2xl border transition-all text-left flex items-start gap-3 relative",
                                            activePresentationId === pres.id
                                                ? "bg-accent/10 border-accent/40 shadow-lg shadow-accent/5"
                                                : "bg-white/2 border-transparent hover:border-white/10 hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                                            activePresentationId === pres.id
                                                ? "bg-accent/20 border-accent/20"
                                                : "bg-stone-800 border-white/5 group-hover:bg-accent/10 group-hover:border-accent/10"
                                        )}>
                                            <FileText className={cn("w-5 h-5", activePresentationId === pres.id ? "text-accent" : "text-stone-500")} />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className={cn(
                                                "text-xs font-bold truncate transition-colors",
                                                activePresentationId === pres.id ? "text-white" : "text-stone-300 group-hover:text-white"
                                            )}>
                                                {pres.name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="w-3 h-3 text-stone-600" />
                                                <span className="text-[10px] text-stone-600 font-medium">
                                                    {format(pres.updatedAt, 'MMM d, HH:mm')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => handleExport(e, pres)}
                                                className="p-1.5 text-stone-700 hover:text-accent rounded-lg hover:bg-accent/10 transition-colors"
                                                title={t('export_ekt', 'Download .ekt')}
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, pres.id)}
                                                className="p-1.5 text-stone-700 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                                title={t('delete', 'Delete')}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 px-6 text-center space-y-3">
                                <div className="w-12 h-12 bg-white/2 rounded-full flex items-center justify-center mx-auto">
                                    <FileText className="w-6 h-6 text-stone-800" strokeWidth={1} />
                                </div>
                                <p className="text-xs text-stone-600 italic leading-relaxed">
                                    {t('no_presentations_hint', 'No presentations in this workflow yet. Create one to start!')}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-12 px-6 text-center space-y-3">
                        <div className="w-12 h-12 bg-white/2 rounded-full flex items-center justify-center mx-auto">
                            <ChevronRight className="w-6 h-6 text-stone-800" strokeWidth={1} />
                        </div>
                        <p className="text-xs text-stone-600 italic leading-relaxed">
                            {t('select_workflow_library_hint', 'Select a workflow in the first column to see its presentations.')}
                        </p>
                    </div>
                )}

                {/* Templates Section */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                    <h4 className="text-[10px] font-bold text-stone-600 uppercase tracking-widest flex items-center gap-2 px-1">
                        <LayoutTemplate className="w-3 h-3" />
                        {t('templates', 'Templates')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-4/3 rounded-xl bg-stone-800/50 border border-white/5 hover:border-accent/40 transition-colors cursor-pointer group flex items-center justify-center p-2 text-center">
                                <span className="text-[10px] font-bold text-stone-700 group-hover:text-stone-500 uppercase tracking-tighter">
                                    Template {i}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PresentationLibrary;
