import React from "react";
import { Box, IconButton } from "@mui/material";
import WorkTypeIcon from "./WorkTypeIcons";
import {
  Star,
  BugReport,
  Build,
  Rocket,
  NotificationsActive,
} from "@mui/icons-material";

interface WorkTypeButtonsProps {
  selectedWorkType: number | null;
  onWorkTypeSelect: (workType: number) => void;
}

export const workTypes: {
  id: number;
  icon: () => JSX.Element;
  label: string;
}[] = [
  {
    id: 0,
    icon: () => <Star sx={{ color: "orange", fill: "orange" }} />,
    label: "Feature",
  },
  { id: 1, icon: () => <BugReport sx={{ color: "red" }} />, label: "Bug" },
  { id: 2, icon: () => <Build sx={{ color: "#424242" }} />, label: "Chore" },
  { id: 3, icon: () => <Rocket sx={{ color: "#1a237e" }} />, label: "Release" },
  {
    id: 4,
    icon: () => <NotificationsActive sx={{ color: "#7b1fa2" }} />,
    label: "Reminder",
  },
];
const WorkTypeButtons: React.FC<WorkTypeButtonsProps> = ({
  selectedWorkType,
  onWorkTypeSelect,
}) => {
  const isSelected = (id: number) => selectedWorkType === id;

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
      {workTypes.map(({ id }) => (
        <IconButton
          key={id}
          onClick={() => onWorkTypeSelect(id)}
          sx={{
            backgroundColor: isSelected(id) ? "action.selected" : "transparent",
            "&:hover": {
              backgroundColor: isSelected(id)
                ? "action.selected"
                : "action.hover",
            },
          }}
        >
          <WorkTypeIcon id={id} />
        </IconButton>
      ))}
    </Box>
  );
};

export default WorkTypeButtons;
