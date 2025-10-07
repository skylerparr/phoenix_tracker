import React from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { FileUpload } from "../models/FileUpload";
import { uploadService } from "../services/UploadService";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface UploadItemProps {
  upload: FileUpload;
  onDeleted?: (id: number) => void;
}

const UploadItem: React.FC<UploadItemProps> = ({ upload: u, onDeleted }) => {
  const isImage = u.mimeType.startsWith("image/");

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete "${u.originalFilename}"? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await uploadService.deleteUpload(u.id);
      if (onDeleted) onDeleted(u.id);
    } catch (e) {
      console.error("Failed to delete upload", e);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handleDownload = async () => {
    if (!u.fullUrl) {
      alert("Download URL is unavailable.");
      return;
    }
    try {
      const resp = await fetch(u.fullUrl, { credentials: "omit" });
      if (!resp.ok) throw new Error(`Download failed with ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const filename = u.originalFilename || `file-${u.id}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Failed to download upload", e);
      alert("Failed to download file. Please try again.");
    }
  };

  return (
    <Box sx={{ width: 160 }}>
      <Box
        sx={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          p: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 64,
          backgroundColor: "#fafafa",
          overflow: "hidden",
          position: "relative",
          "&:hover .delete-btn": {
            opacity: 1,
            transform: "translateY(0)",
            pointerEvents: "auto",
          },
          "&:hover .download-btn": {
            opacity: 1,
            transform: "translateY(0)",
            pointerEvents: "auto",
          },
        }}
      >
        {isImage && u.fullUrl ? (
          <Box
            component="img"
            src={u.fullUrl}
            alt={u.originalFilename}
            loading="lazy"
            sx={{
              maxWidth: "100%",
              maxHeight: 64,
              objectFit: "contain",
              borderRadius: "4px",
              display: "block",
            }}
          />
        ) : (
          <Typography
            variant="caption"
            sx={{ color: "#555", textAlign: "center", wordBreak: "break-word" }}
          >
            {u.mimeType}
          </Typography>
        )}
        <Tooltip title="Download">
          <IconButton
            className="download-btn"
            aria-label="Download attachment"
            size="small"
            onClick={handleDownload}
            sx={{
              position: "absolute",
              right: 36,
              bottom: 6,
              bgcolor: "#e3f2fd",
              color: "#1976d2",
              borderRadius: "50%",
              boxShadow: 1,
              opacity: 0,
              transform: "translateY(4px)",
              transition: "opacity 0.15s ease, transform 0.15s ease",
              pointerEvents: "none",
              "&:hover": { bgcolor: "#bbdefb" },
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 24 24"
              sx={{ width: 18, height: 18, display: "block" }}
            >
              <path d="M5 20h14v-2H5v2z" fill="currentColor" />
              <path d="M14 10h-4v4H8l4 4 4-4h-2v-4z" fill="currentColor" />
            </Box>
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            className="delete-btn"
            aria-label="Delete upload"
            size="small"
            onClick={handleDelete}
            sx={{
              position: "absolute",
              right: 6,
              bottom: 6,
              bgcolor: "#ffebee",
              color: "#d32f2f",
              borderRadius: "50%",
              boxShadow: 1,
              opacity: 0,
              transform: "translateY(4px)",
              transition: "opacity 0.15s ease, transform 0.15s ease",
              pointerEvents: "none",
              "&:hover": { bgcolor: "#ffcdd2" },
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 24 24"
              sx={{ width: 18, height: 18, display: "block" }}
            >
              <path
                d="M9 3h6l1 2h3v2H5V5h3l1-2zm-1 6h2v9H8V9zm4 0h2v9h-2V9z"
                fill="currentColor"
              />
            </Box>
          </IconButton>
        </Tooltip>
      </Box>
      <Typography
        variant="body2"
        sx={{
          mt: 0.5,
          fontWeight: 500,
          color: "#333",
          wordBreak: "break-word",
        }}
      >
        {u.originalFilename}
      </Typography>
      <Typography variant="caption" sx={{ color: "#666" }}>
        {formatBytes(u.sizeBytes)}
      </Typography>
    </Box>
  );
};

export default UploadItem;
