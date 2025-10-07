import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import PreviewOverlay from "../components/PreviewOverlay";

export type PreviewType = "image" | "svg" | "markdown" | "text";

export interface OpenPreviewArgs {
  url: string;
  mimeType: string;
  filename?: string;
}

interface CtxValue {
  openPreview: (args: OpenPreviewArgs) => void;
  closePreview: () => void;
}

const PreviewOverlayContext = createContext<CtxValue | undefined>(undefined);

const getExt = (name?: string) => {
  if (!name) return "";
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.substring(idx + 1).toLowerCase() : "";
};

const detectType = (args: OpenPreviewArgs): PreviewType => {
  const { mimeType, filename } = args;
  const ext = getExt(filename);
  const isSvg = mimeType === "image/svg+xml" || ext === "svg";
  const isMarkdown =
    /markdown/.test(mimeType) || ext === "md" || ext === "markdown";
  const isImage = mimeType.startsWith("image/") || isSvg;
  if (isMarkdown) return "markdown";
  if (isSvg) return "svg";
  if (isImage) return "image";
  return "text";
};

export const PreviewOverlayProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<OpenPreviewArgs | null>(null);
  const [type, setType] = useState<PreviewType | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const closePreview = useCallback(() => {
    setOpen(false);
    setArgs(null);
    setType(null);
    setText("");
    setLoading(false);
  }, []);

  const openPreview = useCallback(async (next: OpenPreviewArgs) => {
    if (!next?.url) return;
    const t = detectType(next);
    setArgs(next);
    setType(t);

    if (t === "text" || t === "markdown") {
      setLoading(true);
      try {
        const resp = await fetch(next.url, { credentials: "omit" });
        const content = await resp.text();
        setText(content);
      } catch (e) {
        console.error("Failed to load preview content", e);
        setText("Failed to load preview content.");
      } finally {
        setLoading(false);
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  }, []);

  const value = useMemo<CtxValue>(
    () => ({ openPreview, closePreview }),
    [openPreview, closePreview],
  );

  return (
    <PreviewOverlayContext.Provider value={value}>
      {children}
      {open &&
        args &&
        type &&
        createPortal(
          <PreviewOverlay
            open={open}
            title={args.filename}
            type={type}
            url={args.url}
            text={text}
            loading={loading}
            onClose={closePreview}
          />,
          document.body,
        )}
    </PreviewOverlayContext.Provider>
  );
};

export const usePreviewOverlay = (): CtxValue => {
  const ctx = useContext(PreviewOverlayContext);
  if (!ctx)
    throw new Error(
      "usePreviewOverlay must be used within a PreviewOverlayProvider",
    );
  return ctx;
};
