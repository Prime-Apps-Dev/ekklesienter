/**
 * Localized Bible Book Names by Language
 * Standard book IDs with translations for multiple languages
 */

// Bible section categories
export type BibleSection =
    | 'pentateuch'      // Пятикнижие Моисея
    | 'historical'      // Исторические
    | 'writings'        // Писания (поэтические)
    | 'major_prophets'  // Пророки Большие
    | 'minor_prophets'  // Пророки Малые
    | 'gospels'         // Евангелия
    | 'acts'            // Деяния
    | 'paul_epistles'   // Послания Павла
    | 'general_epistles' // Послания Соборные
    | 'revelation';     // Откровение

// Section colors (dimmed background + icon color)
export const SECTION_COLORS: Record<BibleSection, { bg: string; icon: string; border: string }> = {
    pentateuch: { bg: 'bg-blue-950/10', icon: 'text-blue-400', border: 'border-blue-900/50' },
    historical: { bg: 'bg-amber-950/10', icon: 'text-amber-400', border: 'border-amber-900/50' },
    writings: { bg: 'bg-purple-950/10', icon: 'text-purple-400', border: 'border-purple-900/50' },
    major_prophets: { bg: 'bg-red-950/10', icon: 'text-red-400', border: 'border-red-900/50' },
    minor_prophets: { bg: 'bg-orange-950/10', icon: 'text-orange-400', border: 'border-orange-900/50' },
    gospels: { bg: 'bg-emerald-950/10', icon: 'text-emerald-400', border: 'border-emerald-900/50' },
    acts: { bg: 'bg-cyan-950/10', icon: 'text-cyan-400', border: 'border-cyan-900/50' },
    paul_epistles: { bg: 'bg-indigo-950/10', icon: 'text-indigo-400', border: 'border-indigo-900/50' },
    general_epistles: { bg: 'bg-teal-950/10', icon: 'text-teal-400', border: 'border-teal-900/50' },
    revelation: { bg: 'bg-rose-950/10', icon: 'text-rose-400', border: 'border-rose-900/50' }
};

// Section names by language
export const SECTION_NAMES: Record<string, Record<BibleSection, string>> = {
    en: {
        pentateuch: 'Pentateuch',
        historical: 'Historical',
        writings: 'Writings',
        major_prophets: 'Major Prophets',
        minor_prophets: 'Minor Prophets',
        gospels: 'Gospels',
        acts: 'Acts',
        paul_epistles: "Paul's Epistles",
        general_epistles: 'General Epistles',
        revelation: 'Revelation'
    },
    ru: {
        pentateuch: 'Пятикнижие',
        historical: 'Исторические',
        writings: 'Писания',
        major_prophets: 'Большие пророки',
        minor_prophets: 'Малые пророки',
        gospels: 'Евангелия',
        acts: 'Деяния',
        paul_epistles: 'Послания Павла',
        general_epistles: 'Соборные послания',
        revelation: 'Откровение'
    }
};

