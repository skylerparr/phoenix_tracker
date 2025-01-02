import React from "react";
import { Button, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import PointsButton from "./PointsButtons";

interface StatusButtonProps {
  status: number | null;
  onEstimated: (points: number) => void;
  onStatusChange: (status: number) => void;
}

const StyledButton = styled(Button)(({ theme }) => ({
  padding: "1px 6px",
  textTransform: "none",
  fontWeight: 500,
}));

const StatusButton: React.FC<StatusButtonProps> = ({
  status,
  onEstimated,
  onStatusChange,
}) => {
  if (status === null) {
    return (
      <Box>
        {[0, 1, 2, 3, 5, 8].map((points) => (
          <PointsButton
            key={points}
            points={points}
            isSelected={false}
            onPointsSelect={onEstimated}
          />
        ))}
      </Box>
    );
  }
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
    <StyledButton
      variant="contained"
      style={statusStyle}
      disableElevation
      onClick={() => onStatusChange(status)}
    >
      {getStatusText(status)}
    </StyledButton>
  );
};

export default StatusButton;
