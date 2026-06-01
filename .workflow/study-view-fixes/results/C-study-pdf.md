# Packet C: Study/PDF

Status: integrated.

Findings from the read-only lane were applied:

- StudyView now supports multiple PDF documents per learning book.
- PDF records include blob, extracted text, classification, processing status, page metadata, and viewer state.
- Users can add PDFs, switch active PDFs, and remove the current PDF.
- The active document is restored on refresh.
- PDF object URLs are cached by document ID to avoid react-pdf reset loops under React StrictMode.

