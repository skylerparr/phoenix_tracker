import React from "react";
import { Box, IconButton } from "@mui/material";
import { PointsIcon } from "./PointsIcon";

interface PointsButtonsProps {
  points: number;
  isSelected: boolean;
  onPointsSelect: (points: number) => void;
}

const PointsButtons: React.FC<PointsButtonsProps> = ({
  points,
  isSelected,
  onPointsSelect,
}) => {
  return (
    <IconButton
      onClick={() => onPointsSelect(points)}
      sx={{
        width: 36,
        height: 36,
        border: "1px solid #333333",
        borderRadius: 1,
        backgroundColor: isSelected ? "#565656" : "#ababab",
        "&:hover": {
          backgroundColor: isSelected ? "#757575" : "#9e9e9e",
        },
      }}
    >
      <Box
        sx={{
          fontSize: 14,
          fontWeight: "bold",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        <PointsIcon points={points} />
      </Box>
    </IconButton>
  );
};

export default PointsButtons;
