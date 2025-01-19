import React from "react";
import { Button, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import PointsButton from "./PointsButtons";
import { issueService } from "../services/IssueService";
import {
  STATUS_UNSTARTED,
  STATUS_IN_PROGRESS,
  STATUS_COMPLETED,
  STATUS_ACCEPTED,
  STATUS_REJECTED,
} from "../services/StatusService";
import {
  Issue,
  POINTS,
  WORK_TYPE_CHORE,
  WORK_TYPE_BUG,
  WORK_TYPE_FEATURE,
  WORK_TYPE_RELEASE,
} from "../models/Issue";

interface StatusButtonProps {
  issue: Issue;
}

const StyledButton = styled(Button)(({ theme }) => ({
  padding: "1px 6px",
  textTransform: "none",
  fontWeight: 500,
}));

const StatusButton: React.FC<StatusButtonProps> = ({ issue }) => {
  const isChore = issue.workType === WORK_TYPE_CHORE;
  const showPoints =
    issue.workType === WORK_TYPE_FEATURE && issue.points === null;
  const isChoreOrRelease = isChore || issue.workType === WORK_TYPE_RELEASE;

  const handleOnEstimated = (points: number) => {
    issueService.updateIssue(issue.id, { points });
  };

  if (showPoints) {
    return (
      <Box sx={{ whiteSpace: "nowrap" }}>
        {POINTS.map((points) => (
          <PointsButton
            key={points}
            points={points}
            isSelected={false}
            onPointsSelect={handleOnEstimated}
          />
        ))}
      </Box>
    );
  }

  const baseStatusMap = new Map([
    [
      STATUS_UNSTARTED,
      [
        {
          status: "Start",
          color: "#ABABAB",
          textColor: "#000000",
          nextStatusHandler: () => issueService.startIssue(issue.id),
        },
      ],
    ],
    [
      STATUS_IN_PROGRESS,
      [
        {
          status: "Finish",
          color: "#000080",
          textColor: "#ffffff",
          nextStatusHandler: () =>
            isChoreOrRelease
              ? issueService.acceptIssue(issue.id)
              : issueService.finishIssue(issue.id),
        },
      ],
    ],
    [STATUS_ACCEPTED, []],
  ]);

  if (!isChoreOrRelease) {
    // Add completed/rejected states only for non-chore/non-release items
    baseStatusMap
      .set(STATUS_COMPLETED, [
        {
          status: "Accept",
          color: "#718548",
          textColor: "#ffffff",
          nextStatusHandler: () => issueService.acceptIssue(issue.id),
        },
        {
          status: "Reject",
          color: "#a71f39",
          textColor: "#ffffff",
          nextStatusHandler: () => issueService.rejectIssue(issue.id),
        },
      ])
      .set(STATUS_REJECTED, [
        {
          status: "Restart",
          color: "#ABABAB",
          textColor: "#990000",
          nextStatusHandler: () => issueService.startIssue(issue.id),
        },
      ]);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "row", gap: 0.2 }}>
      {baseStatusMap
        .get(issue.status !== null ? issue.status : STATUS_UNSTARTED)
        ?.map(({ status: buttonText, color, textColor, nextStatusHandler }) => (
          <StyledButton
            key={buttonText}
            variant="contained"
            style={{ backgroundColor: color, color: textColor }}
            disableElevation
            onClick={() => nextStatusHandler()}
          >
            {buttonText}
          </StyledButton>
        ))}
    </Box>
  );
};

export default StatusButton;
