import React from "react";
import { format } from "date-fns";
import { Box, Typography } from "@mui/material";
import { Issue } from "../models/Issue";

interface WeekDateBarProps {
  weeksFromNow: number;
  issues: Issue[];
}

const WeekDateBar: React.FC<WeekDateBarProps> = ({ weeksFromNow, issues }) => {
  const date = new Date();
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + 1 + weeksFromNow * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return (
    <Box>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box sx={{ backgroundColor: "#888888", padding: "4px 8px" }}>
          <Typography variant="caption">
            {format(monday, "dd MMM yyyy")} - {format(sunday, "dd MMM yyyy")}
          </Typography>
        </Box>{" "}
      </Box>
    </Box>
  );
};

export default WeekDateBar;
