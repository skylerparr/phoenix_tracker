import React from "react";
import { Button, Box, Input } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { importExportService } from "../services/ImportExportService";

const ImportExportComponent = () => {
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          const importData = JSON.parse(content);
          await importExportService.importData(importData);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = async () => {
    const exportData = await importExportService.exportData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "phoenix-tracker-export.json";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: "1rem",
        backgroundColor: "#f5f5f5",
        padding: "1rem",
      }}
    >
      <Button
        variant="contained"
        component="label"
        startIcon={<FileUploadIcon />}
      >
        Import
        <Input
          type="file"
          inputProps={{ accept: ".json" }}
          sx={{ display: "none" }}
          onChange={handleImport}
        />
      </Button>
      <Button
        variant="contained"
        onClick={handleExport}
        startIcon={<FileDownloadIcon />}
      >
        Export
      </Button>
    </Box>
  );
};

export default ImportExportComponent;
