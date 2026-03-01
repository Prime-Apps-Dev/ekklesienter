# Design Document: Rich Fills & Strokes System

## Overview

A comprehensive overhaul of the styling system to support professional-grade visual compositions, advanced effects, and rich media controls, matching industry-standard design tools like Figma.

## Core Features

### 1. Multi-Layer Styling Architecture

- **Layer Stacks**: Each Canvas Item (Text, Shape, etc.) and the Slide Background will support an array of `Fills` and `Strokes`.
- **Blending Modes**: Full support for standard blending (Normal, Multiply, Screen, Overlay, etc.) between layers using `mix-blend-mode`.
- **Opacity**: Individual opacity control (0-100%) for every layer in the stack.

### 2. Advanced Effects & Compositing

- **Noise Layer**: A specialized Fill type for procedural grain and texture overlays.
- **Glassmorphism (Figma Glass)**: Dedicated 'Effects' block supporting Backdrop Blur, combined with subtle Noise and Inner Stroke for a premium frosted glass look.
- **Layer Reordering**: Drag-and-drop layer management in the design panel.

### 3. Dynamic Media & Professional Grade Adjustments

- **Precise Color Adjustments**: High-precision sliders for:
  - **Tone**: Exposure, Brightness, Contrast.
  - **Color**: Saturation, Vibrance, Hue-rotate.
  - **Atmosphere**: Blur, Dimming (Solid Color + Opacity).
- **Playback Engine**:
  - Variable speed control (0.5x to 2x).
  - Per-layer Loop and Auto-play lifecycle management.
- **Framing & Zoom**:
  - Layout modes: 'Fit', 'Fill', 'Tile'.
  - Manual 'Scale' slider for zooming into media within its frame.

## Technical Architecture

### Data Model (`types.ts`)

Transition to an `IStyleLayer[]` approach for `background` and `strokeBackground` properties.

Introduce comprehensive text properties in `ITextProperties`:

```typescript
export type TextResizingMode = 'auto-width' | 'auto-height' | 'fixed' | 'shrink-to-fit';
export type TextAlignHorizontal = 'left' | 'center' | 'right' | 'justify';
export type TextAlignVertical = 'top' | 'middle' | 'bottom';
export type TextCaseStyle = 'none' | 'uppercase' | 'lowercase' | 'titlecase';
export type UnderlineStyle = 'straight' | 'wavy';
export type UnderlineDecorationSkip = 'none' | 'ink';

export type ListType = 'none' | 'disc' | 'circle' | 'square' | 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';

export interface ITextProperties {
  fontFamily: string;
  fontWeight: string | number;
  fontSize: number; 
  
  resizingMode: TextResizingMode; // Default: 'shrink-to-fit'
  
  // Formatting
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
  
  alignHorizontal: TextAlignHorizontal;
  alignVertical: TextAlignVertical;
  
  listType?: ListType;
}
```

### Rendering Engine

- **CSS Pipeline**: Multi-stage rendering using absolute-positioned layers with `mix-blend-mode` and CSS `filters`.
- **Text Rendering**: Text items use the same `fills` (`IStyleLayer[]`) and `strokes` arrays as shapes. This is achieved via CSS `background-clip: text` and `-webkit-text-fill-color: transparent` for fills, and `-webkit-text-stroke` or filtered shadows for strokes. The container bounding box is styled separately from the text content.
- **Background Pipeline**: Integrated `backdrop-filter` for global and per-item glass effects.

### UI/UX

- **Adjustment Bento**: A compact but precise grid of sliders in the `BackgroundPicker` and Design Panel.
- **Visual Stack UI**: A list-based layer manager with thumbnails and blending indicators.

## Success Criteria

- Users can create complex composite styles (e.g., Video + Gradient Overlay + Noise + Glassmorphism) on any element.
- Performance remains fluid on both operator and projector screens.
- Interface remains professional and high-density, following the Figma aesthetic.
