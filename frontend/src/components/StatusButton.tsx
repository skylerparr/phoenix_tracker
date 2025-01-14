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
import { Issue, POINTS } from "../models/Issue";

interface StatusButtonProps {
  issueId: number;
  status: number | null;
}

const StyledButton = styled(Button)(({ theme }) => ({
  padding: "1px 6px",
  textTransform: "none",
  fontWeight: 500,
}));

const StatusButton: React.FC<StatusButtonProps> = ({ issueId, status }) => {
  const handleOnEstimated = (points: number) => {
    issueService.updateIssue(issueId, { points });
  };
  if (status === null) {
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

  const statusMap: Map<
    number,
    {
      status: string;
      color: string;
      textColor: string;
      nextStatusHandler: () => Promise<Issue>;
    }[]
  > = new Map([
    [
      STATUS_UNSTARTED,
      [
        {
          status: "Start",
          color: "#ABABAB",
          textColor: "#000000",
          nextStatusHandler: () => issueService.startIssue(issueId),
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
          nextStatusHandler: () => issueService.finishIssue(issueId),
        },
      ],
    ],
    [
      STATUS_COMPLETED,
      [
        {
          status: "Accept",
          color: "#718548",
          textColor: "#ffffff",
          nextStatusHandler: () => issueService.acceptIssue(issueId),
        },
        {
          status: "Reject",
          color: "#a71f39",
          textColor: "#ffffff",
          nextStatusHandler: () => issueService.rejectIssue(issueId),
        },
      ],
    ],
    [
      STATUS_REJECTED,
      [
        {
          status: "Restart",
          color: "#ABABAB",
          textColor: "#990000",
          nextStatusHandler: () => issueService.startIssue(issueId),
        },
      ],
    ],
    [STATUS_ACCEPTED, []],
  ]);

  return (
    <Box sx={{ display: "flex", flexDirection: "row", gap: 0.2 }}>
      {statusMap
        .get(status)
        ?.map(
          ({
            status: buttonText,
            color,
            textColor,
            nextStatusHandler,
          }: {
            status: string;
            color: string;
            textColor: string;
            nextStatusHandler: () => Promise<Issue>;
          }) => (
            <StyledButton
              key={buttonText}
              variant="contained"
              style={{ backgroundColor: color, color: textColor }}
              disableElevation
              onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                nextStatusHandler()
              }
            >
              {buttonText}
            </StyledButton>
          ),
        )}
    </Box>
  );
};

export default StatusButton;
