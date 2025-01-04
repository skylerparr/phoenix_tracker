import React, { useState } from "react";
import { TextField, Box, Autocomplete, Chip, Button } from "@mui/material";
import { issueService } from "../services/IssueService";
import { sessionStorage } from "../store/Session";
import { STATUS_READY } from "../services/StatusService";
import PointsButton from "./PointsButtons";
import WorkTypeButtons from "./WorkTypeButtons";
import { tagService } from "../services/TagService";
import { issueTagService } from "../services/IssueTagService";
import { POINTS } from "../models/Issue";
import IssueAutoCompleteComponent from "./IssueAutoCompleteComponent";

const CreateIssue: React.FC = () => {
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeInputValue, setAssigneeInputValue] = useState("");
  const [availableAssignees] = useState<string[]>([
    "John",
    "Jane",
    "Bob",
    "Alice",
  ]);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

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
        status: STATUS_READY,
        isIcebox: false,
        workType: selectedType!,
      });

      const tags = await tagService.getAllTags();
      const selectedTagIds = selectedTags
        .map((selectedTagName: string) => {
          const tag = tags.find((tag) => tag.name === selectedTagName);
          return tag ? tag.id : null;
        })
        .filter((id): id is number => id !== null);

      for (const tagId of selectedTagIds) {
        await issueTagService.createIssueTag({
          issueId: issue.id,
          tagId: tagId,
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
    await fetchTags();
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
        },
      ].map(
        ({
          id,
          options,
          value,
          onChange,
          inputValue,
          onInputChange,
          onCreateNew,
          placeholder,
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
          />
        ),
      )}{" "}
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
