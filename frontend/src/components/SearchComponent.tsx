import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import StandAloneIssueDetailComponent from "./StandaloneIssueDetailComponent";

const SearchComponent = () => {
  const [searchParams] = useSearchParams();
  const [issueId, setIssueId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    setIssueId(id);
  }, [searchParams]);

  if (searchParams.get("id") && issueId) {
    return (
      <StandAloneIssueDetailComponent
        issueId={issueId}
        onClose={() => setIssueId(null)}
      />
    );
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
