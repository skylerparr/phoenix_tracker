import React, { useState } from "react";
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
  Checkbox,
  Autocomplete,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Link as LinkIcon,
  AccessTime,
  DeleteOutline as Delete,
  Edit,
  Save,
  Clear,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { Issue, POINTS } from "../models/Issue";
import { issueService } from "../services/IssueService";
import { workTypes } from "./WorkTypeButtons";
import WorkTypeIcon from "./WorkTypeIcons";
import { getStatusArray, Status } from "../services/StatusService";
import { createTheme, ThemeProvider } from "@mui/material";
import StatusButton from "./StatusButton";
import IssueAutoCompleteComponent from "./IssueAutoCompleteComponent";
import { tagService } from "../services/TagService";
import { userService } from "../services/UserService";
import { issueAssigneeService } from "../services/IssueAssigneeService";
import { issueTagService } from "../services/IssueTagService";
import { Tag } from "../models/Tag";
import { User } from "../models/User";
import { IssueAssignee } from "../models/IssueAssignee";
import { commentService } from "../services/CommentService";
import { Comment } from "../models/Comment";
import { Task } from "../models/Task";
import { taskService } from "../services/TaskService";
import { Blocker } from "../models/Blocker";
import { blockerService } from "../services/BlockerService";
import { getBackgroundColor } from "./IssueComponent";

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
  const [issue, setIssue] = useState<Issue>(originalIssue);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [comment, setComment] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInputValue, setTagInputValue] = useState("");
  const [userInputValue, setUserTagInputValue] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requestedBy, setRequestedBy] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editableTaskIds, setEditableTaskIds] = useState<
    { id: number; title: string }[]
  >([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [blocker, setBlocker] = useState<boolean>(false);

  React.useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchUsers(),
        fetchComments(),
        fetchTasks(),
        fetchBlockers(),
      ]);
      setIssue(originalIssue);
    };
    issueService.subscribeToGetAllIssues(handleIssuesUpdate);
    tagService.subscribeToGetAllTags(handleTagsUpdate);
    fetchData();
    return () => {
      tagService.unsubscribeFromGetAllTags(handleTagsUpdate);
      issueService.unsubscribeFromGetAllIssues(handleIssuesUpdate);
    };
  }, [originalIssue]);

  const handleIssuesUpdate = (issues: Issue[]) => {
    setIssues(issues);
  };

  const fetchUsers = async () => {
    const users = await userService.getAllUsers();
    setUsers(users);

    const issueAssignees =
      await issueAssigneeService.getIssueAssigneesByIssueId(originalIssue.id);
    const assignedUsersList = issueAssignees.reduce<User[]>(
      (assigned, assignee: IssueAssignee) => {
        const user = users.find((user) => user.id === assignee.userId);
        if (user) {
          assigned.push(user);
        }
        return assigned;
      },
      [],
    );
    setAssignedUsers(assignedUsersList);
    const assignedUserNames = assignedUsersList.map((user) => user.name);
    setSelectedUsers(assignedUserNames);

    const requestedBy = users.find(
      (user) => user.id === originalIssue.createdById,
    );
    setRequestedBy(requestedBy || null);
  };

  const fetchComments = async () => {
    const comments = await commentService.getCommentsByIssue(originalIssue.id);
    setComments(comments);
  };

  const fetchTasks = async () => {
    const tasks = await taskService.getTasksByIssue(originalIssue.id);
    const sortedTasks = tasks.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    setTasks(sortedTasks);
  };

  const fetchBlockers = async () => {
    const blockers = await blockerService.getBlockedIssues(originalIssue.id);
    setBlockers(blockers);
  };

  const handleTagsUpdate = async (tags: Tag[]) => {
    setAllTags(tags);
    setAvailableTags(tags.map((tag) => tag.name));
    const associatedTags = await issueTagService.getTagsForIssue(originalIssue);
    const associatedTagNames = associatedTags.map((tag) => tag.name);
    setSelectedTags(associatedTagNames);
  };

  const handleDeleteIssue = async () => {
    await issueService.deleteIssue(issue.id);
  };

  const handleTitleUpdate = async (value: string) => {
    setIssue({ ...issue, title: value });
  };

  const handleDescriptionUpdate = async (value: string) => {
    setIssue({ ...issue, description: value });
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

  const handleSetSelectedTags = async (names: string[]) => {
    // Find tags to create (in names but not in selectedTags)
    const tagsToCreate = names.filter((name) => !selectedTags.includes(name));

    // Find tags to delete (in selectedTags but not in names)
    const tagsToDelete = selectedTags.filter((name) => !names.includes(name));

    // Create new issue tags
    for (const tagName of tagsToCreate) {
      const tag = allTags.find((t) => t.name === tagName);
      if (tag) {
        await issueTagService.createIssueTag({
          issueId: issue.id,
          tagId: tag.id,
        });
      }
    }

    // Delete removed issue tags
    for (const tagName of tagsToDelete) {
      const tag = allTags.find((t) => t.name === tagName);
      if (tag) {
        await issueTagService.deleteIssueTag(issue.id, tag.id);
      }
    }

    setSelectedTags(names);
  };

  const handleCreateNewTag = async (newTagName: string) => {
    const tag = await tagService.createTag({
      name: newTagName,
      isEpic: false,
    });
    await issueTagService.createIssueTag({
      issueId: issue.id,
      tagId: tag.id,
    });
  };

  const handleSetUsers = async (names: string[]) => {
    const selectedUsers = users.filter((user: { name: string; id: number }) =>
      names.includes(user.name),
    );
    // Find users to add (in selectedUsers but not in assignedUsers)
    const usersToAdd = selectedUsers.filter(
      (user: { id: number }) =>
        !assignedUsers.some(
          (assigned: { id: number }) => assigned.id === user.id,
        ),
    );

    // Find users to remove (in assignedUsers but not in selectedUsers)
    const usersToRemove = assignedUsers.filter(
      (assigned: { id: number }) =>
        !selectedUsers.some(
          (selected: { id: number }) => selected.id === assigned.id,
        ),
    );

    // Add new users
    for (const user of usersToAdd) {
      await issueAssigneeService.createIssueAssignee({
        issueId: issue.id,
        userId: user.id,
      });
    }

    // Remove users
    for (const user of usersToRemove) {
      await issueAssigneeService.deleteIssueAssignee(issue.id, user.id);
    }

    setAssignedUsers(selectedUsers);
    const assignedUserNames = selectedUsers.map(
      (user: { name: string }) => user.name,
    );
    setSelectedUsers(assignedUserNames);
  };

  const handleClose = async () => {
    await issueService.updateIssue(issue.id, {
      title: issue.title,
      description: issue.description,
    });
    closeHandler();
  };

  const handlePostComment = async () => {
    await commentService.createComment({
      issueId: issue.id,
      content: comment,
    });
    setComment("");
  };

  const handleTaskComplete = (id: number, checked: boolean) => {
    taskService.updateTask(id, { completed: checked });
  };

  const handleEditTask = (id: number, title: string) => {
    setEditableTaskIds((prevState: Array<{ id: number; title: string }>) => [
      ...prevState,
      { id, title },
    ]);
  };

  const handleSaveTask = async (id: number, title: string) => {
    await taskService.updateTask(id, { title });
    setEditableTaskIds((prevState: Array<{ id: number; title: string }>) =>
      prevState.filter((task) => task.id !== id),
    );
  };

  const handleDeleteTask = async (id: number) => {
    await taskService.deleteTask(id);
  };

  const createTaskHandler = async () => {
    const task = await taskService.createTask({
      issueId: issue.id,
      title: "",
      completed: false,
      percent: 0,
    });

    setEditableTaskIds((prevState: Array<{ id: number; title: string }>) => [
      ...prevState,
      { id: task.id, title: "" },
    ]);
  };

  const handleCreateBlankBlocker = () => {
    setBlocker(true);
  };

  const handleSaveBlocker = async (blockerId: number) => {
    await blockerService.createBlocker({
      blockedId: issue.id,
      blockerId,
    });
    setBlocker(false);
  };

  const handleDeleteBlocker = async (blockerId: number) => {
    await blockerService.deleteBlocker(blockerId, issue.id);
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
          onClick={() => handleClose()}
        >
          <KeyboardArrowDownIcon />
        </IconButton>
        <TextField
          fullWidth
          defaultValue={issue.title}
          onChange={(e) => handleTitleUpdate(e.target.value)}
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
              <Typography sx={{ color: "#a5a5a5" }}>
                {requestedBy !== null ? requestedBy.name : ""}
              </Typography>
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
              }}
            >
              <IssueAutoCompleteComponent
                options={users.map((user: { name: string }) => user.name)}
                value={selectedUsers}
                onChange={handleSetUsers}
                inputValue={userInputValue}
                onInputChange={setUserTagInputValue}
                placeholder="Add owners..."
              />
            </Box>{" "}
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
      <Button
        sx={{ width: "150px" }}
        onClick={() => handleCreateBlankBlocker()}
      >
        <Typography sx={{ color: "#666", cursor: "pointer" }}>
          + Add blocker
        </Typography>
      </Button>
      {blocker && (
        <Box sx={{ mt: 1, width: "100%" }}>
          <Autocomplete
            options={issues
              .filter((i) => i.id !== issue.id)
              .map((issue: Issue) => issue.title)}
            renderInput={(params) => (
              <TextField
                sx={{
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  "& .MuiInputBase-input": {
                    color: "#000000",
                  },
                }}
                {...params}
                placeholder="Search for blocker type..."
                size="small"
              />
            )}
            onChange={(event: React.SyntheticEvent, newValue: string) => {
              const selectedIssue = issues.find((i) => i.title === newValue);
              if (selectedIssue) {
                handleSaveBlocker(selectedIssue.id);
              }
            }}
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === "Enter") {
                const inputValue = (event.target as HTMLInputElement).value;
                const selectedIssue = issues.find(
                  (i) => i.title === inputValue,
                );
                if (selectedIssue) {
                  handleSaveBlocker(selectedIssue.id);
                }
              }
            }}
            disableClearable
            fullWidth
          />
        </Box>
      )}
      {blockers.map((blocker: Blocker) => (
        <Box
          key={blocker.blockerId}
          sx={{
            mt: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
            border: "1px solid black",
            p: 1,
          }}
        >
          <Box
            sx={{
              border: "1px solid black",
              bgcolor: getBackgroundColor(
                (issues.find((i: Issue) => i.id === blocker.blockerId)
                  ?.status as number) || 0,
              ),
              width: "5px",
              height: "5px",
              p: 1,
            }}
          ></Box>
          <Typography variant="body2" sx={{ color: "grey" }}>
            #{issues.find((i: Issue) => i.id === blocker.blockerId)?.id}
          </Typography>
          <Typography variant="body2" sx={{ color: "grey" }}>
            {(
              issues.find((i: Issue) => i.id === blocker.blockerId)?.title || ""
            ).length > 50
              ? `${issues.find((i: Issue) => i.id === blocker.blockerId)?.title?.slice(0, 50)}...`
              : issues.find((i: Issue) => i.id === blocker.blockerId)?.title}
          </Typography>
          <Box
            sx={{
              marginLeft: "auto",
              border: "1px solid black",
              borderRadius: "4px",
            }}
          >
            <IconButton
              size="small"
              onClick={() => handleDeleteBlocker(blocker.blockerId)}
            >
              <Delete sx={{ fontSize: 16, color: "grey" }} />
            </IconButton>
          </Box>
        </Box>
      ))}
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
        onChange={handleSetSelectedTags}
        inputValue={tagInputValue}
        onInputChange={setTagInputValue}
        placeholder="Add labels..."
        handleCreateNew={handleCreateNewTag}
      />
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ width: "100%" }}
      >
        <Typography sx={{ color: "#666", fontWeight: "bold" }}>
          TASKS ({tasks.filter((t) => t.completed).length}/{tasks.length})
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            height: "3px",
            bgcolor: "#FFE082",
            borderRadius: "4px",
          }}
        >
          <Box
            sx={{
              width: `${tasks.length > 0 ? (tasks.filter((t) => t.completed).length / tasks.length) * 100 : 0}%`,
              height: "100%",
              bgcolor: "#4CAF50",
              borderRadius: "4px",
              transition: "width 0.3s ease-in-out",
            }}
          />
        </Box>
        <Typography sx={{ color: "#666", fontSize: "12px" }}>
          {tasks.length > 0
            ? Math.round(
                (tasks.filter((t) => t.completed).length / tasks.length) * 100,
              )
            : 0}
          %
        </Typography>
      </Stack>{" "}
      <Button onClick={createTaskHandler} sx={{ width: "150px" }}>
        <Typography sx={{ color: "#666", cursor: "pointer" }}>
          + Add a task
        </Typography>
      </Button>
      {tasks.map((task: Task) => (
        <Stack key={task.id} direction="row" spacing={1} alignItems="center">
          <Checkbox
            checked={task.completed}
            onChange={(e) => handleTaskComplete(task.id, e.target.checked)}
            sx={{ color: "#666" }}
          />
          {editableTaskIds.find(
            ({ id }: { id: number; title: string }) => id === task.id,
          ) ? (
            <>
              <TextField
                value={
                  editableTaskIds.find(({ id }) => id === task.id)?.title ?? ""
                }
                sx={{
                  bgcolor: "white",
                  "& .MuiInputBase-input": { color: "black" },
                }}
                fullWidth
                placeholder="Enter task title"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    handleSaveTask(
                      task.id,
                      editableTaskIds.find(({ id }) => id === task.id)?.title ??
                        "",
                    );
                  }
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditableTaskIds(
                    editableTaskIds.map(
                      (editableTask: { id: number; title: string }) =>
                        editableTask.id === task.id
                          ? { ...editableTask, title: e.target.value }
                          : editableTask,
                    ),
                  )
                }
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() =>
                        setEditableTaskIds(
                          editableTaskIds.map(
                            (editableTask: { id: number; title: string }) =>
                              editableTask.id === task.id
                                ? { ...editableTask, title: "" }
                                : editableTask,
                          ),
                        )
                      }
                    >
                      <Clear sx={{ color: "#666" }} />
                    </IconButton>
                  ),
                }}
              />{" "}
              <IconButton
                onClick={() =>
                  handleSaveTask(
                    task.id,
                    editableTaskIds.find(({ id }) => id === task.id)?.title ||
                      task.title,
                  )
                }
              >
                <Save sx={{ color: "#666" }} />
              </IconButton>{" "}
            </>
          ) : (
            <>
              <Typography sx={{ color: "#333", flexGrow: 1 }}>
                {task.title}
              </Typography>
              <IconButton onClick={() => handleEditTask(task.id, task.title)}>
                <Edit sx={{ color: "#666" }} />
              </IconButton>
            </>
          )}

          <IconButton onClick={() => handleDeleteTask(task.id)}>
            <Delete sx={{ color: "#666" }} />
          </IconButton>
        </Stack>
      ))}
      <Stack spacing={1}>
        <Typography sx={{ color: "#666", fontWeight: "bold" }}>
          Activity
        </Typography>

        {comments.map((comment: Comment) => (
          <React.Fragment key={comment.id}>
            <Stack spacing={1}>
              <Typography sx={{ color: "#666", fontSize: "12px" }}>
                Posted by{" "}
                {users.find((user: User) => user.id === comment.userId)?.name}{" "}
                on {new Date(comment.createdAt).toLocaleString()}{" "}
              </Typography>
              <Typography sx={{ color: "#333" }}>{comment.content}</Typography>
            </Stack>
            <hr />
          </React.Fragment>
        ))}

        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="Add a comment"
          sx={{
            bgcolor: "white",
            "& .MuiInputBase-input": { color: "black" },
          }}
          value={comment}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setComment(e.target.value)
          }
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey && comment.length >= 2) {
              e.preventDefault();
              handlePostComment();
            }
          }}
        />

        <Button
          variant="contained"
          disabled={!comment || comment.length < 2}
          sx={{ width: "200px", marginLeft: "auto", display: "block" }}
          onClick={handlePostComment}
        >
          Post Comment
        </Button>
      </Stack>{" "}
    </Stack>
  );
};
