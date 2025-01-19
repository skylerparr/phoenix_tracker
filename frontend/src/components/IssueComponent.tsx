import React from "react";
import { Issue, WORK_TYPE_FEATURE, WORK_TYPE_CHORE } from "../models/Issue";
import { Box, Typography, Stack, Button, Link } from "@mui/material";
import { PointsIcon } from "./PointsIcon";
import WorkTypeIcon from "./WorkTypeIcons";
import StatusButton from "./StatusButton";
import {
  STATUS_IN_PROGRESS,
  STATUS_ACCEPTED,
  STATUS_COMPLETED,
} from "../services/StatusService";
import { IssueDetail } from "./IssueDetail";
import { issueTagService } from "../services/IssueTagService";
import { userService } from "../services/UserService";
import { issueAssigneeService } from "../services/IssueAssigneeService";
import { tagService } from "../services/TagService";
import { Tag } from "../models/Tag";
import { User } from "../models/User";
import { PARAM_TAG, PARAM_USER_ID } from "./SearchComponent";

interface IssueComponentProps {
  issue: Issue;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export const getBackgroundColor = (issue: Issue | undefined) => {
  if (!issue) {
    return "#f5f5f5";
  }
  if (issue.isIcebox) {
    return "#e4eff6";
  }
  switch (issue.status) {
    case STATUS_IN_PROGRESS:
      return "#FFFFE0";
    case STATUS_COMPLETED:
      return "#FFFFE0";
    case STATUS_ACCEPTED:
      return "#c6d9b7";
    default:
      return "#f5f5f5";
  }
};

export const getHoverBackgroundColor = (issue: Issue | undefined) => {
  if (!issue) {
    return "#e0e0e0";
  }
  if (issue.isIcebox) {
    return "#c9dff0";
  }
  switch (issue.status) {
    case STATUS_IN_PROGRESS:
      return "#FFFF99";
    case STATUS_COMPLETED:
      return "#FFFF99";
    case STATUS_ACCEPTED:
      return "#a8c594";
    default:
      return "#e0e0e0";
  }
};
const updateUrlWithParam = (param: string, value: string) => {
  const url = new URL(window.location.href);
  url.searchParams.forEach((_, key) => {
    url.searchParams.delete(key);
  });
  url.searchParams.set(param, value);
  window.history.pushState({}, "", url);
};

export const searchTagsForIssue = (tagId: number) => {
  updateUrlWithParam(PARAM_TAG, tagId.toString());
  window.dispatchEvent(new Event("urlchange"));
};

const userClickHandler = (user: User) => {
  updateUrlWithParam(PARAM_USER_ID, user.id.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
};
export const IssueComponent: React.FC<IssueComponentProps> = ({
  issue,
  expanded,
  onToggleExpanded,
}) => {
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [issueUsers, setIssueUsers] = React.useState<User[]>([]);

  React.useEffect(() => {
    tagService.subscribeToGetAllTags(onTagsUpdated);
    userService.subscribeToGetAllUsers(onUsersUpdated);
    issueAssigneeService.subscribeToGetAllIssueAssignees(onAssigneesUpdated);

    fetchData();
    onUsersUpdated();
    return () => {
      tagService.unsubscribeFromGetAllTags(onTagsUpdated);
      userService.unsubscribeFromGetAllUsers(onUsersUpdated);
      issueAssigneeService.unsubscribeFromGetAllIssueAssignees(
        onAssigneesUpdated,
      );
    };
  }, [issue]);

  const onAssigneesUpdated = async () => {
    try {
      const assignees = await issueAssigneeService.getIssueAssigneesByIssueId(
        issue.id,
      );
      const users = await userService.getAllUsers();
      const issueUsersFilter = users.filter((user) =>
        assignees.some((assignee) => assignee.userId === user.id),
      );
      setIssueUsers(issueUsersFilter);
    } catch (error) {
      console.error("Error updating assignees:", error);
    }
  };

  const onUsersUpdated = async () => {
    try {
      const users = await userService.getAllUsers();
      const assignees = await issueAssigneeService.getIssueAssigneesByIssueId(
        issue.id,
      );

      const issueUsersFilter = users.filter((user) =>
        assignees.some((assignee) => assignee.userId === user.id),
      );
      setIssueUsers(issueUsersFilter);
    } catch (error) {
      console.error("Error updating users:", error);
    }
  };
  const fetchData = async () => {
    const associatedTags = await issueTagService.getTagsForIssue(issue);
    setTags(associatedTags);
  };

  const onTagsUpdated = () => {
    fetchData();
  };

  return (
    <Box>
      {expanded ? (
        <IssueDetail issue={issue} closeHandler={onToggleExpanded} />
      ) : (
        <Box
          className="issue-container"
          sx={{
            border: "1px solid #ddd",
            borderRadius: 1,
            width: "100%",
            bgcolor: getBackgroundColor(issue),
            padding: "5px",
            "&:hover": {
              bgcolor: getHoverBackgroundColor(issue),
              transition: "background-color 0.2s ease",
              cursor: "pointer",
            },
          }}
          onClick={onToggleExpanded}
        >
          <Stack direction="row" spacing={2}>
            <WorkTypeIcon id={issue.workType} />
            <Box display="flex" justifyContent="center" alignItems="center">
              <PointsIcon points={issue.points} />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                sx={{
                  color: "black",
                  fontStyle:
                    issue.points === null &&
                    issue.workType === WORK_TYPE_FEATURE
                      ? "italic"
                      : "normal",
                }}
              >
                {issue.title}
                <Typography component="span" sx={{ ml: 1 }}>
                  {issueUsers.length > 0 && (
                    <>
                      (
                      {issueUsers.map((user, index) => (
                        <React.Fragment key={user.id}>
                          {index > 0 && ", "}
                          <Link
                            component="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              userClickHandler(user);
                            }}
                            sx={{
                              textDecoration: "underline",
                              color: "blue",
                              "&:hover": {
                                textDecoration: "none",
                              },
                            }}
                          >
                            {user.name
                              .split(" ")
                              .map((word) => word[0])
                              .join("")}
                          </Link>
                        </React.Fragment>
                      ))}
                      )
                    </>
                  )}
                </Typography>{" "}
              </Typography>{" "}
              <Stack direction="row" spacing={1}>
                {tags.map((tag: Tag) => (
                  <Button
                    key={tag.id}
                    variant="text"
                    size="small"
                    sx={{
                      color: tag.isEpic ? "#673ab7" : "green",
                      minWidth: "auto",
                      textTransform: "none",
                      fontStyle:
                        issue.points === null &&
                        issue.workType === WORK_TYPE_FEATURE
                          ? "italic"
                          : "normal",
                      padding: 0,
                    }}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      searchTagsForIssue(tag.id);
                    }}
                  >
                    {tag.name}
                  </Button>
                ))}
              </Stack>
            </Box>
            <Box onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <StatusButton issue={issue} />
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default IssueComponent;