// Book to section mapping
export const BOOK_SECTIONS: Record<string, BibleSection> = {
    // Pentateuch (Genesis - Deuteronomy)
    GEN: 'pentateuch', EXO: 'pentateuch', LEV: 'pentateuch', NUM: 'pentateuch', DEU: 'pentateuch',
    // Historical (Joshua - Esther)
    JOS: 'historical', JDG: 'historical', RUT: 'historical', '1SA': 'historical', '2SA': 'historical',
    '1KI': 'historical', '2KI': 'historical', '1CH': 'historical', '2CH': 'historical',
    EZR: 'historical', NEH: 'historical', EST: 'historical',
    // Writings/Poetry (Job - Song of Solomon)
    JOB: 'writings', PSA: 'writings', PRO: 'writings', ECC: 'writings', SNG: 'writings',
    // Major Prophets (Isaiah - Daniel)
    ISA: 'major_prophets', JER: 'major_prophets', LAM: 'major_prophets', EZK: 'major_prophets', DAN: 'major_prophets',
    // Minor Prophets (Hosea - Malachi)
    HOS: 'minor_prophets', JOL: 'minor_prophets', AMO: 'minor_prophets', OBA: 'minor_prophets',
    JON: 'minor_prophets', MIC: 'minor_prophets', NAM: 'minor_prophets', HAB: 'minor_prophets',
    ZEP: 'minor_prophets', HAG: 'minor_prophets', ZEC: 'minor_prophets', MAL: 'minor_prophets',
    // Gospels
    MAT: 'gospels', MRK: 'gospels', LUK: 'gospels', JHN: 'gospels',
    // Acts
    ACT: 'acts',
    // Paul's Epistles (Romans - Philemon)
    ROM: 'paul_epistles', '1CO': 'paul_epistles', '2CO': 'paul_epistles', GAL: 'paul_epistles',
    EPH: 'paul_epistles', PHP: 'paul_epistles', COL: 'paul_epistles',
    '1TH': 'paul_epistles', '2TH': 'paul_epistles', '1TI': 'paul_epistles', '2TI': 'paul_epistles',
    TIT: 'paul_epistles', PHM: 'paul_epistles',
    // General Epistles (Hebrews - Jude)
    HEB: 'general_epistles', JAS: 'general_epistles', '1PE': 'general_epistles', '2PE': 'general_epistles',
    '1JN': 'general_epistles', '2JN': 'general_epistles', '3JN': 'general_epistles', JUD: 'general_epistles',
    // Revelation
    REV: 'revelation'
};

/**
 * Get book section
 */
export function getBookSection(bookId: string): BibleSection {
    if (!bookId) return 'writings';
    // Normalize ID to match BOOK_SECTIONS keys (uppercase, no whitespace)
    const normalizedId = bookId.toString().trim().toUpperCase();
    return BOOK_SECTIONS[normalizedId] || 'writings';
}

/**
 * Get section colors
 */
export function getSectionColors(bookId: string): { bg: string; icon: string; border: string } {
    const section = getBookSection(bookId);
    return SECTION_COLORS[section];
}

export interface BookInfo {
    id: string;
    order: number; // 1-66 canonical order
    testament: 'OT' | 'NT';
}

