# Packet A: Data Model and Persistence

Status: integrated.

Findings from the read-only lane were applied:

- Added durable `learningDocuments` and `bookChatThreads` tables in Dexie v7.
- Added stable book, conversation, and document IDs to persisted learning records.
- Preserved `book:general-study` as the default General Study identity instead of creating a new session-derived book for every app start.
- Persisted `activeDocumentId` alongside `activeLearningBookId` for refresh restoration.

