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
  variables: Record<string, string | number>;
  canvasItems?: ICanvasItem[];
}

// Canvas Item types for WYSIWYG slide editor
export type CanvasItemType = 'text' | 'image' | 'video' | 'shape' | 'stroke' | 'effect';
export type ShapeType = 'rect' | 'circle' | 'triangle' | 'star' | 'diamond';
export type EffectType = 'glow' | 'shadow' | 'blur' | 'vignette';

export type TextResizingMode = 'auto-width' | 'auto-height' | 'fixed' | 'shrink-to-fit';
export type TextAlignHorizontal = 'left' | 'center' | 'right' | 'justify';
export type TextAlignVertical = 'top' | 'middle' | 'bottom';
export type TextCaseStyle = 'none' | 'uppercase' | 'lowercase' | 'titlecase';
export type UnderlineStyle = 'straight' | 'wavy';
export type UnderlineDecorationSkip = 'none' | 'ink';

export type ListType = 'none' | 'disc' | 'circle' | 'square' | 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';


export interface ICanvasItemText {
  content: string;

  // Base Typography
  fontFamily: string;
  fontWeight: string | number;
  fontSize: number; // px relative to slide (base size before shrink-to-fit)
  color?: string; // Legacy/fallback color, should use textFills ideally

  resizingMode: TextResizingMode;

  // Formatting
  isBold?: boolean;
  isItalic?: boolean;
  isStrikethrough?: boolean;
  textCase?: TextCaseStyle;

  // Sub/Super script
  scriptStyle?: 'none' | 'subscript' | 'superscript';

  // Underline
  isUnderline?: boolean;
  underlineStyle?: UnderlineStyle;
  underlineSkipInk?: UnderlineDecorationSkip;

  // Spacing & Layout
  lineHeight?: number | string;
  letterSpacing?: number | string;
  paragraphSpacing?: number;

  // Alignment
  alignHorizontal: TextAlignHorizontal;
  alignVertical: TextAlignVertical;
  textAlign?: 'left' | 'center' | 'right'; // Legacy fallback

  listType?: ListType;

  // Fills & Strokes applying specifically to the text characters
  textFills?: IStyleLayer[];
  textStrokes?: IStyleLayer[];
}

// Image and Video specific properties have been consolidated into the base ICanvasItem
// via the generic background property.

export interface ICanvasItemShape {
  shapeType: ShapeType;
}

export interface ICanvasItemStroke {
  x2: number;  // end x %
  y2: number;  // end y %
  color: string;
  width: number;
  dashArray?: string;
}

export interface ICanvasItemEffect {
  effectType: EffectType;
  color: string;
  intensity: number;
}

export interface ICanvasItem {
  id: string;
  type: CanvasItemType;
  // Position & size as percentages (0–100) of slide dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale?: number;
  opacity?: number;
  borderRadius?: number;
  borderRadiusTL?: number;
  borderRadiusTR?: number;
  borderRadiusBL?: number;
  borderRadiusBR?: number;
  lockBorderRadius?: boolean;
  fills: IStyleLayer[];
  borderColor?: string;
  borderWidth?: number;
  strokeAlign?: 'inside' | 'center' | 'outside';
  strokes: IStyleLayer[];
  zIndex: number;
  locked: boolean;
  visible: boolean;
  lockAspectRatio?: boolean;
  pivotX?: number; // 0-100%, default 50
  pivotY?: number; // 0-100%, default 50
  backdropBlur?: number;
  dropShadow?: { x: number; y: number; blur: number; color: string };
  // Type-specific data
  text?: ICanvasItemText;
  shape?: ICanvasItemShape;
  stroke?: ICanvasItemStroke;
  effect?: ICanvasItemEffect;
}


export type TimerTriggerType = 'start' | 'finish' | 'remaining' | 'elapsed' | 'percentage';
export type TimerActionType = 'next_slide' | 'play_sound' | 'change_bg' | 'blackout' | 'flash' | 'volume_fade';

export interface ITimerAction {
  id: string;
  type: TimerActionType;
  payload?: any;
}

export interface ITimerTrigger {
  id: string;
  type: TimerTriggerType;
  value: number; // seconds or percentage
  actions: ITimerAction[];
  fired?: boolean; // internal state to prevent double firing
}

