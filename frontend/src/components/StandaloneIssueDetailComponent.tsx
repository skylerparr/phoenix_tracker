import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Issue } from "../models/Issue";
import { issueService } from "../services/IssueService";
import { IssueDetail } from "./IssueDetail";
import { WebsocketService } from "../services/WebSocketService";

interface StandaloneIssueDetailComponentProps {
  issueId: string;
  onClose: () => void;
}

const StandaloneIssueDetailComponent: React.FC<
  StandaloneIssueDetailComponentProps
> = ({ issueId, onClose }) => {
  const [issue, setIssue] = useState<Issue | null>(null);

  useEffect(() => {
    const fetchIssue = async () => {
      const fetchedIssue = await issueService.getIssue(parseInt(issueId));
      setIssue(fetchedIssue);
      WebsocketService.subscribeToIssueUpdatedEvent(handleIssueUpdated);
    };
    fetchIssue();

    return () => {
      WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    };
  }, []);

  const handleIssueUpdated = async (updatedIssue: Issue) => {
    // kinda hacky, but in the websocket, sometimes I get the full populated issue, sometimes I get just the id
    // if I only have the id, I need to fetch it again. Can reload it in the backend to make this consistent... later
    if (updatedIssue.title === undefined) {
      const fetchedIssue = await issueService.getIssue(parseInt(issueId));
      setIssue(fetchedIssue);
    } else {
      setIssue(updatedIssue);
    }
  };

  if (issue) {
    return <IssueDetail issue={issue} closeHandler={onClose} />;
  } else {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" component="h1">
          Loading...
        </Typography>
      </Box>
    );
  }
};

export default StandaloneIssueDetailComponent;
