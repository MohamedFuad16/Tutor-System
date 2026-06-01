# Packet D: Revision/Library

Status: integrated.

Findings from the read-only lane were applied:

- Revision opens generated learning books by global active book ID.
- The Library view dedupes General Study and no longer deletes learning books during startup.
- Deleting a learning book also deletes linked documents and book chat thread data.
- Opening a generated book updates Study and Chat context through the shared store.

