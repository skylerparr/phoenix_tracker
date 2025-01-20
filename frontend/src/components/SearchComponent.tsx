import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { issueService } from "../services/IssueService";
import { WebsocketService } from "../services/WebSocketService";
import { IssueDetail } from "./IssueDetail";
import IssueList from "./IssueList";
import { useIssueFilter } from "../hooks/useIssueFilter";
import AcceptedIssuesToggle from "./AcceptedIssuesToggle";
import { useSearchParams } from "../hooks/useSearchParams";

export const PARAM_ID = "id";
export const PARAM_TAG = "tagId";
export const PARAM_USER_ID = "userId";
export const PARAM_HISTORY_ISSUE_ID = "historyIssueId";

const SearchComponent = () => {
  const {
    issues,
    acceptedIssues,
    inProgressIssues,
    expandedAcceptedIssues,
    setExpandedAcceptedIssues,
    handleIssuesChanged,
  } = useIssueFilter();

  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get(PARAM_ID);
    const tagId = searchParams.get(PARAM_TAG);
    const userId = searchParams.get(PARAM_USER_ID);

    if (id) {
      fetchIssueById(parseInt(id));
    } else if (tagId) {
      fetchIssuesByTag(parseInt(tagId));
    } else if (userId) {
      fetchIssuesByUser(parseInt(userId));
    }

    WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    WebsocketService.subscribeToIssueUpdatedEvent(handleIssueUpdated);

    return () => {
      WebsocketService.unsubscribeToIssueUpdatedEvent(handleIssueUpdated);
    };
  }, [searchParams]);

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

  const fetchIssuesByUser = async (userId: number) => {
    const fetchedIssues = await issueService.getIssuesByUser(userId);
    handleIssuesChanged(fetchedIssues);
  };

  const handleIssueUpdated = () => {
    const newSearchParams = new URLSearchParams(window.location.search);
    const id = newSearchParams.get(PARAM_ID);
    const tagId = newSearchParams.get(PARAM_TAG);
    const userId = newSearchParams.get(PARAM_USER_ID);

    if (id) {
      fetchIssueById(parseInt(id));
    } else if (tagId) {
      fetchIssuesByTag(parseInt(tagId));
    } else if (userId) {
      fetchIssuesByUser(parseInt(userId));
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

  const nonIceboxIssues = issues.filter((issue) => !issue.isIcebox);
  const iceboxIssues = issues.filter((issue) => issue.isIcebox);

  return (
    <Box>
      {issues.length > 0 ? (
        <>
          {expandedAcceptedIssues ? (
            <>
              <AcceptedIssuesToggle
                acceptedIssuesCount={acceptedIssues.length}
                onToggle={() =>
                  setExpandedAcceptedIssues(!expandedAcceptedIssues)
                }
                enabled={expandedAcceptedIssues}
              />
              <IssueList
                issues={acceptedIssues}
                enableDragDrop={false}
                enableGrouping={false}
              />
            </>
          ) : (
            <AcceptedIssuesToggle
              acceptedIssuesCount={acceptedIssues.length}
              onToggle={() =>
                setExpandedAcceptedIssues(!expandedAcceptedIssues)
              }
              enabled={expandedAcceptedIssues}
            />
          )}
          <IssueList
            issues={inProgressIssues}
            enableDragDrop={false}
            enableGrouping={false}
          />
          <IssueList
            issues={nonIceboxIssues}
            enableDragDrop={false}
            enableGrouping={false}
          />
          <IssueList
            issues={iceboxIssues}
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
