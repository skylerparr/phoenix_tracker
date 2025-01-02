import React, { useEffect, useState } from "react";
import { Box, Typography, Container } from "@mui/material";
import { issueService } from "../services/IssueService";
import { Issue } from "../models/Issue";
import { IssueComponent } from "./IssueComponent";

const Backlog: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    const fetchIssues = async () => {
      const issues = await issueService.getAllIssues();
      setIssues(issues);
    };

    fetchIssues();
  }, []);

  return (
    <Box className="backlog-container">
      <Box
        className="backlog-content"
        sx={{
          maxHeight: "80vh",
          overflowY: "auto",
          width: "100%",
        }}
      >
        {issues.map((issue: Issue) => (
          <IssueComponent key={issue.id} issue={issue} />
        ))}
      </Box>{" "}
    </Box>
  );
};

export default Backlog;
