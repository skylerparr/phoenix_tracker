import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { Issue } from "../models/Issue";
import { issueService } from "../services/IssueService";
import { IssueDetail } from "./IssueDetail";

const SearchComponent = () => {
  const [searchParams] = useSearchParams();
  const [issue, setIssue] = useState<Issue | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const fetchIssue = async () => {
        const fetchedIssue = await issueService.getIssue(parseInt(id));
        setIssue(fetchedIssue);
      };
      fetchIssue();
    }
  }, [searchParams]);

  if (searchParams.get("id") && issue) {
    return <IssueDetail issue={issue} closeHandler={() => setIssue(null)} />;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" component="h1">
        No results found
      </Typography>
    </Box>
  );
};

export default SearchComponent;