// Canonical book order with IDs
export const BOOK_ORDER: BookInfo[] = [
    // Old Testament (1-39)
    { id: 'GEN', order: 1, testament: 'OT' },
    { id: 'EXO', order: 2, testament: 'OT' },
    { id: 'LEV', order: 3, testament: 'OT' },
    { id: 'NUM', order: 4, testament: 'OT' },
    { id: 'DEU', order: 5, testament: 'OT' },
    { id: 'JOS', order: 6, testament: 'OT' },
    { id: 'JDG', order: 7, testament: 'OT' },
    { id: 'RUT', order: 8, testament: 'OT' },
    { id: '1SA', order: 9, testament: 'OT' },
    { id: '2SA', order: 10, testament: 'OT' },
    { id: '1KI', order: 11, testament: 'OT' },
    { id: '2KI', order: 12, testament: 'OT' },
    { id: '1CH', order: 13, testament: 'OT' },
    { id: '2CH', order: 14, testament: 'OT' },
    { id: 'EZR', order: 15, testament: 'OT' },
    { id: 'NEH', order: 16, testament: 'OT' },
    { id: 'EST', order: 17, testament: 'OT' },
    { id: 'JOB', order: 18, testament: 'OT' },
    { id: 'PSA', order: 19, testament: 'OT' },
    { id: 'PRO', order: 20, testament: 'OT' },
    { id: 'ECC', order: 21, testament: 'OT' },
    { id: 'SNG', order: 22, testament: 'OT' },
    { id: 'ISA', order: 23, testament: 'OT' },
    { id: 'JER', order: 24, testament: 'OT' },
    { id: 'LAM', order: 25, testament: 'OT' },
    { id: 'EZK', order: 26, testament: 'OT' },
    { id: 'DAN', order: 27, testament: 'OT' },
    { id: 'HOS', order: 28, testament: 'OT' },
    { id: 'JOL', order: 29, testament: 'OT' },
    { id: 'AMO', order: 30, testament: 'OT' },
    { id: 'OBA', order: 31, testament: 'OT' },
    { id: 'JON', order: 32, testament: 'OT' },
    { id: 'MIC', order: 33, testament: 'OT' },
    { id: 'NAM', order: 34, testament: 'OT' },
    { id: 'HAB', order: 35, testament: 'OT' },
    { id: 'ZEP', order: 36, testament: 'OT' },
    { id: 'HAG', order: 37, testament: 'OT' },
    { id: 'ZEC', order: 38, testament: 'OT' },
    { id: 'MAL', order: 39, testament: 'OT' },
    // New Testament (40-66)
    { id: 'MAT', order: 40, testament: 'NT' },
    { id: 'MRK', order: 41, testament: 'NT' },
    { id: 'LUK', order: 42, testament: 'NT' },
    { id: 'JHN', order: 43, testament: 'NT' },
    { id: 'ACT', order: 44, testament: 'NT' },
    { id: 'JAS', order: 45, testament: 'NT' },
    { id: '1PE', order: 46, testament: 'NT' },
    { id: '2PE', order: 47, testament: 'NT' },
    { id: '1JN', order: 48, testament: 'NT' },
    { id: '2JN', order: 49, testament: 'NT' },
    { id: '3JN', order: 50, testament: 'NT' },
    { id: 'JUD', order: 51, testament: 'NT' },
    { id: 'ROM', order: 52, testament: 'NT' },
    { id: '1CO', order: 53, testament: 'NT' },
    { id: '2CO', order: 54, testament: 'NT' },
    { id: 'GAL', order: 55, testament: 'NT' },
    { id: 'EPH', order: 56, testament: 'NT' },
    { id: 'PHP', order: 57, testament: 'NT' },
    { id: 'COL', order: 58, testament: 'NT' },
    { id: '1TH', order: 59, testament: 'NT' },
    { id: '2TH', order: 60, testament: 'NT' },
    { id: '1TI', order: 61, testament: 'NT' },
    { id: '2TI', order: 62, testament: 'NT' },
    { id: 'TIT', order: 63, testament: 'NT' },
    { id: 'PHM', order: 64, testament: 'NT' },
    { id: 'HEB', order: 65, testament: 'NT' },
    { id: 'REV', order: 66, testament: 'NT' }
];

