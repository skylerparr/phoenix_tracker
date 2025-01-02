import React from "react";
import { Button } from "@mui/material";
import { styled } from "@mui/material/styles";

interface StatusButtonProps {
  status: number;
}

const StyledButton = styled(Button)(({ theme }) => ({
  padding: "1px 6px",
  textTransform: "none",
  fontWeight: 500,
}));

const StatusButton: React.FC<StatusButtonProps> = ({ status }) => {
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return { background: "#ABABAB", color: "#000" };
      case 1:
        return { background: "#000080", color: "#fff" };
      case 2:
        return { background: "#F44336", color: "#fff" };
      default:
        return { background: "#9E9E9E", color: "#fff" };
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Start";
      case 1:
        return "Finish";
      case 2:
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const statusStyle = getStatusColor(status);

  return (
    <StyledButton variant="contained" style={statusStyle} disableElevation>
      {getStatusText(status)}
    </StyledButton>
  );
};

export default StatusButton;
