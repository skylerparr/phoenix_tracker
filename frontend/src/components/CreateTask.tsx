import React, { useEffect, useState } from "react";
import {
  TextField,
  IconButton,
  Tooltip,
  Box,
  Autocomplete,
  Chip,
  Button,
} from "@mui/material";
import {
  BugReport,
  Build,
  Engineering,
  Rocket,
  ContentCopy,
} from "@mui/icons-material";

const CreateTask: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeInputValue, setAssigneeInputValue] = useState("");
  const [availableAssignees] = useState<string[]>([
    "John",
    "Jane",
    "Bob",
    "Alice",
  ]); // Example assignees

  const handleTypeSelect = (type: string) => {
    setSelectedType(type === selectedType ? null : type);
  };

  // Example tags - replace with your actual data source
  const availableTags = [
    "frontend",
    "backend",
    "urgent",
    "documentation",
    "testing",
    "design",
    "database",
    "api",
    "ui",
    "ux",
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        bgcolor: "grey.700",
        p: 2,
        boxShadow: 3,
      }}
    >
      <TextField fullWidth placeholder="Title" variant="outlined" />
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Tooltip title="Feature">
          <IconButton
            onClick={() => handleTypeSelect("feature")}
            sx={{
              backgroundColor:
                selectedType === "feature" ? "action.selected" : "transparent",
              "&:hover": {
                backgroundColor:
                  selectedType === "feature"
                    ? "action.selected"
                    : "action.hover",
              },
            }}
          >
            <Engineering />
          </IconButton>
        </Tooltip>
        <Tooltip title="Bug">
          <IconButton
            onClick={() => handleTypeSelect("bug")}
            sx={{
              backgroundColor:
                selectedType === "bug" ? "action.selected" : "transparent",
              "&:hover": {
                backgroundColor:
                  selectedType === "bug" ? "action.selected" : "action.hover",
              },
            }}
          >
            <BugReport />
          </IconButton>
        </Tooltip>
        <Tooltip title="Chore">
          <IconButton
            onClick={() => handleTypeSelect("chore")}
            sx={{
              backgroundColor:
                selectedType === "chore" ? "action.selected" : "transparent",
              "&:hover": {
                backgroundColor:
                  selectedType === "chore" ? "action.selected" : "action.hover",
              },
            }}
          >
            <Build />
          </IconButton>
        </Tooltip>
        <Tooltip title="Release">
          <IconButton
            onClick={() => handleTypeSelect("release")}
            sx={{
              backgroundColor:
                selectedType === "release" ? "action.selected" : "transparent",
              "&:hover": {
                backgroundColor:
                  selectedType === "release"
                    ? "action.selected"
                    : "action.hover",
              },
            }}
          >
            <Rocket />
          </IconButton>
        </Tooltip>
        <Box sx={{ display: "flex", gap: 0, flex: 1 }}>
          <TextField
            disabled
            fullWidth
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
              },
            }}
          />
          <Tooltip title="Copy link to this issue">
            <IconButton
              sx={{
                borderRadius: 0,
                height: "40px",
                width: "40px",
                backgroundColor: "grey.800",
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
                "&:hover": {
                  backgroundColor: "grey.700",
                },
              }}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box component="label" sx={{ color: "text.primary" }}>
          Create by
        </Box>
        <TextField
          disabled
          value="default"
          size="small"
          variant="outlined"
          sx={{ width: "200px" }}
        />
      </Box>
      {[
        {
          options: availableAssignees,
          value: selectedAssignees,
          onChange: setSelectedAssignees,
          inputValue: assigneeInputValue,
          onInputChange: setAssigneeInputValue,
          placeholder: "Add assignees...",
        },
        {
          options: availableTags,
          value: selectedTags,
          onChange: setSelectedTags,
          inputValue: inputValue,
          onInputChange: setInputValue,
          placeholder: "Add tags...",
        },
      ].map(
        ({
          options,
          value,
          onChange,
          inputValue,
          onInputChange,
          placeholder,
        }) => (
          <Autocomplete
            key={placeholder}
            multiple
            freeSolo
            options={options}
            value={value}
            onChange={(event: React.SyntheticEvent, newValue: string[]) =>
              onChange(newValue)
            }
            inputValue={inputValue}
            onInputChange={(
              event: React.SyntheticEvent,
              newInputValue: string,
            ) => onInputChange(newInputValue)}
            renderTags={(value: string[], getTagProps: any) =>
              value.map((option: string, index: number) => (
                <Chip label={option} {...getTagProps({ index })} size="small" />
              ))
            }
            renderInput={(
              params: React.JSX.IntrinsicAttributes &
                import("@mui/material").TextFieldProps,
            ) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                placeholder={value.length === 0 ? placeholder : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                  },
                }}
              />
            )}
          />
        ),
      )}{" "}
      <TextField
        fullWidth
        placeholder="Description"
        variant="outlined"
        multiline
        rows={4}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="contained"
          sx={{
            bgcolor: "primary.main",
            width: "140px",
            "&:hover": {
              bgcolor: "primary.dark",
            },
          }}
        >
          Create Task
        </Button>
      </Box>
    </Box>
  );
};

export default CreateTask;
