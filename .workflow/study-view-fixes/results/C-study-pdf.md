# Packet C: Study/PDF

Status: integrated.

Findings from the read-only lane were applied:

- StudyView now supports multiple PDF documents per learning book.
- PDF records include blob, extracted text, classification, processing status, page metadata, and viewer state.
- Users can add PDFs, switch active PDFs, and remove the current PDF.
- The active document is restored on refresh.
- PDF object URLs are cached by document ID to avoid react-pdf reset loops under React StrictMode.

## Compact PDF Toolbar Follow-up

- Reduced the desktop and mobile document rail to 28px.
- Reduced PDF chips and the dashed add control to 20px.
- Kept PDF titles on a white surface with black text and a compact remove button.
- Removed toolbar, chip, add-control, and Study reader shell shadows.
- Kept the toolbar as a non-floating sibling above an explicitly clipped PDF reader region so it cannot cover the document.
- Added rendered coverage that asserts the toolbar precedes the PDF reader region in document flow.
- Live geometry checks passed at 1280x800 and 390x844 with two PDFs, a working add control, zero toolbar/PDF overlap, zero horizontal overflow, and zero console issues.