// Book names by language
export const BOOK_NAMES: Record<string, Record<string, string>> = {
    en: {
        GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy',
        JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
        '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
        EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalms',
        PRO: 'Proverbs', ECC: 'Ecclesiastes', SNG: 'Song of Solomon', ISA: 'Isaiah',
        JER: 'Jeremiah', LAM: 'Lamentations', EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea',
        JOL: 'Joel', AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah',
        NAM: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai', ZEC: 'Zechariah',
        MAL: 'Malachi', MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John',
        ACT: 'Acts', ROM: 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
        GAL: 'Galatians', EPH: 'Ephesians', PHP: 'Philippians', COL: 'Colossians',
        '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
        TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews', JAS: 'James',
        '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John', '3JN': '3 John',
        JUD: 'Jude', REV: 'Revelation'
    },
    ru: {
        GEN: 'Бытие', EXO: 'Исход', LEV: 'Левит', NUM: 'Числа', DEU: 'Второзаконие',
        JOS: 'Иисус Навин', JDG: 'Судьи', RUT: 'Руфь', '1SA': '1 Царств', '2SA': '2 Царств',
        '1KI': '3 Царств', '2KI': '4 Царств', '1CH': '1 Паралипоменон', '2CH': '2 Паралипоменон',
        EZR: 'Ездра', NEH: 'Неемия', EST: 'Есфирь', JOB: 'Иов', PSA: 'Псалтирь',
        PRO: 'Притчи', ECC: 'Екклесиаст', SNG: 'Песнь Песней', ISA: 'Исаия',
        JER: 'Иеремия', LAM: 'Плач Иеремии', EZK: 'Иезекииль', DAN: 'Даниил', HOS: 'Осия',
        JOL: 'Иоиль', AMO: 'Амос', OBA: 'Авдий', JON: 'Иона', MIC: 'Михей',
        NAM: 'Наум', HAB: 'Аввакум', ZEP: 'Софония', HAG: 'Аггей', ZEC: 'Захария',
        MAL: 'Малахия', MAT: 'Матфея', MRK: 'Марка', LUK: 'Луки', JHN: 'Иоанна',
        ACT: 'Деяния', ROM: 'Римлянам', '1CO': '1 Коринфянам', '2CO': '2 Коринфянам',
        GAL: 'Галатам', EPH: 'Ефесянам', PHP: 'Филиппийцам', COL: 'Колоссянам',
        '1TH': '1 Фессалоникийцам', '2TH': '2 Фессалоникийцам', '1TI': '1 Тимофею', '2TI': '2 Тимофею',
        TIT: 'Титу', PHM: 'Филимону', HEB: 'Евреям', JAS: 'Иакова',
        '1PE': '1 Петра', '2PE': '2 Петра', '1JN': '1 Иоанна', '2JN': '2 Иоанна', '3JN': '3 Иоанна',
        JUD: 'Иуды', REV: 'Откровение'
    },
    uk: {
        GEN: 'Буття', EXO: 'Вихід', LEV: 'Левит', NUM: 'Числа', DEU: 'Повторення Закону',
        JOS: 'Ісус Навин', JDG: 'Судді', RUT: 'Рут', '1SA': '1 Самуїла', '2SA': '2 Самуїла',
        '1KI': '1 Царів', '2KI': '2 Царів', '1CH': '1 Хроніки', '2CH': '2 Хроніки',
        EZR: 'Ездра', NEH: 'Неємія', EST: 'Естер', JOB: 'Йов', PSA: 'Псалми',
        PRO: 'Приповісті', ECC: 'Еклезіяст', SNG: 'Пісня Пісень', ISA: 'Ісая',
        JER: 'Єремія', LAM: 'Плач Єремії', EZK: 'Єзекіїль', DAN: 'Даниїл', HOS: 'Осія',
        JOL: 'Йоїл', AMO: 'Амос', OBA: 'Овдій', JON: 'Йона', MIC: 'Михей',
        NAM: 'Наум', HAB: 'Авакум', ZEP: 'Софонія', HAG: 'Огій', ZEC: 'Захарія',
        MAL: 'Малахія', MAT: 'Матвія', MRK: 'Марка', LUK: 'Луки', JHN: 'Івана',
        ACT: 'Дії', ROM: 'Римлян', '1CO': '1 Коринтян', '2CO': '2 Коринтян',
        GAL: 'Галатів', EPH: 'Ефесян', PHP: 'Филип\'ян', COL: 'Колосян',
        '1TH': '1 Солунян', '2TH': '2 Солунян', '1TI': '1 Тимотея', '2TI': '2 Тимотея',
        TIT: 'Тита', PHM: 'Филимона', HEB: 'Євреїв', JAS: 'Якова',
        '1PE': '1 Петра', '2PE': '2 Петра', '1JN': '1 Івана', '2JN': '2 Івана', '3JN': '3 Івана',
        JUD: 'Юди', REV: 'Об\'явлення'
    },
    de: {
        GEN: '1. Mose', EXO: '2. Mose', LEV: '3. Mose', NUM: '4. Mose', DEU: '5. Mose',
        JOS: 'Josua', JDG: 'Richter', RUT: 'Ruth', '1SA': '1. Samuel', '2SA': '2. Samuel',
        '1KI': '1. Könige', '2KI': '2. Könige', '1CH': '1. Chronik', '2CH': '2. Chronik',
        EZR: 'Esra', NEH: 'Nehemia', EST: 'Esther', JOB: 'Hiob', PSA: 'Psalmen',
        PRO: 'Sprüche', ECC: 'Prediger', SNG: 'Hohelied', ISA: 'Jesaja',
        JER: 'Jeremia', LAM: 'Klagelieder', EZK: 'Hesekiel', DAN: 'Daniel', HOS: 'Hosea',
        JOL: 'Joel', AMO: 'Amos', OBA: 'Obadja', JON: 'Jona', MIC: 'Micha',
        NAM: 'Nahum', HAB: 'Habakuk', ZEP: 'Zefanja', HAG: 'Haggai', ZEC: 'Sacharja',
        MAL: 'Maleachi', MAT: 'Matthäus', MRK: 'Markus', LUK: 'Lukas', JHN: 'Johannes',
        ACT: 'Apostelgeschichte', ROM: 'Römer', '1CO': '1. Korinther', '2CO': '2. Korinther',
        GAL: 'Galater', EPH: 'Epheser', PHP: 'Philipper', COL: 'Kolosser',
        '1TH': '1. Thessalonicher', '2TH': '2. Thessalonicher', '1TI': '1. Timotheus', '2TI': '2. Timotheus',
        TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebräer', JAS: 'Jakobus',
        '1PE': '1. Petrus', '2PE': '2. Petrus', '1JN': '1. Johannes', '2JN': '2. Johannes', '3JN': '3. Johannes',
        JUD: 'Judas', REV: 'Offenbarung'
    },
    zh: {
        GEN: '创世记', EXO: '出埃及记', LEV: '利未记', NUM: '民数记', DEU: '申命记',
        JOS: '约书亚记', JDG: '士师记', RUT: '路得记', '1SA': '撒母耳记上', '2SA': '撒母耳记下',
        '1KI': '列王纪上', '2KI': '列王纪下', '1CH': '历代志上', '2CH': '历代志下',
        EZR: '以斯拉记', NEH: '尼希米记', EST: '以斯帖记', JOB: '约伯记', PSA: '诗篇',
        PRO: '箴言', ECC: '传道书', SNG: '雅歌', ISA: '以赛亚书',
        JER: '耶利米书', LAM: '耶利米哀歌', EZK: '以西结书', DAN: '但以理书', HOS: '何西阿书',
        JOL: '约珥书', AMO: '阿摩司书', OBA: '俄巴底亚书', JON: '约拿书', MIC: '弥迦书',
        NAM: '那鸿书', HAB: '哈巴谷书', ZEP: '西番雅书', HAG: '哈该书', ZEC: '撒迦利亚书',
        MAL: '玛拉基书', MAT: '马太福音', MRK: '马可福音', LUK: '路加福音', JHN: '约翰福音',
        ACT: '使徒行传', ROM: '罗马书', '1CO': '哥林多前书', '2CO': '哥林多后书',
        GAL: '加拉太书', EPH: '以弗所书', PHP: '腓立比书', COL: '歌罗西书',
        '1TH': '帖撒罗尼迦前书', '2TH': '帖撒罗尼迦后书', '1TI': '提摩太前书', '2TI': '提摩太后书',
        TIT: '提多书', PHM: '腓利门书', HEB: '希伯来书', JAS: '雅各书',
        '1PE': '彼得前书', '2PE': '彼得后书', '1JN': '约翰一书', '2JN': '约翰二书', '3JN': '约翰三书',
        JUD: '犹大书', REV: '启示录'
    }
};

