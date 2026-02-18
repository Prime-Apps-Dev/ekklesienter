
import React from 'react';

// Helper to process text nodes for superscript [n]
export const processVerseText = (text: string, showSuperscript: boolean = true) => {
    if (!text) return text;
    // Split by [n] pattern or circled characters (①-⑳, Ⓐ-Ⓩ, ⓐ-ⓩ)
    const regex = /(\[\d+\]|[\u2460-\u2473\u24B6-\u24CF\u24D0-\u24E9])/g;
    const parts = text.split(regex);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
        // Match [n]
        if (/^\[\d+\]$/.test(part)) {
            if (!showSuperscript) return null; // Hide if disabled
            const content = part.slice(1, -1);
            return (
                <sup
                    key={i}
                    className="text-[0.2em] leading-none align-baseline relative top-[-2.4em] select-none text-accent font-bold opacity-90 transition-colors cursor-help"
                    title={`Note ${content}`}
                >
                    {content}
                </sup>
            );
        }
        // Match circled characters - make them larger and better aligned
        if (/^[\u2460-\u2473\u24B6-\u24CF\u24D0-\u24E9]$/.test(part)) {
            return (
                <sup
                    key={i}
                    className="text-[0.45em] leading-none align-baseline relative top-[-0.6em] mx-[0.1em] select-none text-accent font-bold opacity-90 transition-colors"
                >
                    {part}
                </sup>
            );
        }
        return part;
    });
};

// Helper to recursively process children for ReactMarkdown components
export const processChildren = (children: React.ReactNode, showSuperscript: boolean = true): React.ReactNode => {
    return React.Children.map(children, child => {
        if (typeof child === 'string') {
            return processVerseText(child, showSuperscript);
        }
        // We don't recurse into React Elements because ReactMarkdown handles the tree structure
        // via its own component mapping. We only need to process the immediate text children
        // of the components we override (p, strong, em).
        return child;
    });
};

export interface MarkdownProps {
    node?: unknown;
    children?: React.ReactNode;
    [key: string]: unknown;
}
/**
 * Truncates text in the middle, showing the start and end.
 */
export const truncateMiddle = (text: string, maxLength: number = 100) => {
    if (!text || text.length <= maxLength) return text;
    const separator = '...';
    const charsToShow = maxLength - separator.length;
    const frontChars = Math.ceil(charsToShow / 2);
    const backChars = Math.floor(charsToShow / 2);
    return (
        text.substring(0, frontChars).trim() +
        separator +
        text.substring(text.length - backChars).trim()
    );
};
