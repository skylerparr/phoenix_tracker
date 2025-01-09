import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { issueService } from "../services/IssueService";
import { WebsocketService } from "../services/WebSocketService";
import { IssueDetail } from "./IssueDetail";
import IssueList from "./IssueList";
import { useIssueFilter } from "../hooks/useIssueFilter";
import AcceptedIssuesToggle from "./AcceptedIssuesToggle";

export const PARAM_ID = "id";
export const PARAM_TAG = "tagId";

const SearchComponent = () => {
  const [searchParams] = useSearchParams();
  const {
    issues,
    acceptedIssues,
    inProgressIssues,
    expandedAcceptedIssues,
    setExpandedAcceptedIssues,
    handleIssuesChanged,
  } = useIssueFilter();

  useEffect(() => {
    const id = searchParams.get(PARAM_ID);
    const tagId = searchParams.get(PARAM_TAG);

    if (id) {
      fetchIssueById(parseInt(id));
    } else if (tagId) {
      fetchIssuesByTag(parseInt(tagId));
    }

    const handleUrlChange = () => {
      const newSearchParams = new URLSearchParams(window.location.search);
      const newId = newSearchParams.get(PARAM_ID);
      const newTagId = newSearchParams.get(PARAM_TAG);

      if (newId) {
        fetchIssueById(parseInt(newId));
      } else if (newTagId) {
        fetchIssuesByTag(parseInt(newTagId));
      }
    };

    window.addEventListener("urlchange", handleUrlChange);
    WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    WebsocketService.subscribeToIssueUpdatedEvent(handleIssueUpdated);

    return () => {
      window.removeEventListener("urlchange", handleUrlChange);
      WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    };
  }, []);

  const fetchIssueById = async (id: number) => {
    const fetchedIssue = await issueService.getIssue(id);
    if (fetchedIssue) {
      handleIssuesChanged([fetchedIssue]);
    }
  };

  const fetchIssuesByTag = async (tagId: number) => {
    const fetchedIssues = await issueService.getIssuesByTag(tagId);
    handleIssuesChanged(fetchedIssues);
  };

  const handleIssueUpdated = () => {
    const newSearchParams = new URLSearchParams(window.location.search);
    const id = newSearchParams.get(PARAM_ID);
    const tagId = newSearchParams.get(PARAM_TAG);

    if (id) {
      fetchIssueById(parseInt(id));
    } else if (tagId) {
      fetchIssuesByTag(parseInt(tagId));
    }
  };

  if (issues.length + inProgressIssues.length + acceptedIssues.length === 1) {
    return (
      <IssueDetail
        issue={[...issues, ...inProgressIssues, ...acceptedIssues][0]}
        closeHandler={() => {
          window.location.href = "?";
        }}
      />
    );
  }

  return (
    <Box>
      {issues.length > 0 ? (
        <>
          {expandedAcceptedIssues ? (
            <IssueList
              issues={acceptedIssues}
              enableDragDrop={false}
              enableGrouping={false}
            />
          ) : (
            <AcceptedIssuesToggle
              acceptedIssuesCount={acceptedIssues.length}
              onToggle={() => setExpandedAcceptedIssues(true)}
            />
          )}
          <IssueList
            issues={inProgressIssues}
            enableDragDrop={false}
            enableGrouping={false}
          />
          <IssueList
            issues={issues}
            enableDragDrop={false}
            enableGrouping={false}
          />
        </>
      ) : (
        <Typography variant="h4" component="h1">
          No results found
        </Typography>
      )}
    </Box>
  );
};

export default SearchComponent;
