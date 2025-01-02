import React from "react";
import { Box } from "@mui/material";

interface PointsIconProps {
  points: number | null;
}

export const PointsIcon: React.FC<PointsIconProps> = ({ points }) => {
  if (points === null) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      {points === 0 ? (
        <Box
          sx={{
            width: 22,
            height: 4,
            border: "1px solid #2196f3",
            display: "block",
          }}
        />
      ) : (
        [...Array(points)].map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 22,
              height: 2,
              backgroundColor: "#2196f3",
              display: "block",
            }}
          />
        ))
      )}
    </Box>
  );
};
