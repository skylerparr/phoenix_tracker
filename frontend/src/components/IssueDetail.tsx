import React, {useState} from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  TextField,
  Button,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { issueService } from "../services/IssueService";
import useDebounce from "../utils/Debounce";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Link as LinkIcon,
  AccessTime,
  DeleteOutline as Delete,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { Issue, POINTS } from "../models/Issue";
import { workTypes } from "./WorkTypeButtons";
import WorkTypeIcon from "./WorkTypeIcons";
import { getStatusArray, Status } from "../services/StatusService";
import { createTheme, ThemeProvider } from "@mui/material";
import StatusButton from "./StatusButton";
import IssueAutoCompleteComponent from "./IssueAutoCompleteComponent";
import { tagService } from "../services/TagService";

const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
});

interface IssueComponentProps {
  issue: Issue;
  closeHandler: () => void;
}

export const IssueDetail: React.FC<IssueComponentProps> = ({
  issue: originalIssue,
  closeHandler,
}) => {
  const { debouncedUpdate } = useDebounce();
  const [issue, setIssue] = useState<Issue>(originalIssue);
  const [comment, setComment] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  React.useEffect(() => {
    const fetchData = async () => {
      await fetchTags();
    };
    fetchData();
  }, []);


  const fetchTags = async () => {
    const tags = await tagService.getAllTags();
    setAvailableTags(tags.map((tag) => tag.name));
  };


  const handleDeleteIssue = async () => {
    await issueService.deleteIssue(issue.id);
  };

  const handleDescriptionUpdate = async (value: string) => {
    setIssue({ ...issue, description: value });

    debouncedUpdate(async () => {
      const serverUpdatedIssue = await issueService.updateIssue(issue.id, {
        description: value,
      });
      setIssue(serverUpdatedIssue);
    });
  };

  const handleWorkTypeChange = async (workType: number) => {
    const serverUpdatedIssue = await issueService.updateIssue(issue.id, {
      workType,
    });
    setIssue(serverUpdatedIssue);
  };

  const handleStatusChange = async (status: number) => {
    const serverUpdatedIssue = await issueService.updateIssue(issue.id, {
      status,
    });
    setIssue(serverUpdatedIssue);
  };

  const handlePointsChange = async (points: number) => {
    const serverUpdatedIssue = await issueService.updateIssue(issue.id, {
      points,
    });
    setIssue(serverUpdatedIssue);
  };

  
  const handleCreateNewTag = async (newTagName: string) => {
    await tagService.createTag({
      name: newTagName,
      isEpic: false,
    });
    await fetchTags();
  };

  return (
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
          onClick={() => closeHandler()}
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
          <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1 }}>
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
              <ThemeProvider theme={lightTheme}>
                <Select
                  size="small"
                  value={issue.workType}
                  onChange={(e: SelectChangeEvent<number>) =>
                    handleWorkTypeChange(Number(e.target.value))
                  }
                  sx={{
                    minWidth: 120,
                    backgroundColor: "#f6f6f6",
                  }}
                >
                  {workTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      <WorkTypeIcon id={type.id} showLabel={true} />
                    </MenuItem>
                  ))}
                </Select>
              </ThemeProvider>
            </Box>{" "}
          </Stack>
        </Box>

        <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1 }}>
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
              <ThemeProvider theme={lightTheme}>
                <Select
                  size="small"
                  value={issue.status}
                  onChange={(e: SelectChangeEvent<number>) =>
                    handleStatusChange(Number(e.target.value))
                  }
                  sx={{
                    minWidth: 120,
                    backgroundColor: "#f6f6f6",
                  }}
                >
                  {getStatusArray().map((status: Status) => (
                    <MenuItem key={status.id} value={status.id}>
                      {status.name}
                    </MenuItem>
                  ))}
                </Select>
                <StatusButton
                  status={issue.points === null ? null : issue.status}
                  issueId={issue.id}
                />
              </ThemeProvider>
            </Box>{" "}
          </Stack>
        </Box>

        <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1 }}>
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
              <ThemeProvider theme={lightTheme}>
                {issue.points !== null && (
                  <Select
                    size="small"
                    value={issue.points}
                    onChange={(e: SelectChangeEvent<number>) =>
                      handlePointsChange(Number(e.target.value))
                    }
                    sx={{
                      minWidth: 120,
                      backgroundColor: "#f6f6f6",
                    }}
                  >
                    {POINTS.map((point) => (
                      <MenuItem key={point} value={point}>
                        {point} Points
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </ThemeProvider>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ border: "1px solid #ddd", borderRadius: "4px" }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1 }}>
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
          <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 1 }}>
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
          <Stack spacing={1}>
            <Typography variant="caption" sx={{ color: "#666" }}>
              Created: {new Date(issue.createdAt).toLocaleString()} (
              {formatDistanceToNow(new Date(issue.createdAt), {
                addSuffix: true,
              })}
              )
            </Typography>
            <Typography variant="caption" sx={{ color: "#666" }}>
              Updated: {new Date(issue.updatedAt).toLocaleString()} (
              {formatDistanceToNow(new Date(issue.updatedAt), {
                addSuffix: true,
              })}
              )
            </Typography>
          </Stack>
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
        value={issue.description}
        sx={{
          bgcolor: "white",
          "& .MuiInputBase-input": { color: "black" },
        }}
        onChange={(e) => handleDescriptionUpdate(e.target.value)}
      />
      <Typography sx={{ color: "#666", fontWeight: "bold" }}>LABELS</Typography>
      <IssueAutoCompleteComponent
            options={availableTags}
            value={selectedTags}
            onChange={setSelectedTags}
            inputValue={inputValue}
            onInputChange={setInputValue}
            placeholder="Add labels..."
            handleCreateNew={handleCreateNewTag}
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
  );
};
