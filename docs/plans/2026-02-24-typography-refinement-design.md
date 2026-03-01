# Typography Refinement Design

Refine text styling controls in the `SlideDesignPanel` to match Figma-style property editing while maintaining professional-grade type management.

## Goals

1. **Custom Font Selector**: A floating, searchable popover in the Typography section.
2. **Weight/Style Selector**: A dedicated dropdown for font weights (Regular, Bold, etc.).
3. **Bold Shortcut**: A "B" button to force bold styling even on fonts with limited native weights.
4. **Native Weight Support**: Map system font styles (from `queryLocalFonts`) to the UI.

## Components

### 1. `FontPickerPopover`

* Reuses logic from `FontPicker.tsx`.
* Prop-driven: `value`, `onSelect`.
* Searchable with highlighting.
* Categorized: Bundled vs System.

### 2. `FontWeightPicker`

* Displays available styles for the current font.
* For **Bundled Fonts**: Uses a predefined list of standard weights (Regular, Medium, Bold, Black).
* For **System Fonts**: Aggregates `FontData.style` values returned by the browser.
* Interaction: Floating popover triggered by clicking the weight name.

### 3. `StyleShortcuts`

* Standalone toggles for **Bold** ($B$) and **Italic** ($I$).
* **Bold Button**: Toggles `fontWeight` between `400` (or 'normal') and `700` (or 'bold').

## Data Flow

* **Reading**: `getSelectionValue` extracts current `fontFamily` and `fontWeight`.
* **Writing**: `updateCanvasItems` (batch) applies changes across the selection.
* **Preview**: `fontPreviewFamilyAtom` and a new `fontPreviewWeightAtom` for live hover feedback.

## Specific Figma Mapping

In Figma, the "Font Style" dropdown typically contains weights and slants. We will follow this for the weight selector:

* Regular
* Italic
* Bold
* Bold Italic
* Black
* ...etc.

Ready to set up for implementation?
Make this video static and just small dust is on the sunbeam and the carpets and scarfs are waving a little on the wind. Make leaves and bushes and foliage on the trees to waves a little on the small wind
