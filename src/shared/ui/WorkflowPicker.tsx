import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import {
    Search,
    X,
    ChevronRight,
    Folder,
    Plus,
    FolderPlus,
    FileText,
    ArrowLeft,
    Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';
import { IWorkflow, IWorkflowFolder } from '@/core/types';

interface WorkflowPickerProps {
    currentWorkflowId: string | null;
    onSelect: (workflowId: string) => void;
    onClose: () => void;
    triggerRect?: DOMRect | null;
}

const WorkflowPicker: React.FC<WorkflowPickerProps> = ({
    currentWorkflowId,
    onSelect,
    onClose,
    triggerRect
}) => {
    const { t, i18n } = useTranslation();
    const [search, setSearch] = useState('');
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [addingType, setAddingType] = useState<'workflow' | 'folder' | null>(null);
    const [newName, setNewName] = useState('');
    const isRu = i18n.language?.substring(0, 2) === 'ru';

    const workflows = useLiveQuery(() => db.workflows.toArray()) || [];
    const folders = useLiveQuery(() => db.workflowFolders.toArray()) || [];

    const currentFolder = useMemo(() =>
        folders.find(f => f.id === currentFolderId)
        , [folders, currentFolderId]);

    const filteredFolders = useMemo(() => {
        if (search) {
            return folders.filter(f =>
                f.name.toLowerCase().includes(search.toLowerCase()) ||
                f.nameRu.toLowerCase().includes(search.toLowerCase())
            );
        }
        return folders.filter(f => (f.parentId || null) === (currentFolderId || null));
    }, [folders, search, currentFolderId]);

    const filteredWorkflows = useMemo(() => {
        if (search) {
            return workflows.filter(w =>
                w.name.toLowerCase().includes(search.toLowerCase()) ||
                w.nameRu.toLowerCase().includes(search.toLowerCase())
            );
        }
        return workflows.filter(w => (w.folderId || null) === (currentFolderId || null));
    }, [workflows, search, currentFolderId]);

    // Positioning logic (Reused from TranslationPicker)
    const position = useMemo(() => {
        if (!triggerRect) return { top: '4rem', left: '1rem', width: '320px' };

        const spacing = 8;
        const windowHeight = window.innerHeight;
        const menuHeight = 500;

        let top = triggerRect.bottom + spacing;
        let left = triggerRect.left;
        let width = Math.max(triggerRect.width, 280);

        // If it would go off the bottom of the screen, open it upwards
        if (top + menuHeight > windowHeight) {
            top = triggerRect.top - menuHeight - spacing;
            // Ensure it doesn't go off the top of the screen
            if (top < spacing) {
                top = spacing;
            }
        }

        return { top, left, width };
    }, [triggerRect]);

    const handleConfirmAdd = async () => {
        if (!newName.trim()) {
            setAddingType(null);
            return;
        }

        if (addingType === 'workflow') {
            const id = `workflow-${Date.now()}`;
            await db.workflows.add({
                id,
                name: newName,
                nameRu: newName,
                description: '',
                sectionIds: [],
                folderId: currentFolderId || undefined
            });
        } else if (addingType === 'folder') {
            const id = `folder-${Date.now()}`;
            await db.workflowFolders.add({
                id,
                name: newName,
                nameRu: newName,
                parentId: currentFolderId || undefined
            });
        }

        setNewName('');
        setAddingType(null);
    };

    const handleCancelAdd = () => {
        setNewName('');
        setAddingType(null);
    };

    return createPortal(
        <div className="fixed inset-0 z-9999 pointer-events-none">
            <div className="absolute inset-0 bg-transparent pointer-events-auto" onClick={onClose} />

            <div
                className="absolute bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
                style={position}
            >
                {/* Header */}
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-stone-950/40">
                    <div className="flex items-center gap-2">
                        {currentFolderId && !search && (
                            <button
                                onClick={() => setCurrentFolderId(currentFolder?.parentId || null)}
                                className="p-1 hover:bg-white/5 rounded-lg text-stone-500 hover:text-white transition-all"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest truncate max-w-[150px]">
                            {search ? t('search_results', 'Search Results') : (currentFolder ? (isRu ? currentFolder.nameRu : currentFolder.name) : t('workflows'))}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-stone-600 hover:text-white transition-all">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="p-2 border-b border-white/5 bg-stone-950/20 space-y-2">
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-600 group-focus-within:text-accent" />
                        <input
                            type="text"
                            autoFocus
                            placeholder={t('search_workflows', 'Search workflows...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-stone-200 focus:outline-none focus:border-accent/40 transition-all placeholder:text-stone-700"
                        />
                    </div>

                    {!search && !addingType && (
                        <div className="flex gap-1">
                            <button
                                onClick={() => setAddingType('workflow')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-bold text-stone-400 hover:text-white transition-all"
                            >
                                <Plus className="w-3 h-3" />
                                {t('new_workflow', 'Workflow')}
                            </button>
                            <button
                                onClick={() => setAddingType('folder')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-bold text-stone-400 hover:text-white transition-all"
                            >
                                <FolderPlus className="w-3 h-3" />
                                {t('new_folder', 'Folder')}
                            </button>
                        </div>
                    )}

                    {addingType && (
                        <div className="flex gap-1 animate-in slide-in-from-top-2 duration-200">
                            <input
                                type="text"
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirmAdd();
                                    if (e.key === 'Escape') handleCancelAdd();
                                }}
                                placeholder={addingType === 'workflow' ? t('workflow_name', 'Workflow Name...') : t('folder_name', 'Folder Name...')}
                                className="flex-1 bg-white/5 border border-accent/30 rounded-lg py-1.5 px-3 text-[11px] text-stone-200 focus:outline-none transition-all placeholder:text-stone-700 font-medium"
                            />
                            <button
                                onClick={handleConfirmAdd}
                                className="w-8 flex items-center justify-center bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-all border border-accent/10"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleCancelAdd}
                                className="w-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-stone-500 rounded-lg transition-all border border-white/5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar min-h-0">
                    {/* Folders List */}
                    {filteredFolders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => {
                                setCurrentFolderId(folder.id);
                                setSearch('');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group text-left"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-stone-800/50 flex items-center justify-center text-stone-500 group-hover:text-accent transition-colors">
                                    <Folder className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px] font-bold text-stone-300 group-hover:text-white truncate">
                                    {isRu ? folder.nameRu : folder.name}
                                </span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-stone-700 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    ))}

                    {/* Workflows List */}
                    {filteredWorkflows.map(workflow => (
                        <button
                            key={workflow.id}
                            onClick={() => {
                                onSelect(workflow.id);
                                onClose();
                            }}
                            className={cn(
                                "w-full flex items-center justify-between p-2 rounded-lg transition-all group text-left border",
                                currentWorkflowId === workflow.id
                                    ? "bg-accent/10 border-accent/20"
                                    : "hover:bg-white/5 border-transparent hover:border-white/5"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                    currentWorkflowId === workflow.id ? "bg-accent/20 text-accent" : "bg-stone-800/30 text-stone-600 group-hover:text-stone-400"
                                )}>
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn("text-[11px] font-bold truncate", currentWorkflowId === workflow.id ? "text-accent" : "text-stone-300")}>
                                        {isRu ? workflow.nameRu : workflow.name}
                                    </span>
                                    {workflow.description && (
                                        <span className="text-[8px] text-stone-600 truncate max-w-[180px]">
                                            {workflow.description}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {currentWorkflowId === workflow.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
                            )}
                        </button>
                    ))}

                    {filteredFolders.length === 0 && filteredWorkflows.length === 0 && (
                        <div className="py-8 flex flex-col items-center justify-center gap-2 opacity-30">
                            <FileText className="w-8 h-8 text-stone-500" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">{t('empty_folder', 'Empty')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default WorkflowPicker;
