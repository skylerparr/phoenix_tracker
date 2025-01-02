import React from "react";
import { Box } from "@mui/material";

interface PointsIconProps {
  points: number;
}

export const PointsIcon: React.FC<PointsIconProps> = ({ points }) => {
  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
