import { ICanvasItem, IStyleLayer, ICanvasItemText } from '@/core/types';

/**
 * Normalizes a color string to uppercase hex or rgb.
 */
export const normalizeColor = (color: string): string => {
    if (!color) return '#FFFFFF';
    // If it's rgb/rgba, keep it as is or normalize to one format
    if (color.startsWith('rgb')) return color.toLowerCase();
    if (color.startsWith('#')) return color.toUpperCase();
    return color;
};

/**
 * Extracts unique colors from HTML content string (span styles).
 */
export const extractColorsFromHtml = (html: string): string[] => {
    const colors = new Set<string>();
    // Match color: ...; or color: ..."
    const regex = /color\s*:\s*([^;"]+)/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        colors.add(normalizeColor(match[1].trim()));
    }
    return Array.from(colors);
};

/**
 * Generates a stable hash for an IStyleLayer to identify unique styles.
 */
export const getStyleHash = (layer: IStyleLayer): string => {
    const parts: string[] = [layer.type];

    if (layer.type === 'color') {
        parts.push(normalizeColor(layer.color || '#FFFFFF'));
    } else if (layer.type === 'gradient') {
        parts.push(layer.gradient?.type || 'linear');
        layer.gradient?.stops?.forEach(stop => {
            parts.push(`${stop.offset}-${normalizeColor(stop.color)}`);
        });
    } else if (layer.type === 'image') {
        parts.push(layer.image?.url || '');
    } else if (layer.type === 'video') {
        parts.push(layer.video?.url || '');
    }

    return parts.join('|');
};

/**
 * Traverses selected items and extracts all unique rich styles.
 */
export const getUniqueSelectionStyles = (
    selectedIds: string[],
    canvasItems: ICanvasItem[]
): IStyleLayer[] => {
    const uniqueStylesMap = new Map<string, IStyleLayer>();
    const selectedItems = canvasItems.filter(item => selectedIds.includes(item.id));

    selectedItems.forEach(item => {
        // 1. Regular Fills
        item.fills?.forEach(fill => {
            if (!fill.visible) return;
            const hash = getStyleHash(fill);
            if (!uniqueStylesMap.has(hash)) {
                uniqueStylesMap.set(hash, fill);
            }
        });

        // 2. Strokes
        item.strokes?.forEach(stroke => {
            if (!stroke.visible) return;
            const hash = getStyleHash(stroke);
            if (!uniqueStylesMap.has(hash)) {
                uniqueStylesMap.set(hash, stroke);
            }
        });

        // 3. Text Fills
        if (item.type === 'text' && item.text) {
            item.text.textFills?.forEach(fill => {
                if (!fill.visible) return;
                const hash = getStyleHash(fill);
                if (!uniqueStylesMap.has(hash)) {
                    uniqueStylesMap.set(hash, fill);
                }
            });

            // If no textFills, but has legacy color, add it
            if ((!item.text.textFills || item.text.textFills.length === 0) && item.text.color) {
                const colorLayer: IStyleLayer = {
                    id: `text-legacy-${item.text.color}`,
                    type: 'color',
                    color: normalizeColor(item.text.color),
                    visible: true,
                    opacity: 1,
                    blendMode: 'normal'
                };
                const hash = getStyleHash(colorLayer);
                if (!uniqueStylesMap.has(hash)) {
                    uniqueStylesMap.set(hash, colorLayer);
                }
            }

            // 4. Character-level colors from HTML
            if (item.text.content) {
                const charColors = extractColorsFromHtml(item.text.content);
                charColors.forEach(color => {
                    const charLayer: IStyleLayer = {
                        id: `char-${color}`,
                        type: 'color',
                        color,
                        visible: true,
                        opacity: 1,
                        blendMode: 'normal'
                    };
                    const hash = getStyleHash(charLayer);
                    if (!uniqueStylesMap.has(hash)) {
                        uniqueStylesMap.set(hash, charLayer);
                    }
                });
            }
        }
    });

    return Array.from(uniqueStylesMap.values()).sort((a, b) => {
        // Sort by hex/color descending if both are colors
        if (a.type === 'color' && b.type === 'color') {
            return (b.color || '').localeCompare(a.color || '');
        }
        // Gradients first, then colors
        const typePriority: Record<string, number> = { gradient: 0, image: 1, video: 2, color: 3 };
        return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
    });
};
