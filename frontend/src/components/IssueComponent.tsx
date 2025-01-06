import React from "react";
import { Issue } from "../models/Issue";
import { Box, Typography, Stack, Button } from "@mui/material";
import { PointsIcon } from "./PointsIcon";
import WorkTypeIcon from "./WorkTypeIcons";
import StatusButton from "./StatusButton";
import { STATUS_IN_PROGRESS, STATUS_ACCEPTED } from "../services/StatusService";
import { IssueDetail } from "./IssueDetail";
import { issueTagService } from "../services/IssueTagService";
import { Tag } from "../models/Tag";

interface IssueComponentProps {
  issue: Issue;
}

export const IssueComponent: React.FC<IssueComponentProps> = ({ issue }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [tags, setTags] = React.useState<Tag[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      const associatedTags = await issueTagService.getTagsForIssue(issue);
      setTags(associatedTags);
    };
    fetchData();
  }, [issue]);

  const getBackgroundColor = (status: number) => {
    switch (status) {
      case STATUS_IN_PROGRESS:
        return "#FFFFE0";
      case STATUS_ACCEPTED:
        return "#c6d9b7";
      default:
        return "#f5f5f5";
    }
  };

  return (
    <Box>
      {expanded ? (
        <IssueDetail issue={issue} closeHandler={() => setExpanded(false)} />
      ) : (
        <Box
          className="issue-container"
          sx={{
            border: "1px solid #ddd",
            borderRadius: 1,
            width: "100%",
            bgcolor: getBackgroundColor(issue.status),
            padding: "5px",
            cursor: "move",
          }}
          onClick={() => setExpanded(true)}
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
                  fontStyle: issue.points === null ? "italic" : "normal",
                }}
              >
                {issue.title}
              </Typography>
              <Stack direction="row" spacing={1}>
                {tags.map((tag: Tag) => (
                  <Button
                    key={tag.id}
                    variant="text"
                    size="small"
                    sx={{
                      color: "green",
                      minWidth: "auto",
                      textTransform: "none",
                      fontStyle: issue.points === null ? "italic" : "normal",
                      padding: 0,
                    }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    {tag.name}
                  </Button>
                ))}
              </Stack>
            </Box>
            <Box onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <StatusButton
                status={issue.points === null ? null : issue.status}
                issueId={issue.id}
              />
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default IssueComponent;
