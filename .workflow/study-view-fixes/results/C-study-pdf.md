# Packet C: Study/PDF

Status: integrated.

Findings from the read-only lane were applied:

- StudyView now supports multiple PDF documents per learning book.
- PDF records include blob, extracted text, classification, processing status, page metadata, and viewer state.
- Users can add PDFs, switch active PDFs, and remove the current PDF.
- The active document is restored on refresh.
- PDF object URLs are cached by document ID to avoid react-pdf reset loops under React StrictMode.

## Compact PDF Toolbar Follow-up

- Reduced the desktop and mobile document rail to 32px.
- Reduced PDF chips and the dashed add control to 24px.
- Kept PDF titles on a white surface with black text and a compact remove button.
- Removed chip and Study reader shell shadows.
- Kept the toolbar in normal layout flow above a clipped PDF region so it cannot cover the document.
- Browser geometry checks passed at 1280x720 and 390x844 with zero toolbar/PDF overlap and zero horizontal overflow.
