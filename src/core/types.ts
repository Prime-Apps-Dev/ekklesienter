export interface Translation {
  id: string; // e.g., 'KJV', 'WEB', 'RST'
  name: string; // e.g., 'King James Version'
  language: string; // e.g., 'en', 'ru'
  version?: string;
}

export interface Verse {
  id?: number; // Added for IndexedDB
  translationId: string; // FK to Translation
  bookId: string;
  chapter: number;
  verseNumber: number;
  text: string; // Markdown supported
}

export interface Book {
  id?: number; // Auto-increment PK for IndexedDB
  bookId: string; // Generic Book ID (GEN, EXO)
  translationId: string; // Books might have translated names
  name: string;
  chapters: number[];
}

export interface BibleData {
  translation: Translation;
  books: Book[];
  verses: Verse[];
}

export interface NavigationState {
  currentBookId: string;
  currentChapter: number;
  activeVerseIndex: number; // Index within the filtered verses of current chapter
}

// For UI state managed by Jotai
export type ThemeMode = 'light' | 'dark';
export type AppMode = 'scripture' | 'presentation';
export type PresentationMode = 'normal' | 'fullscreen';

// --- Presentation Slide System Types ---

export type TransitionType = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';

export interface IAudioAttachment {
  filename: string;
  path: string;
}

export interface ISlideContent {
  variables: Record<string, string>;
  customLayers?: any[]; // For future use
}

export interface ISlide {
  id: string;
  order: number;
  blockId: string;
  templateId: string;
  content: ISlideContent;
  audio?: IAudioAttachment;
  duration?: number;
  transition?: TransitionType;
}

export interface IBlock {
  id: string;
  name: string;
  nameRu: string;
  icon: string;
  color: string;
  description: string;
  defaultSlides: number;
}

export interface ISection {
  id: string;
  name: string;
  nameRu: string;
  description?: string;
  blockIds: string[]; // Order of blocks in this section
}

export interface IWorkflowFolder {
  id: string;
  name: string;
  nameRu: string;
  parentId?: string; // For nesting
}

export interface IWorkflow {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  sectionIds: string[]; // Order of sections in this workflow
  folderId?: string; // Reference to IWorkflowFolder
}

export interface IPresentationFile {
  id: string;
  name: string;
  workflowId?: string;
  createdAt: Date;
  updatedAt: Date;
  slides: ISlide[];
  metadata?: {
    church?: string;
    date?: Date;
    speaker?: string;
  };
}

export interface ITemplate {
  id: string;
  name: string;
  nameRu: string;
  category: string; // Link to block type
  thumbnail: string;
  isUserCreated: boolean;
  structure: any; // We'll refine this later
}

// --- Presentation Customization Types ---

export type BackgroundType = 'color' | 'gradient' | 'image' | 'video';
export type MediaSource = 'unsplash' | 'pexels' | 'local' | 'youtube';

export interface BackgroundSettings {
  type: BackgroundType;
  color?: string;
  gradient?: {
    from: string;
    to: string;
    angle: number;
  };
  image?: {
    url: string;
    source: MediaSource;
    id?: string;
    alt?: string;
    author?: string;
  };
  video?: {
    url: string;
    source: MediaSource;
    id?: string;
    isMuted: boolean;
    isLooping: boolean;
  };
  blur?: number;
}

export interface FontSettings {
  family: string;
  weight: string;
  size: number; // rem
  color: string;
  shadow: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  showSuperscript?: boolean;
}

export interface ReferenceStyleSettings {
  style: 'classic' | 'modern' | 'minimal' | 'accent' | 'pill' | 'outline' | 'brackets' | 'underline' | 'ribbon' | 'hidden';
  position: 'top' | 'bottom';
  opacity: number;
  scale: number;
  fontSize?: number; // rem, if undefined use relative scale
  color?: string;
  fontFamily?: string;
}

export interface TranslationLabelSettings {
  enabled: boolean;
  color: string;
  opacity: number;
  fontSize: number; // rem
  fontFamily: string;
}

export interface DisplaySettings {
  autoDefine: boolean;
  presenterDisplayId?: number;
  previewDisplayId?: number;
  aspectRatio?: number; // width / height
  cornerRadius?: number; // px, 0-48
  referenceGap?: number; // px, gap between verse and reference
  translationGap?: number; // px, gap between label and verse
  verseGap?: number; // px, gap between two verses
  padding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface PresenterSettings {
  background: BackgroundSettings;
  font: FontSettings;
  reference: ReferenceStyleSettings;
  translationLabel: TranslationLabelSettings;
  display: DisplaySettings;
}