# PDF Editor Pro - Ultimate Edition

## Current State
The project has a working browser-based PDF editor with:
- PDF upload via pdf.js rendering
- Text annotation tool (place text anywhere)
- Erase/cover tool (white box overlay)
- Image insertion tool
- Select/move/delete elements
- Undo/redo (Ctrl+Z / Ctrl+Y)
- Zoom & page navigation with thumbnail sidebar
- Drawing tools: highlight, freehand, shapes (rect/ellipse/line/arrow)
- Stamps: APPROVED, DRAFT, CONFIDENTIAL, etc.
- Sticky notes
- Signature pad
- Multi-select, copy/paste, duplicate
- Per-element opacity
- Font family and bold toggle
- PDF export via pdf-lib

Frontend components: PDFEditor.tsx, PDFToolbar.tsx, PDFSidebar.tsx, ThumbnailCanvas.tsx, types/pdf.ts

## Requested Changes (Diff)

### Add
- **AI Erase (Smart Content Removal)**: An AI-powered eraser tool that, when the user brushes over text or image content (including text embedded in images), intelligently removes it and fills with the surrounding background. Uses canvas-based inpainting logic (content-aware fill approximation via browser-side algorithms -- no server calls).
- **Image Editor Mode**: Open any image file (PNG/JPG/WEBP) directly (not just PDFs) and apply all tools to it.
- **Text in Image Editing**: When user selects text inside a rasterized image area, allow in-place replacement of that text region (erase old text, let user type replacement).
- **Crop tool**: Crop entire page or selected image region.
- **Blur/Redact tool**: Blur a selected region (useful for privacy/redaction beyond simple white box).
- **Color picker / eyedropper**: Sample any color on the canvas.
- **Watermark tool**: Add repeating diagonal watermark text across entire page.
- **Page reorder**: Drag-and-drop reorder of pages in the sidebar thumbnail panel.
- **Merge PDFs**: Upload multiple PDFs and merge them into one.
- **Split PDF**: Extract specific page ranges into separate download.
- **Find & Replace text**: Search for text annotations placed in the editor and replace them.
- **Comment/Review mode**: Add comment threads pinned to locations on the page.
- **Form field filling**: Detect and fill existing PDF form fields (text input, checkbox, radio).
- **Dark mode**: Full dark mode UI toggle.
- **Keyboard shortcut overlay**: Press `?` to see all shortcuts.
- **Minimap**: Small overview of current page at bottom-right corner.

### Modify
- Erase tool upgraded to also offer the new AI Erase mode as a sub-mode.
- Toolbar reorganized into logical groups: File, Edit, Annotate, Draw, AI, View.
- Export dialog with options: quality (72/150/300 dpi equivalent), flatten annotations, password-protect PDF.
- Undo/redo stack increased; show history panel.

### Remove
- Nothing removed; all existing features retained.

## Implementation Plan
1. Add `AIErase` canvas brush tool: captures canvas region, runs content-aware fill (patch-match style) client-side, applies result back to canvas layer.
2. Add `ImageEditor` mode at app level: user can open a standalone image file and edit it with all annotation + AI tools, then download as PNG/JPG.
3. Add `CropTool`: draws crop rect on page, on confirm re-renders canvas clipped to selection.
4. Add `BlurTool`: captures selection region, applies box blur via OffscreenCanvas, composites back.
5. Add `WatermarkTool`: renders repeating diagonal text across page canvas layer.
6. Implement page drag-and-drop reorder in sidebar.
7. Add Merge PDF: accept multiple PDFs, combine page lists, render all pages.
8. Add Split PDF: dialog to select page range, export subset.
9. Add Find & Replace for text elements.
10. Add Comment/review system: pin comments to coordinates, show comment panel.
11. Add form field detection (pdf.js `getAnnotations`) and rendering.
12. Add dark mode with CSS variable toggle.
13. Add export dialog with quality and password options.
14. Add undo history panel.
15. Refactor toolbar into grouped sections.
