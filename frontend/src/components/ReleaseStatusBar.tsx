import React from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import { Issue } from "../models/Issue";

interface ReleaseStatusBarProps {
  release: Issue;
  totalPoints: number;
  weeksUntilRelease: number;
  expectedPointsCapacity: number;
  willComplete: boolean;
}

const ReleaseStatusBar: React.FC<ReleaseStatusBarProps> = ({
  release,
  totalPoints,
  weeksUntilRelease,
  expectedPointsCapacity,
  willComplete,
}: ReleaseStatusBarProps) => {
  // Format the release date
  const formatReleaseDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <Tooltip
      title={
        <>
          <Typography variant="body2">
            Target Release: {formatReleaseDate(release.targetReleaseAt)}
          </Typography>
          <Typography variant="body2">
            Points Remaining: {totalPoints}
          </Typography>
          <Typography variant="body2">
            Weekly Average:{" "}
            {(expectedPointsCapacity / weeksUntilRelease).toFixed(1)} points
          </Typography>
          <Typography variant="body2">
            Weeks Until Release: {weeksUntilRelease}
          </Typography>
          <Typography variant="body2">
            Expected Capacity: {expectedPointsCapacity.toFixed(1)} points
          </Typography>
          <Typography variant="body2">
            Status: {willComplete ? "On Track" : "At Risk"}
          </Typography>
        </>
      }
      arrow
    >
      <Box
        sx={{
          backgroundColor: willComplete ? "#000000" : "#8B0000",
          color: "white",
          padding: "8px 16px",
          borderRadius: "4px",
          margin: "10px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
          "&:hover": {
            opacity: 0.9,
            cursor: "pointer",
          },
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {release.title}
        </Typography>
        <Typography variant="caption">
          {willComplete
            ? `On Track (${totalPoints} pts / ${weeksUntilRelease} wks)`
            : `At Risk (${totalPoints} pts / ${weeksUntilRelease} wks)`}
        </Typography>
      </Box>
    </Tooltip>
  );
};
export default ReleaseStatusBar;
