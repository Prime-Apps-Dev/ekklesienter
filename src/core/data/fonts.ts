
export interface FontDefinition {
    name: string;
    category: 'Sans Serif' | 'Serif' | 'Display' | 'Handwriting' | 'System';
    tags: ('Latin' | 'Cyrillic')[];
    source: 'bundled' | 'system';
    weights?: { name: string; value: string }[];
}

export const AVAILABLE_FONTS: FontDefinition[] = [
    { name: 'Inter', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }, { name: 'Medium', value: '500' }, { name: 'Bold', value: '700' }] },
    { name: 'Roboto', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Montserrat', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }, { name: 'Medium', value: '500' }, { name: 'Bold', value: '700' }] },
    { name: 'Open Sans', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Fira Sans', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'PT Sans', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Nunito', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Ubuntu', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Raleway', category: 'Sans Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Playfair Display', category: 'Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Merriweather', category: 'Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Lora', category: 'Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }, { name: 'Bold', value: '700' }] },
    { name: 'PT Serif', category: 'Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Cormorant Garamond', category: 'Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Alice', category: 'Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Oswald', category: 'Display', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Comfortaa', category: 'Display', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Lobster', category: 'Display', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Caveat', category: 'Display', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
    { name: 'Crimson Pro', category: 'Serif', tags: ['Latin', 'Cyrillic'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }, { name: 'Italic', value: '400 italic' }, { name: 'Semi Bold', value: '600' }, { name: 'Bold', value: '700' }] },
    { name: 'Dancing Script', category: 'Handwriting', tags: ['Latin'], source: 'bundled', weights: [{ name: 'Regular', value: '400' }] },
];
