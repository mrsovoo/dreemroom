import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
};

/** Kompyuterda markazdagi oyna, telefonda pastdan chiqadigan ilova sheet'i. */
export default function Sheet({ title, children, onClose, wide = false }: Props) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && (window.matchMedia("(max-width: 800px)").matches || document.body.classList.contains("in-telegram")),
  );

  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const sync = () => setIsMobile(query.matches || document.body.classList.contains("in-telegram"));
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    const originalPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const app = document.getElementById("root");
    document.body.style.overflow = "hidden";
    if (scrollbar) document.body.style.paddingRight = `${scrollbar}px`;
    if (app) {
      app.inert = true;
      app.setAttribute("aria-hidden", "true");
    }

    const frame = requestAnimationFrame(() => {
      const initial = dialog.current?.querySelector<HTMLElement>("[data-autofocus]");
      (initial || dialog.current)?.focus();
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialog.current)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPadding;
      if (app) {
        app.inert = false;
        app.removeAttribute("aria-hidden");
      }
      document.removeEventListener("keydown", handleKey);
      opener?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <motion.div
      className={`overlay ${isMobile ? "overlay-sheet" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <motion.section
        ref={dialog}
        className={`dialog ${wide ? "dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={isMobile ? { y: "100%" } : { y: 18, opacity: 0 }}
        animate={isMobile ? { y: 0 } : { y: 0, opacity: 1 }}
        exit={isMobile ? { y: "100%" } : { y: 14, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="dialog-head">
          <span className="sheet-grabber" aria-hidden="true" />
          <h2 id={titleId}>{title}</h2>
          <button className="dialog-close" aria-label="Oynani yopish" onClick={onClose}>
            <X size={19} strokeWidth={1.6} />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
