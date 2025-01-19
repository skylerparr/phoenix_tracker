import React, { useState } from "react";
import { TextField, Box, Button } from "@mui/material";
import { issueService } from "../services/IssueService";
import { sessionStorage } from "../store/Session";
import { STATUS_UNSTARTED } from "../services/StatusService";
import PointsButton from "./PointsButtons";
import WorkTypeButtons from "./WorkTypeButtons";
import { tagService } from "../services/TagService";
import { issueTagService } from "../services/IssueTagService";
import { POINTS, WORK_TYPE_FEATURE, WORK_TYPE_RELEASE } from "../models/Issue";
import IssueAutoCompleteComponent from "./IssueAutoCompleteComponent";
import { userService } from "../services/UserService";
import { issueAssigneeService } from "../services/IssueAssigneeService";
import { Tag } from "../models/Tag";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Dayjs } from "dayjs";

const CreateIssue: React.FC = () => {
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeInputValue, setAssigneeInputValue] = useState("");
  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [targetReleaseDate, setTargetReleaseDate] = useState<Dayjs | null>(
    null,
  );

  React.useEffect(() => {
    const fetchData = async () => {
      await fetchUsers();
      tagService.subscribeToGetAllTags(fetchTags);
    };
    fetchData();

    return () => {
      tagService.unsubscribeFromGetAllTags(fetchTags);
    };
  }, []);

  const fetchUsers = async () => {
    const users = await userService.getAllUsers();
    setAvailableAssignees(users.map((user) => user.name));
  };

  const fetchTags = (tags: Tag[]) => {
    setAllTags(tags);
    setAvailableTags(tags.map((tag) => tag.name));
  };

  const handleCreateIssue = async () => {
    const currentProject = sessionStorage.getProject();
    const currentUser = sessionStorage.getSession().user;

    if (!currentProject || !currentUser) return;

    try {
      const issue = await issueService.createIssue({
        title,
        description,
        points: selectedPoints,
        priority: 0,
        status: STATUS_UNSTARTED,
        isIcebox: false,
        workType: selectedType!,
        targetReleaseAt:
          selectedType === WORK_TYPE_RELEASE
            ? targetReleaseDate?.toDate()
            : null,
      });

      const selectedTagIds = selectedTags
        .map((selectedTagName: string) => {
          const tag = allTags.find((tag: Tag) => tag.name === selectedTagName);
          return tag ? tag.id : null;
        })
        .filter((id): id is number => id !== null);

      for (const tagId of selectedTagIds) {
        await issueTagService.createIssueTag({
          issueId: issue.id,
          tagId: tagId,
        });
      }

      const users = await userService.getAllUsers();
      const selectedUserIds = selectedAssignees
        .map((selectedUserName: string) => {
          const user = users.find((user) => user.name === selectedUserName);
          return user ? user.id : null;
        })
        .filter((id): id is number => id !== null);

      for (const userId of selectedUserIds) {
        await issueAssigneeService.createIssueAssignee({
          issueId: issue.id,
          userId: userId,
        });
      }

      setTitle("");
      setDescription("");
      setSelectedType(null);
      setSelectedTags([]);
      setSelectedAssignees([]);
      setSelectedPoints(null);
    } catch (error) {
      console.error("Failed to create issue:", error);
    }
  };

  const handleCreateNewTag = async (newTagName: string) => {
    await tagService.createTag({
      name: newTagName,
      isEpic: false,
    });
  };

  const getChipColor = (tagName: string) => {
    const tag = allTags.find((t) => t.name === tagName);
    return tag?.isEpic ? "#673ab7" : "#2e7d32";
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        bgcolor: "#6a7a6a",
        p: 2,
        boxShadow: 3,
      }}
    >
      <TextField
        fullWidth
        placeholder="Title"
        variant="outlined"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        sx={{
          backgroundColor: "#f6f6f6",
          color: "#4a4a4a",
          boxShadow: "inset 0 1px 5px rgba(0,0,0,0.3)",
          "& .MuiInputBase-input": {
            color: "#4a4a4a",
          },
        }}
      />
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <WorkTypeButtons
          selectedWorkType={selectedType}
          onWorkTypeSelect={(workType: number) =>
            setSelectedType(workType === selectedType ? null : workType)
          }
        />
      </Box>
      {selectedType === WORK_TYPE_FEATURE && (
        <Box sx={{ display: "flex", gap: 0, alignItems: "center" }}>
          {POINTS.map((points) => (
            <PointsButton
              key={points}
              points={points}
              isSelected={selectedPoints === points}
              onPointsSelect={(points: number) =>
                setSelectedPoints(points === selectedPoints ? null : points)
              }
            />
          ))}
        </Box>
      )}
      {[
        {
          id: "1",
          options: availableAssignees,
          value: selectedAssignees,
          onChange: setSelectedAssignees,
          inputValue: assigneeInputValue,
          onInputChange: setAssigneeInputValue,
          placeholder: "Add assignees...",
        },
        {
          id: "2",
          options: availableTags,
          value: selectedTags,
          onChange: setSelectedTags,
          inputValue: inputValue,
          onInputChange: setInputValue,
          onCreateNew: handleCreateNewTag,
          placeholder: "Add labels...",
          getChipColor: getChipColor,
        },
      ]
        .filter(
          (item) => !(item.id === "1" && selectedType === WORK_TYPE_RELEASE),
        )
        .map(
          ({
            id,
            options,
            value,
            onChange,
            inputValue,
            onInputChange,
            onCreateNew,
            placeholder,
            getChipColor,
          }) => (
            <IssueAutoCompleteComponent
              key={id}
              options={options}
              value={value}
              onChange={onChange}
              inputValue={inputValue}
              onInputChange={onInputChange}
              placeholder={placeholder}
              handleCreateNew={onCreateNew}
              getChipColor={getChipColor}
            />
          ),
        )}
      {selectedType === WORK_TYPE_RELEASE && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Target Release Date"
            value={targetReleaseDate}
            onChange={(newValue) => setTargetReleaseDate(newValue)}
            slotProps={{
              textField: {
                sx: {
                  backgroundColor: "#f6f6f6",
                  "& .MuiInputBase-root": {
                    color: "#4a4a4a",
                  },
                  "& .MuiInputLabel-root": {
                    color: "#4a4a4a",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "#4a4a4a",
                  },
                },
              },
            }}
            sx={{
              width: "100%",
            }}
          />
        </LocalizationProvider>
      )}
      <TextField
        fullWidth
        placeholder="Description"
        variant="outlined"
        multiline
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={{
          backgroundColor: "#f6f6f6",
          color: "#4a4a4a",
          boxShadow: "inset 0 1px 5px rgba(0,0,0,0.3)",
          "& .MuiInputBase-input": {
            color: "#4a4a4a",
          },
        }}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleCreateIssue}
          disabled={!title.trim() || selectedType === null}
          sx={{
            bgcolor: "primary.main",
            width: "140px",
            "&:hover": {
              bgcolor: "primary.dark",
            },
          }}
        >
          Create Issue
        </Button>
      </Box>
    </Box>
  );
};

export default CreateIssue;
