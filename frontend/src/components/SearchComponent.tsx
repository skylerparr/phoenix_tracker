import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { issueService } from "../services/IssueService";
import { WebsocketService } from "../services/WebSocketService";
import { Issue } from "../models/Issue";
import { IssueDetail } from "./IssueDetail";
import { IssueComponent } from "./IssueComponent";

export const PARAM_ID = "id";
export const PARAM_TAG = "tagId";

const SearchComponent = () => {
  const [searchParams] = useSearchParams();
  const [paramKey, setParamKey] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    const id = searchParams.get(PARAM_ID);
    const tagId = searchParams.get(PARAM_TAG);
    switch (true) {
      case !!id:
        setParamKey(PARAM_ID);
        fetchData(PARAM_ID);
        break;
      case !!tagId:
        setParamKey(PARAM_TAG);
        fetchData(PARAM_TAG);
        break;
      default:
        setParamKey(null);
    }
    WebsocketService.subscribeToIssueUpdatedEvent(handleIssueUpdated);
    return () => {
      WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    };
  }, [searchParams]);

  const fetchData = async (paramKey: string | null) => {
    switch (paramKey) {
      case PARAM_ID:
        const id = searchParams.get(PARAM_ID);
        if (id) {
          const fetchedIssue = await issueService.getIssue(parseInt(id));
          setIssues([fetchedIssue]);
        }
        break;
      case PARAM_TAG:
        const tagId = searchParams.get(PARAM_TAG);
        if (tagId) {
          const fetchedIssues = await issueService.getIssuesByTag(
            parseInt(tagId),
          );
          setIssues(fetchedIssues);
        }
        break;
      default:
        break;
    }
  };

  const handleIssueUpdated = () => {
    fetchData(paramKey);
  };

  if (issues.length == 1) {
    return (
      <IssueDetail
        issue={issues[0]}
        closeHandler={() => {
          window.location.href = "?";
        }}
      />
    );
  }
  if (issues.length > 1) {
    return (
      <>
        {issues.map((issue: Issue) => (
          <IssueComponent
            key={issue.id}
            issue={issue}
            expanded={false}
            onToggleExpanded={() => {}}
          />
        ))}
      </>
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
