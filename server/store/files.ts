/**
 * Binary document storage. Local disk today; the interface is the seam for
 * S3 (put/get/delete by key) when the service moves to multi-instance.
 */
import fs from "node:fs";
import path from "node:path";

const SAFE = /^[A-Za-z0-9_-]{1,80}$/;

export function createFileStore(root: string) {
  fs.mkdirSync(root, { recursive: true });

  const pathFor = (userId: string, documentId: string) => {
    if (!SAFE.test(userId) || !SAFE.test(documentId)) throw new Error("Invalid storage key");
    return path.join(root, userId, `${documentId}.pdf`);
  };

  return {
    async put(userId: string, documentId: string, data: Buffer) {
      const target = pathFor(userId, documentId);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.writeFile(target, data);
    },
    pathFor,
    exists(userId: string, documentId: string) {
      return fs.existsSync(pathFor(userId, documentId));
    },
    async remove(userId: string, documentId: string) {
      await fs.promises.rm(pathFor(userId, documentId), { force: true });
    },
  };
}

export type FileStore = ReturnType<typeof createFileStore>;
