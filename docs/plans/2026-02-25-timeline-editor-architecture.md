# Timeline Editor Architecture

## Overview

A modern, event-based, NLE (Non-Linear Editor) inspired timeline for Scripture Presenter. It replaces the simple list of slides with a multi-track, multi-layered visual representation of the service flow. The primary goals are operational safety (Preview vs Live), flexibility (nested presentations, event-based audio scopes), and clarity (smart badges).

## 1. Architecture & Layout

- **Drag-Handle Splitter**: The top border of the timeline is draggable to resize its height. State saved in app settings or localStorage so it persists.
- **Tracks**:
  - **Track 1 (Main/Video/Slides)**: The primary sequence of slides, timers, and nested presentations. Uniform slide tiles.
  - **Track 2+ (Audio Scopes)**: Always visible beneath Track 1. Hovering under a slide reveals a slightly visible dotted frame with a '+' icon and text. Clicking it allows adding an audio file from the PC. This area is also a native **System Dropzone** allowing the operator to drag and drop .mp3 files directly from the OS.
- **Scrolling**: Horizontal scrolling for navigating the service time; vertical scrolling if there are many audio tracks or nested presentations.

## 2. Preview vs Live Mode (Blind Mode)

This is the core navigation system protecting the operator from mistakes.

- **Preview Frame (User Theme Color)**: Where the operator clicked. The frame color depends on the user's selected theme in the settings. This slide is shown in the Preview window, and its settings open in the Properties Panel.
- **Live Frame (Red)**: What the congregation sees right now on the projector.
- **Detached Mode Indicator**: If the frames separate, a bright warning icon (e.g., 🔗 broken chain) appears to warn: "You are editing something off-screen."
- **Hotkeys**:
  - **Click**: Move Preview only.
  - **Double Click**: Move Live and Preview to this slide (Take).
  - **Arrows (Left/Right)**: Switch the projector slide (Live) and automatically snap Preview to it, collapsing the detachment.
  - **Ctrl/Cmd + Arrow (Left/Right)**: Change ONLY the Live slide, while Preview remains perfectly still on the originally selected slide.
  - **Enter / Space**: "Take". Send Preview slide to Projector (Live).
  - **Ctrl/Cmd + Enter / Space**: Start a presentation from the first slide, sending it to Live, and jumping Preview to Live as well.
  - **H (Home/Sync)**: Snap Preview back to the red Live slide.

## 3. Universal Slides & Nested Presentations

All elements on the main track are visually uniform tiles.

- **Standard Slides**: Lyrics, pictures, and videos are all standard editable slides with no separation between them.
- **Bible Verse Slides**: Non-editable slides containing Bible text (keeps auto-resizing and uniform design from Bible Mode). You can only change visual properties (multi-translation, multi-verse layout styles) from the SlideDesignPanel / CustomizationPanel.
  - **Modal Integration**: Adding a Bible Verse slide triggers a modal featuring a compact view of the Bible Mode layout. Includes buttons to "Insert as single slide", "Insert slide" (if only one verse is selected), "Insert as [X] slides", or "Cancel".
- **Nested Presentations**: Whole presentations imported into the current Master Presentation (the main service workflow). Nested presentations look like tiles with a "stack" icon and a `[+]` button. They are added by drag-and-drop from the PC (which auto-converts them to `.ekt`) or added via the Presentations Menu (`Add to Timeline` icon button).
  - **Expansion**: Clicking `[+]` smoothly slides the child slides out *inline* on the same timeline track, right after the nested tile.
  - **Linked Badge**: Slides belonging to a linked nested presentation feature a special color accent (like a purple/blue border or 🔗 icon, similar to Figma instances). This tells the operator that edits here will alter the global library `.ekt` file, affecting future services.
  - **Detach Instance (Unlink)**: Context menu action inside the nested presentation to "Detach". This converts the nested presentation into standard, disconnected slides within the current Master Workflow, protecting the original `.ekt` library file from unwanted changes.

## 4. Event-Based Audio Tracks

Audios on the timeline are *event-based*, not *time-based*. The visual length of an audio clip represents *which slides the song plays under*, not its rigid time duration.

- **Start**: When the projector shows Slide 1 (start of scope), audio fades in.
- **Hold**: While the operator clicks around inside the "Slide 1 -> Slide 2 -> Slide 3" zone, the track plays seamlessly.
- **Finish**: When the operator clicks Slide 4 (exiting the scope), the system smoothly fades out the music.
- **End of Track**: If the track finishes before the scope ends, it falls to silence or restarts with a crossfade effect if Loop is defined in Properties. The operator can define the crossfade effect for loops.
- **Transitions**: Adjacent audio blocks display a Crossfade (X) icon at the junction. Users can define custom audio transitions even when there is no other audio clip immediately following (custom fade-outs/fade-ins).
- **Properties**: Clicking an audio block opens Volume, Waveform Trim, and Fade settings in the Properties Panel.

### Background Playlists (No-Hands Mode)

- **Timers/Breaks**: Operators don't stretch audio under Timers. Instead, they click the Timer, go to the Properties Panel, and add tracks to the "Background Audio" playlist. When the Timer goes live, the playlist plays. If the Timer ends, the music fades out.
- **Auto-Advance (Slide-Show)**: Selected via Properties Panel (e.g., "Auto-transition: 5 sec"), slides automatically advance, while background music plays independently.

## 5. Smart Badges System (Timeline Indicators)

Essential information visible at a glance without clutter.

- **Override Indicator (* or curve icon)**: Shows between slides if the user disabled "Global Transition" and set a unique one.
- **Loop Indicator (🔁)**: Shows on an audio block if looping is enabled.
- **Auto-Advance Indicator (⏱️)**: Shows on slides with an auto-advance timer.

## 6. Toolbar & Blocks

The UI includes a quick add toolbar featuring only:

- **Blank/Custom (+)**: Only an empty slide `+` button natively lives in the timeline toolbar. Other blocks are managed elsewhere (e.g. dragging in nested presentations or opening modal elements).
