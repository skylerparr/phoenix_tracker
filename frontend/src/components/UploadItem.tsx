import React from "react";
import { Box, Typography } from "@mui/material";
import { FileUpload } from "../models/FileUpload";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface UploadItemProps {
  upload: FileUpload;
}

const UploadItem: React.FC<UploadItemProps> = ({ upload: u }) => {
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
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#555", textAlign: "center", wordBreak: "break-word" }}
        >
          {u.mimeType}
        </Typography>
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
