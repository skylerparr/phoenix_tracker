import React, { useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";

import { PreviewType } from "../context/PreviewOverlayContext";
interface Props {
  open: boolean;
  title?: string;
  type: PreviewType;
  url?: string;
  text?: string;
  loading?: boolean;
  onClose: () => void;
}

const PreviewOverlay: React.FC<Props> = ({
  open,
  title,
  type,
  url,
  text,
  loading,
  onClose,
}) => {
  const [zoomed, setZoomed] = useState(false);
  if (!open) return null;

  const onBackdropClick = () => onClose();

  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onBackdropClick}
        sx={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 2000,
        }}
      />

      {/* Modal content */}
      <Box
        role="dialog"
        aria-modal
        sx={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "95vw",
          height: "95vh",
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: 24,
          zIndex: 2001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.5,
            borderBottom: "1px solid #eee",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              mr: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "#222",
            }}
          >
            {title}
          </Typography>
          <IconButton aria-label="Close preview" onClick={onClose}>
            <Box
              component="svg"
              viewBox="0 0 24 24"
              sx={{ width: 22, height: 22 }}
            >
              <path
                d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.3-6.3 6.29 1.42 1.42 6.29-6.3 6.3 6.3 1.41-1.42-6.3-6.29 6.3-6.3-1.41-1.41z"
                fill="currentColor"
              />
            </Box>
          </IconButton>
        </Box>
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fafafa",
            p: 2,
          }}
        >
          {loading ? (
            <Typography variant="body2" sx={{ color: "#666" }}>
              Loading...
            </Typography>
          ) : type === "image" || type === "svg" ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: zoomed ? "auto" : "hidden",
              }}
            >
              <Box
                component="img"
                src={url}
                alt={title}
                onClick={() => setZoomed((z) => !z)}
                sx={{
                  cursor: zoomed ? "zoom-out" : "zoom-in",
                  maxWidth: zoomed ? "none" : "100%",
                  maxHeight: zoomed ? "none" : "100%",
                  width: zoomed ? "auto" : undefined,
                  height: zoomed ? "auto" : undefined,
                  objectFit: zoomed ? "unset" : "contain",
                  display: "block",
                }}
              />
            </Box>
          ) : type === "markdown" ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                overflow: "auto",
                backgroundColor: "#fff",
              }}
            >
              <MDEditor.Markdown
                source={text || ""}
                remarkPlugins={[remarkGfm]}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                overflow: "auto",
                backgroundColor: "#fff",
                p: 2,
              }}
            >
              <Typography
                component="p"
                sx={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "#111",
                }}
              >
                {text}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

export default PreviewOverlay;
