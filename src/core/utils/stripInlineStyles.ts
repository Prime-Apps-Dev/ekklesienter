/**
 * Strips specific inline CSS properties from all elements within an HTML string.
 * Used when applying whole-element styles to override existing character-level overrides.
 * 
 * @param html - The HTML content string
 * @param properties - CSS property names to strip (camelCase, e.g. 'fontFamily', 'fontWeight')
 * @returns Cleaned HTML string
 */
export const stripInlineStyles = (html: string, properties: string[]): string => {
    if (!html || properties.length === 0) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
    const root = doc.getElementById('root');
    if (!root) return html;

    // Traverse all elements and strip the target properties
    const allElements = root.querySelectorAll('*');
    const elementsToUnwrap: Element[] = [];

    allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;

        // Strip target CSS properties from inline style
        properties.forEach((prop) => {
            htmlEl.style.removeProperty(camelToKebab(prop));
        });

        // Handle <font> elements created by document.execCommand
        if (htmlEl.tagName === 'FONT') {
            if (properties.includes('fontFamily')) {
                htmlEl.removeAttribute('face');
            }
            if (properties.includes('fontSize')) {
                htmlEl.removeAttribute('size');
            }
            if (properties.includes('color')) {
                htmlEl.removeAttribute('color');
            }
        }

        // Mark for unwrap if empty style and no other attributes
        const hasStyle = htmlEl.getAttribute('style')?.trim();
        const hasMeaningfulAttrs = hasNonStyleAttributes(htmlEl);

        if (!hasStyle && !hasMeaningfulAttrs && isWrapperElement(htmlEl)) {
            elementsToUnwrap.push(htmlEl);
        }
    });

    // Unwrap empty wrapper elements (replace with their children)
    elementsToUnwrap.forEach((el) => {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
    });

    return root.innerHTML;
};

/** Convert camelCase to kebab-case for CSS property names */
const camelToKebab = (str: string): string =>
    str.replace(/([A-Z])/g, '-$1').toLowerCase();

/** Check if element has attributes beyond just `style` */
const hasNonStyleAttributes = (el: HTMLElement): boolean => {
    for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i].name;
        if (attr !== 'style') return true;
    }
    return false;
};

/** Check if element is a wrapper that can be safely unwrapped */
const isWrapperElement = (el: HTMLElement): boolean => {
    const tag = el.tagName.toUpperCase();
    return tag === 'SPAN' || tag === 'FONT' || tag === 'B' || tag === 'I' || tag === 'U' || tag === 'S';
};
