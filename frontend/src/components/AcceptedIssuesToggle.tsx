import React from "react";
import { Box } from "@mui/material";

interface AcceptedIssuesToggleProps {
  acceptedIssuesCount: number;
  onToggle: () => void;
}

const AcceptedIssuesToggle: React.FC<AcceptedIssuesToggleProps> = ({
  acceptedIssuesCount,
  onToggle,
}) => {
  if (acceptedIssuesCount === 0) return null;

  return (
    <Box
      sx={{
        border: "1px solid #ddd",
        borderRadius: 1,
        width: "100%",
        bgcolor: "#c6d9b7",
        padding: "5px",
        cursor: "pointer",
        color: "#333333",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onToggle}
    >
      Show {acceptedIssuesCount} Accepted Issues
    </Box>
  );
};

export default AcceptedIssuesToggle;
