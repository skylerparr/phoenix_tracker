import React from "react";
import { Issue } from "../models/Issue";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import { PointsIcon } from "./PointsIcon";
import WorkTypeIcon from "./WorkTypeIcons";
import StatusButton from "./StatusButton";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Link as LinkIcon,
  AccessTime,
  DeleteOutline as Delete,
} from "@mui/icons-material";
import { issueService } from "../services/IssueService";

interface IssueComponentProps {
  issue: Issue;
}

export const IssueComponent: React.FC<IssueComponentProps> = ({ issue }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [comment, setComment] = React.useState("");

  const handleDeleteIssue = async () => {
    await issueService.deleteIssue(issue.id);
  };

  const handleOnEstimated = (points: number) => {
    issueService.updateIssue(issue.id, { points });
  };

  return (
    <Box>
      {expanded ? (
        <Stack
          spacing={2}
          sx={{
            bgcolor: "#d9d9d3",
            padding: "5px",
            border: "1px solid #ddd",
            borderRadius: 1,
            cursor: "default",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              size="small"
              sx={{ color: "#000000" }}
              onClick={() => setExpanded(false)}
            >
              <KeyboardArrowDownIcon />
            </IconButton>
            <TextField
              fullWidth
              defaultValue={issue.title}
              variant="outlined"
              size="small"
              sx={{
                backgroundColor: "white",
                input: { color: "#000000" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#000000",
                  },
                  "&:hover fieldset": {
                    borderColor: "#000000",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#000000",
                  },
                },
              }}
            />
          </Stack>
          <Stack direction="row" sx={{ marginTop: "4px" }}>
            <IconButton
              size="small"
              sx={{
                width: "18px",
                height: "18px",
                padding: "2px",
                color: "#000000",
                border: "1px solid #333333",
                backgroundColor: "#f5f5f5",
                borderRadius: "0px",
              }}
              title="Link to this issue"
            >
              <LinkIcon sx={{ fontSize: "14px" }} />
            </IconButton>{" "}
            <Box
              sx={{
                width: "18px",
                height: "18px",
                color: "#000000",
                border: "1px solid #333333",
                backgroundColor: "#f5f5f5",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" sx={{ fontSize: "12px" }}>
                ID
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: "#000000",
                minWidth: "40px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #000000",
                borderRadius: "2px",
                padding: "0px 3px",
                fontSize: "10px",
              }}
            >
              #{issue.id}
            </Typography>
            <IconButton
              size="small"
              sx={{
                marginLeft: "2px",
                width: "18px",
                height: "18px",
                padding: "2px",
                color: "#000000",
                border: "1px solid #333333",
                backgroundColor: "#f5f5f5",
                borderRadius: "0px",
              }}
              title="Link to this issue"
            >
              <AccessTime sx={{ fontSize: "14px" }} />
            </IconButton>{" "}
            <IconButton
              size="small"
              sx={{
                marginLeft: "2px",
                width: "18px",
                height: "18px",
                padding: "2px",
                color: "#000000",
                border: "1px solid #333333",
                backgroundColor: "#f5f5f5",
                borderRadius: "0px",
              }}
              title="Link to this issue"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteIssue();
              }}
            >
              <Delete sx={{ fontSize: "14px" }} />
            </IconButton>{" "}
          </Stack>
          <Stack sx={{ backgroundColor: "#f6f6f6", padding: "5px" }}>
            <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ p: 1 }}
              >
                <Typography
                  sx={{
                    width: 120,
                    color: "#666",
                    borderRight: "1px solid #ddd",
                    pr: 2,
                  }}
                >
                  STORY TYPE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography>⭐</Typography>
                  <Typography sx={{ color: "#a5a5a5" }}>Feature</Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ p: 1 }}
              >
                <Typography
                  sx={{
                    width: 120,
                    color: "#666",
                    borderRight: "1px solid #ddd",
                    pr: 2,
                  }}
                >
                  STATE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ color: "#a5a5a5" }}>Start</Typography>
                  <Typography sx={{ color: "#a5a5a5" }}>Unstarted</Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ p: 1 }}
              >
                <Typography
                  sx={{
                    width: 120,
                    color: "#666",
                    borderRight: "1px solid #ddd",
                    pr: 2,
                  }}
                >
                  POINTS
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ color: "#a5a5a5" }}>
                    {issue.points} Points
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ p: 1 }}
              >
                <Typography
                  sx={{
                    width: 120,
                    color: "#666",
                    borderRight: "1px solid #ddd",
                    pr: 2,
                  }}
                >
                  REQUESTER
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ color: "#a5a5a5" }}>Skyler Parr</Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ p: 1 }}
              >
                <Typography
                  sx={{
                    width: 120,
                    color: "#666",
                    borderRight: "1px solid #ddd",
                    pr: 2,
                  }}
                >
                  OWNERS
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ color: "#a5a5a5" }}>Skyler Parr</Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ border: "1px solid #ddd", borderRadius: "4px", p: 1 }}>
              <Typography variant="caption" sx={{ color: "#666" }}>
                Updated: 28 minutes ago
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{ color: "#666", fontWeight: "bold", mt: 2 }}>
            BLOCKERS
          </Typography>
          <Button sx={{ width: "150px" }}>
            <Typography sx={{ color: "#666", cursor: "pointer" }}>
              + Add blocker
            </Typography>
          </Button>
          <Typography sx={{ color: "#666", fontWeight: "bold" }}>
            DESCRIPTION
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="Add a description"
            sx={{
              bgcolor: "white",
              "& .MuiInputBase-input": { color: "black" },
            }}
          />
          <Typography sx={{ color: "#666", fontWeight: "bold" }}>
            LABELS
          </Typography>
          <TextField
            fullWidth
            placeholder="Add a label"
            size="small"
            sx={{
              bgcolor: "white",
              "& .MuiInputBase-input": { color: "black" },
            }}
          />
          <Typography sx={{ color: "#666", fontWeight: "bold" }}>
            TASKS (0/0)
          </Typography>
          <Typography sx={{ color: "#666", cursor: "pointer" }}>
            + Add a task
          </Typography>
          <Stack spacing={1}>
            <Typography sx={{ color: "#666", fontWeight: "bold" }}>
              Activity
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Add a comment"
              sx={{
                bgcolor: "white",
                "& .MuiInputBase-input": { color: "black" },
              }}
              onChange={(e) => setComment(e.target.value)}
            />

            <Button
              variant="contained"
              disabled={!comment || comment.length < 2}
              sx={{ mt: 1 }}
            >
              Post Comment
            </Button>
          </Stack>{" "}
        </Stack>
      ) : (
        <Box
          className="issue-container"
          sx={{
            border: "1px solid #ddd",
            borderRadius: 1,
            width: "100%",
            bgcolor: issue.status === 1 ? "#FFFFE0" : "#f5f5f5",
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
            <Typography sx={{ flexGrow: 1, color: "black" }}>
              {issue.title}
            </Typography>
            <Box onClick={(e) => e.stopPropagation()}>
              <StatusButton
                status={issue.points === null ? null : issue.status}
                onEstimated={handleOnEstimated}
                onStatusChange={(status: number) => {}}
              />
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default IssueComponent;