/**
 * Get localized book name
 */
export function getBookName(bookId: string, language: string): string {
    // Try exact language match first
    if (BOOK_NAMES[language]?.[bookId]) {
        return BOOK_NAMES[language][bookId];
    }
    // Fall back to English
    return BOOK_NAMES.en[bookId] || bookId;
}

/**
 * Get book order (1-66)
 */
export function getBookOrder(bookId: string): number {
    if (!bookId) return 99;
    const normalizedId = bookId.toString().trim().toUpperCase();
    const book = BOOK_ORDER.find(b => b.id === normalizedId);
    return book?.order ?? 99;
}

// MyBible book number to standard ID mapping
// ❌ ИСПРАВЛЕНО: Убраны дубликаты ключей 670-730
export const MYBIBLE_TO_STANDARD: Record<number, string> = {
    // Standard MyBible IDs (10, 20, 30...)
    10: 'GEN', 20: 'EXO', 30: 'LEV', 40: 'NUM', 50: 'DEU',
    60: 'JOS', 70: 'JDG', 80: 'RUT', 90: '1SA', 100: '2SA',
    110: '1KI', 120: '2KI', 130: '1CH', 140: '2CH', 150: 'EZR',
    160: 'NEH', 190: 'EST', 220: 'JOB', 230: 'PSA', 240: 'PRO',
    250: 'ECC', 260: 'SNG', 290: 'ISA', 300: 'JER', 310: 'LAM',
    330: 'EZK', 340: 'DAN', 350: 'HOS', 360: 'JOL', 370: 'AMO',
    380: 'OBA', 390: 'JON', 400: 'MIC', 410: 'NAM', 420: 'HAB',
    430: 'ZEP', 440: 'HAG', 450: 'ZEC', 460: 'MAL',

    // New Testament
    470: 'MAT', 480: 'MRK', 490: 'LUK', 500: 'JHN', 510: 'ACT',
    520: 'ROM', 530: '1CO', 540: '2CO', 550: 'GAL', 560: 'EPH',
    570: 'PHP', 580: 'COL', 590: '1TH', 600: '2TH', 610: '1TI',
    620: '2TI', 630: 'TIT', 640: 'PHM', 650: 'HEB', 660: 'JAS',
    670: '1PE', 680: '2PE', 690: '1JN', 700: '2JN', 710: '3JN',
    720: 'JUD', 730: 'REV'
};

