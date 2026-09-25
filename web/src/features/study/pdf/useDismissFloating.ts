/** Closes the selection menu and annotation popover on an outside press, Escape or a window resize. */
import { useEffect, type RefObject } from "react";

export function useDismissFloating(
  open: boolean,
  menuRef: RefObject<HTMLDivElement | null>,
  popoverRef: RefObject<HTMLDivElement | null>,
  setMenu: (menu: null) => void,
  setPopover: (popover: null) => void,
) {
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setMenu(null);
      setPopover(null);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (menuRef.current?.contains(target) || popoverRef.current?.contains(target))) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.getSelection()?.removeAllRanges();
      close();
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [open, menuRef, popoverRef, setMenu, setPopover]);
}
