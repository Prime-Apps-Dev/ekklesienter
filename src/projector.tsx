import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useBibleStore } from './core/store/bibleStore';
import { usePresenterStore } from './core/store/presenterStore';
import SlideDisplay from './features/presenter/components/SlideDisplay';

import './core/styles/globals.css';
import './core/i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const ProjectorApp = () => {
    const { setActiveVerse } = useBibleStore();

    // 1. Sync State from Main Window
    useEffect(() => {
        document.body.classList.add('projector-mode');
        if (window.electron?.ipcRenderer) {
            // Tell main process we are ready and send current aspect ratio
            const reportRatio = () => {
                const ratio = window.innerWidth / window.innerHeight;
                window.electron.ipcRenderer.send('projector-ready', { ratio });
            };

            window.addEventListener('resize', reportRatio);
            reportRatio();


            const removeListener = window.electron.ipcRenderer.on('projector-command', (command, payload: any) => {
                if (command === 'show-verse') {
                    const { setSecondTranslation } = useBibleStore.getState();
                    setSecondTranslation(payload.secondTranslationId);
                    setActiveVerse(payload.verse, false);
                } else if (command === 'update-settings') {
                    const { setSettings } = usePresenterStore.getState();
                    setSettings(payload);
                } else if (command === 'update-theme') {
                    document.documentElement.setAttribute('data-theme', payload);
                }
            });


            return () => {
                window.removeEventListener('resize', reportRatio);
                removeListener();
            };
        }
    }, [setActiveVerse]);

    // 2. Handle Navigation (Intercept keys and send to Main Window)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!window.electron?.ipcRenderer) return;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                e.stopPropagation();
                window.electron.ipcRenderer.send('navigate-verse', 'next');
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                window.electron.ipcRenderer.send('navigate-verse', 'prev');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                window.electron.ipcRenderer.invoke('close-projector');
            }
        };

        // Use capture phase to intercept before SlideDisplay
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative">
            <SlideDisplay isProjector={true} />
        </div>
    );
};

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <ProjectorApp />
    </React.StrictMode>
);
