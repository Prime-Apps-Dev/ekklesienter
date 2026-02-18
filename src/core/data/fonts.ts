
export interface FontDefinition {
    name: string;
    category: 'Sans Serif' | 'Serif' | 'Display' | 'Handwriting';
    tags: ('Latin' | 'Cyrillic')[];
}

export const AVAILABLE_FONTS: FontDefinition[] = [
    { name: 'Inter', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Roboto', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Montserrat', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Open Sans', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Fira Sans', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'PT Sans', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Nunito', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Ubuntu', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Raleway', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Playfair Display', category: 'Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Merriweather', category: 'Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Lora', category: 'Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'PT Serif', category: 'Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Cormorant Garamond', category: 'Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Alice', category: 'Serif', tags: ['Latin', 'Cyrillic'] },
    { name: 'Oswald', category: 'Display', tags: ['Latin', 'Cyrillic'] },
    { name: 'Comfortaa', category: 'Display', tags: ['Latin', 'Cyrillic'] },
    { name: 'Lobster', category: 'Display', tags: ['Latin', 'Cyrillic'] },
    { name: 'Caveat', category: 'Handwriting', tags: ['Latin', 'Cyrillic'] },
    { name: 'Dancing Script', category: 'Handwriting', tags: ['Latin'] }, // Dancing Script 4-7 doesn't support Cyrillic in Google Fonts standard usually, checking.. preserving Latin only to be safe or check later.
];
