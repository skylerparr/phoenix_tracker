import React from "react";
import { Button, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import PointsButton from "./PointsButtons";
import { issueService } from "../services/IssueService";
import {
  STATUS_READY,
  STATUS_IN_PROGRESS,
  STATUS_COMPLETED,
  STATUS_ACCEPTED,
  STATUS_REJECTED,
} from "../services/StatusService";
import { Issue } from "../models/Issue";

interface StatusButtonProps {
  issueId: number;
  status: number | null;
  onEstimated: (points: number) => void;
}

const StyledButton = styled(Button)(({ theme }) => ({
  padding: "1px 6px",
  textTransform: "none",
  fontWeight: 500,
}));

const StatusButton: React.FC<StatusButtonProps> = ({
  issueId,
  status,
  onEstimated,
}) => {
  if (status === null) {
    return (
      <Box>
        {[0, 1, 2, 3, 5, 8].map((points) => (
          <PointsButton
            key={points}
            points={points}
            isSelected={false}
            onPointsSelect={onEstimated}
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
      STATUS_READY,
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
    <Box>
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
