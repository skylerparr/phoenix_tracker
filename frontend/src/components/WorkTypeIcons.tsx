import React from "react";
import { Tooltip } from "@mui/material";
import { workTypes } from "./WorkTypeButtons";

interface WorkTypeIconProps {
  id: number;
}

const WorkTypeIcon: React.FC<WorkTypeIconProps> = ({ id }) => {
  const workType = workTypes.find((type) => type.id === id);
  if (!workType) return null;

  const { icon: Icon, label } = workType;

  return (
    <Tooltip title={label}>
      <Icon />
    </Tooltip>
  );
};

export default WorkTypeIcon;
