import React from "react";
import { Tooltip, Box, Typography } from "@mui/material";
import { workTypes } from "./WorkTypeButtons";

interface WorkTypeIconProps {
  id: number;
  showLabel?: boolean;
}

const WorkTypeIcon: React.FC<WorkTypeIconProps> = ({
  id,
  showLabel = false,
}) => {
  const workType = workTypes.find((type) => type.id === id);
  if (!workType) return null;

  const { icon: Icon, label } = workType;

  return (
    <Tooltip title={label}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Icon />
        {showLabel && (
          <Typography sx={{ marginLeft: 1, color: "black" }}>
            {label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default WorkTypeIcon;
