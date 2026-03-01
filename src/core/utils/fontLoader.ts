/**
 * Font Loader Utility
 * Handles lazy loading of @fontsource packages to ensure offline availability
 * without bloating the initial bundle.
 */

const FONT_MAP: Record<string, () => Promise<any>> = {
    'alice': () => import('@fontsource/alice/400.css'),
    'caveat': () => import('@fontsource/caveat/400.css'),
    'comfortaa': () => import('@fontsource/comfortaa/400.css'),
    'cormorant-garamond': () => import('@fontsource/cormorant-garamond/400.css'),
    'dancing-script': () => import('@fontsource/dancing-script/400.css'),
    'fira-sans': () => import('@fontsource/fira-sans/400.css'),
    'inter': () => import('@fontsource/inter/400.css'),
    'lobster': () => import('@fontsource/lobster/400.css'),
    'lora': () => import('@fontsource/lora/400.css'),
    'merriweather': () => import('@fontsource/merriweather/400.css'),
    'montserrat': () => import('@fontsource/montserrat/400.css'),
    'nunito': () => import('@fontsource/nunito/400.css'),
    'open-sans': () => import('@fontsource/open-sans/400.css'),
    'oswald': () => import('@fontsource/oswald/400.css'),
    'playfair-display': () => import('@fontsource/playfair-display/400.css'),
    'pt-sans': () => import('@fontsource/pt-sans/400.css'),
    'pt-serif': () => import('@fontsource/pt-serif/400.css'),
    'raleway': () => import('@fontsource/raleway/400.css'),
    'roboto': () => import('@fontsource/roboto/400.css'),
    'ubuntu': () => import('@fontsource/ubuntu/400.css'),
    'crimson-pro': () => import('@fontsource/crimson-pro/400.css'),
};

const BOLD_FONT_MAP: Record<string, () => Promise<any>> = {
    'inter': () => import('@fontsource/inter/700.css'),
    'montserrat': () => import('@fontsource/montserrat/700.css'),
    'lora': () => import('@fontsource/lora/700.css'),
    'crimson-pro': () => import('@fontsource/crimson-pro/700.css'),
    // Add others as needed depending on which fonts user wants in bold
};

const loadedFonts = new Set<string>();

export const loadFontOffline = async (family: string, weight: string = '400') => {
    if (!family) return;

    const pkgName = family.toLowerCase().replace(/\s+/g, '-');
    const cacheKey = `${pkgName}-${weight}`;

    if (loadedFonts.has(cacheKey)) return;

    try {
        if (weight === '700' && BOLD_FONT_MAP[pkgName]) {
            await BOLD_FONT_MAP[pkgName]();
        } else if (FONT_MAP[pkgName]) {
            await FONT_MAP[pkgName]();
        }
        loadedFonts.add(cacheKey);
    } catch (error) {
        console.warn(`Failed to load font locally: ${family}`, error);
        // Fallback: If we can't load locally (e.g. package missing), we could fallback to CDN
        // but the goal is offline, so we just log it.
    }
};