// Sequential (1-66) to standard ID mapping
export const SEQUENTIAL_TO_STANDARD: Record<number, string> = {
    1: 'GEN', 2: 'EXO', 3: 'LEV', 4: 'NUM', 5: 'DEU',
    6: 'JOS', 7: 'JDG', 8: 'RUT', 9: '1SA', 10: '2SA',
    11: '1KI', 12: '2KI', 13: '1CH', 14: '2CH', 15: 'EZR',
    16: 'NEH', 17: 'EST', 18: 'JOB', 19: 'PSA', 20: 'PRO',
    21: 'ECC', 22: 'SNG', 23: 'ISA', 24: 'JER', 25: 'LAM',
    26: 'EZK', 27: 'DAN', 28: 'HOS', 29: 'JOL', 30: 'AMO',
    31: 'OBA', 32: 'JON', 33: 'MIC', 34: 'NAM', 35: 'HAB',
    36: 'ZEP', 37: 'HAG', 38: 'ZEC', 39: 'MAL',
    40: 'MAT', 41: 'MRK', 42: 'LUK', 43: 'JHN', 44: 'ACT',
    45: 'ROM', 46: '1CO', 47: '2CO', 48: 'GAL', 49: 'EPH',
    50: 'PHP', 51: 'COL', 52: '1TH', 53: '2TH', 54: '1TI',
    55: '2TI', 56: 'TIT', 57: 'PHM', 58: 'HEB', 59: 'JAS',
    60: '1PE', 61: '2PE', 62: '1JN', 63: '2JN', 64: '3JN',
    65: 'JUD', 66: 'REV'
};