import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SOURCE_FILES, ZIP_HREF, ZIP_NAME } from "./sourceFiles";

export function SourcePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState<"file" | "all" | null>(null);
  const file = SOURCE_FILES[active]!;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  async function copy(text: string, kind: "file" | "all"): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="source-title"
      className="h-[min(84dvh,760px)] w-[min(calc(100%-1.5rem),64rem)] max-w-5xl border border-line bg-surface p-0 text-fg"
      onClose={onClose}
    >
      <div className="flex h-full overflow-hidden">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-line md:block">
          <p id="source-title" className="px-3 py-3 font-mono text-xs tracking-widest text-muted">
            SOURCE
          </p>
          <nav aria-label="Source files">
            {SOURCE_FILES.map((item, i) => (
              <button
                key={item.path}
                type="button"
                className={`block w-full truncate px-3 py-2 text-left font-mono text-xs ${
                  i === active ? "bg-bg text-fg" : "text-muted hover:bg-bg/60 hover:text-fg"
                }`}
                onClick={() => setActive(i)}
              >
                {item.path.replace(/^src\//, "")}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            <select
              className="min-w-0 flex-1 rounded-md border border-line bg-bg px-2 py-1 font-mono text-xs text-fg md:hidden"
              value={active}
              onChange={(e) => setActive(Number(e.target.value))}
              aria-label="Source file"
            >
              {SOURCE_FILES.map((item, i) => (
                <option key={item.path} value={i}>
                  {item.path.replace(/^src\//, "")}
                </option>
              ))}
            </select>
            <p className="hidden min-w-0 flex-1 truncate font-mono text-xs text-muted md:block">
              {file.path}
            </p>
            <Button size="sm" variant="secondary" onClick={() => void copy(file.content, "file")}>
              {copied === "file" ? "Copied" : "Copy file"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void copy(
                  SOURCE_FILES.map((f) => `// ===== ${f.path} =====\n${f.content}`).join("\n\n"),
                  "all",
                )
              }
            >
              {copied === "all" ? "Copied" : "Copy all"}
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={ZIP_HREF} download={ZIP_NAME}>
                Zip
              </a>
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </header>
          <pre className="min-h-0 flex-1 overflow-auto bg-bg p-4 font-mono text-xs leading-relaxed text-fg">
            {file.content}
          </pre>
        </div>
      </div>
    </dialog>
  );
}
