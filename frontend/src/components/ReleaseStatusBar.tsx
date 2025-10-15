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
  const isOverdue = weeksUntilRelease < 0;
  const statusLabel = isOverdue
    ? "Overdue"
    : willComplete
      ? "On Track"
      : "At Risk";
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
          <Typography variant="body2">Status: {statusLabel}</Typography>
        </>
      }
      arrow
    >
      <Box
        sx={{
          backgroundColor: isOverdue
            ? "#B71C1C"
            : willComplete
              ? "#000000"
              : "#8B0000",
          background: isOverdue
            ? "repeating-linear-gradient(45deg, #ff1744, #ff1744 12px, #b71c1c 12px, #b71c1c 24px)"
            : undefined,
          boxShadow: isOverdue
            ? "0 0 0 2px #b71c1c inset, 0 0 14px rgba(183,28,28,0.7)"
            : undefined,
          color: "white",
          padding: "2px 16px",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {release.title}
        </Typography>
        <Typography variant="caption">
          {isOverdue
            ? `Overdue (${totalPoints} pts / ${Math.abs(weeksUntilRelease)} wks past target)`
            : willComplete
              ? `On Track (${totalPoints} pts / ${weeksUntilRelease} wks until target)`
              : `At Risk (${totalPoints} pts / ${weeksUntilRelease} wks until target)`}
        </Typography>
      </Box>
    </Tooltip>
  );
};
export default ReleaseStatusBar;