export interface ITimerSettings {
  duration: number; // in seconds
  style: 'minimal' | 'digital' | 'circular' | 'neon' | 'bar' | 'flip' | 'modern' | 'dots' | 'glass' | 'bold';
  endAction: 'none' | 'loop' | 'next' | 'blackout';
  showMilliseconds?: boolean;
  prefix?: string;
  suffix?: string;
  themeColor?: string;
  fontSize?: number;
  backgroundOpacity?: number; // 0-1
  triggers?: ITimerTrigger[];
  playlist?: string[]; // Array of media file IDs
}

export interface IAudioScope {
  id: string;
  startSlideId: string;
  endSlideId: string;
  fileId: string;   // Reference to the audio file in the DB or filesystem
  fileName?: string; // Original filename for persistence and auto-repair
  volume: number;   // 0-1
  loop: boolean;
  isMuted?: boolean;
  trimStart?: number; // In seconds
  trimEnd?: number;   // In seconds
  crossfadeSettings?: {
    fadeInDuration: number;
    fadeOutDuration: number;
  };
  volumeFadeDuration?: number; // custom duration for programmatic fades
}

export type SlideType = 'normal' | 'nested' | 'timer';

export interface ISlide {
  id: string;
  type?: SlideType;
  order: number;
  blockId: string;
  templateId: string;
  backgroundOverride?: IStyleLayer[];
  content: ISlideContent;
  audio?: IAudioAttachment; // Legacy attached audio
  audioScopes?: IAudioScope[]; // New event-based audio tracks
  duration?: number;
  transition?: TransitionType;
  linkedPresentationId?: string; // ID of the nested presentation file (Linked global `.ekt` library file)
  localNestedPresentationId?: string; // ID if detached
  masterPresentationId?: string; // ID of the nested presentation file (Legacy)
  isExpanded?: boolean; // UI state for timeline
  timerSettings?: ITimerSettings;
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

export type MediaType = 'image' | 'video' | 'audio';

export interface IMediaItem {
  id: string;
  name: string;
  path: string; // Absolute path or URL
  type: MediaType;
  createdAt: number;
}

export interface IServiceFile {
  id: string;
  name: string;
  nameRu?: string;
  description?: string;
  presentationIds: string[]; // Order of nested presentations
  masterPresentationId: string; // The locked master.ektp ID
  folderId?: string; // Reference to IWorkflowFolder
  version?: string; // Schema version
  engineVersion?: string; // App version that created/saved the file
  createdAt: Date;
  updatedAt: Date;
  lastOpened?: Date;
  fileHandle?: any; // Persistent handle for incremental saves
  metadata?: {
    church?: string;
    date?: Date;
    serviceType?: string;
  };
}

export interface IPresentationFile {
  id: string;
  name: string;
  workflowId?: string;
  serviceId?: string; // Links to IServiceFile if nested
  isMaster?: boolean; // True if it's the master presentation in a service
  version?: string; // Schema version
  engineVersion?: string; // App version that created/saved the file
  createdAt: Date;
  updatedAt: Date;
  lastOpened?: Date;
  fileHandle?: any; // Persistent handle for incremental saves
  thumbnailUrl?: string; // Local blob URL or base64 for the first slide preview
  hasPreview?: boolean; // Flag to indicate if a preview.png exists in the ZIP
  slides: ISlide[];
  audioScopes?: IAudioScope[];
  metadata?: {
    church?: string;
    date?: Date;
    speaker?: string;
  };
}

export interface IEktmpFile extends ITemplate {
  // Same as ITemplate for now, but designated as a file format
}

export interface IPresentationSummary {
  id: string;
  name: string;
  lastOpened: Date;
  type?: 'presentation' | 'service';
}


export interface IAsset {
  id: string;
  type: 'text' | 'image' | 'video' | 'graphics';
  content: string;
  position: { x: number; y: number; w: number; h: number };
  style?: any;
}

export interface ITemplateTextStyle {
  fontFamily?: string;
  color?: string;
  shadow?: string;      // CSS text-shadow value
  titleTransform?: 'uppercase' | 'capitalize' | 'none';
  titleWeight?: string; // e.g. '900', 'bold'
  subtitleColor?: string;
  contentColor?: string;
}

export interface ITemplateSlide {
  id: string; // internal id for the layout/slide
  name?: string;
  nameRu?: string;
  categoryId?: string; // assigned block ID (e.g. 'bible', 'sermon')
  canvasItems: ICanvasItem[];
  backgroundOverride?: IStyleLayer[]; // if this specific layout overrides the theme background
}

export interface ITemplate {
  id: string;
  name: string;
  nameRu: string;
  category: string; // Links to block type (e.g., 'worship', 'sermon')
  background: IStyleLayer[];
  assets: IAsset[];
  structure: { layout: string };
  thumbnail?: string;
  isUserCreated: boolean;
  textStyle?: ITemplateTextStyle;
  canvasItems?: ICanvasItem[];       // Optional canvas items for the base template layout
  templateSlides?: ITemplateSlide[]; // Sub-slides saved within this template
}


// --- Logo Types ---

export interface ILogo {
  id: string;
  name: string;
  url: string; // file:// path, data url, or ObjectURL
  isPreloaded?: boolean;
  isFromDb?: boolean; // true if saved in IndexedDB
  groupId?: string; // Links to ILogoGroup.id if assigned
}

export interface ILogoEntry {
  id: string;
  name: string;
  data: Blob;
  mimeType: string;
}

export interface IBackgroundEntry {
  id: string;
  name: string;
  data: Blob;
  mimeType: string;
}

export interface ILogoGroup {
  id: string;
  name: string;
  nameRu: string;
  logos: ILogo[];
  isUserCreated?: boolean; // true for manually created or folder-imported groups
  folderPath?: string; // Source folder path for re-scanning
}

export interface ILogoSettings {
  activeLogoId: string | null;
  customLogos: ILogo[]; // Ungrouped custom logos
  customGroups: ILogoGroup[]; // User-created groups
  logoGroups: ILogoGroup[]; // Preloaded groups
}

// --- Presentation Customization Types ---

export type BackgroundType = 'color' | 'gradient' | 'image' | 'video';
export type MediaSource = 'unsplash' | 'pexels' | 'local' | 'youtube';

export interface IStyleLayer {
  id: string;
  type: 'color' | 'gradient' | 'image' | 'video' | 'noise';
  visible: boolean;
  opacity: number; // 0-1
  blendMode: string; // CSS mix-blend-mode values
  color?: string;
  gradient?: {
    type?: 'linear' | 'radial' | 'conic';
    from: string;
    to: string;
    angle: number;
    cssGradient?: string;
    stops?: { offset: number; color: string }[];
  };
  image?: {
    url: string;
    source: MediaSource;
    id?: string;
    alt?: string;
    author?: string;
    isFromDb?: boolean;
  };
  video?: {
    url: string;
    source: MediaSource;
    id?: string;
    thumbnail?: string;
    isMuted: boolean;
    isLooping: boolean;
    isFromDb?: boolean;
  };
  adjustments?: {
    brightness: number;
    contrast: number;
    exposure: number;
    saturation: number;
    vibrance: number;
    hue: number;
    blur: number;
    dimmingColor?: string;
    dimmingOpacity?: number; // 0-1
  };
  media?: {
    speed?: number;
    isLooping?: boolean;
    isMuted?: boolean;
    framing?: 'fit' | 'fill' | 'tile' | 'stretch';
    scale?: number; // For manual zoom
  };
}

export interface BackgroundSettings {
  type: BackgroundType;
  color?: string;
  gradient?: {
    from: string;
    to: string;
    angle: number;
    cssGradient?: string; // Full CSS gradient string for multi-stop gradients
  };
  image?: {
    url: string;
    source: MediaSource;
    id?: string;
    alt?: string;
    author?: string;
    isFromDb?: boolean;
  };
  video?: {
    url: string;
    source: MediaSource;
    id?: string;
    thumbnail?: string;
    isMuted: boolean;
    isLooping: boolean;
    isFromDb?: boolean;
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

// --- Override Types ---

export interface OverrideSettings {
  background: IStyleLayer[];
}


export interface PresenterSettings {
  background: IStyleLayer[];
  font: FontSettings;
  reference: ReferenceStyleSettings;
  translationLabel: TranslationLabelSettings;
  display: DisplaySettings;
  logo: ILogoSettings;
  audio: {
    defaultFadeDuration: number;
  };
  overrides: {
    blackout: OverrideSettings;
    whiteout: OverrideSettings;
    logo: OverrideSettings;
  };
}