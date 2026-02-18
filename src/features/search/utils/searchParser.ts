import { BOOK_ORDER, getBookName } from '@/core/data/bookData';

export interface ParseResult {
    type: 'reference' | 'keyword';
    bookId?: string;
    chapter?: number;
    verse?: number;
    query: string;
}

/**
 * Normalizes string for comparison (lowercase, removes punctuation)
 */
function normalize(str: string): string {
    return str.toLowerCase().replace(/[\s\.]/g, '');
}

/**
 * Parses a search query into a scripture reference or keyword search
 */
export function parseSearchQuery(query: string, lang: string = 'en'): ParseResult {
    const trimmed = query.trim();
    if (!trimmed) return { type: 'keyword', query: '' };

    // Regex patterns:
    // 1. [Book] Chapter:Verse (e.g., "John 3:16", "Ин 3:16", "1 John 1:1")
    // 2. [Book] Chapter (e.g., "John 3", "Jn 3")
    // 3. Chapter:Verse (e.g., "3:16") - uses current book (handled by caller)

    // Pattern for reference: (optional book name with numbers) (chapter) (optional separator) (optional verse)
    const refRegex = /^((?:\d\s*)?[a-zA-Zа-яА-ЯёЁ]+)?\s*(\d+)(?:[\s:]+(\d+))?$/;
    const match = trimmed.match(refRegex);

    if (match) {
        const bookPart = match[1]?.trim();
        const chapter = parseInt(match[2]);
        const verse = match[3] ? parseInt(match[3]) : undefined;

        if (bookPart) {
            const normalizedBookPart = normalize(bookPart);

            // Find book by name or ID
            // We check multiple languages if needed, but primarily the current one
            const foundBook = BOOK_ORDER.find(b => {
                const standardId = b.id.toLowerCase();
                const localizedName = normalize(getBookName(b.id, lang));
                const enName = normalize(getBookName(b.id, 'en'));
                const ruName = normalize(getBookName(b.id, 'ru'));

                return standardId === normalizedBookPart ||
                    localizedName.startsWith(normalizedBookPart) ||
                    enName.startsWith(normalizedBookPart) ||
                    ruName.startsWith(normalizedBookPart);
            });

            if (foundBook) {
                return {
                    type: 'reference',
                    bookId: foundBook.id,
                    chapter,
                    verse,
                    query: trimmed
                };
            }
        } else {
            // No book part, e.g., "3:16" or "3"
            return {
                type: 'reference',
                chapter,
                verse,
                query: trimmed
            };
        }
    }

    // Fallback to keyword search
    return {
        type: 'keyword',
        query: trimmed
    };
}
