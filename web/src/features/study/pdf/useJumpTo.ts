/** Honours citation / guide `jumpTo` page requests for a document and times the page flash that marks them. */
import { useEffect, useState, type RefObject } from "react";
import { useApp } from "@/store/app";

export const FLASH_MS = 1200;

/** Jump requests already honoured, so a remount never replays a stale one. */
let handledJumpNonce = 0;

/**
 * Citation chips / guide sources ask for a page via `jumpTo`. Returns the
 * active flash key (the request nonce), or 0 once the flash has run.
 */
export function useJumpTo(
  documentId: string,
  goTo: (page: number) => void,
  restoredRef: RefObject<boolean>,
  numPages: number,
) {
  const jumpTo = useApp((state) => state.jumpTo);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    if (!jumpTo || jumpTo.documentId !== documentId || jumpTo.nonce === handledJumpNonce) return;
    handledJumpNonce = jumpTo.nonce;
    restoredRef.current = true; // an explicit jump beats "resume where you left off"
    goTo(jumpTo.page);
    setFlash(jumpTo.nonce);
  }, [jumpTo, documentId, goTo, restoredRef]);

  useEffect(() => {
    if (!flash || !numPages) return;
    const timer = window.setTimeout(() => setFlash(0), FLASH_MS + 150);
    return () => window.clearTimeout(timer);
  }, [flash, numPages]);

  return flash;
}
