import { ILogoGroup } from '../types';

/**
 * PRELOADED_LOGOS defines the built-in logo collections that are bundled with the app.
 * To add a new collection:
 * 1. Create a new ILogoGroup object in the array below.
 * 2. Ensure each logo has a unique ID and `isPreloaded: true`.
 * 3. Use public URLs or assets bundled in the `src/assets` directory.
 */
export const PRELOADED_LOGOS: ILogoGroup[] = [
    {
        id: 'group-default',
        name: 'Default Logos',
        nameRu: 'Стандартные логотипы',
        logos: [
            {
                id: 'logo-cross-white',
                name: 'Cross (White)',
                url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&q=80&w=200',
                isPreloaded: true
            },
            {
                id: 'logo-bible-white',
                name: 'Bible (White)',
                url: 'https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&q=80&w=200',
                isPreloaded: true
            }
        ]
    }
];
