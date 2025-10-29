import React, { useEffect, useState } from "react";
import { Box, Typography, Divider, IconButton, TextField } from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon } from "@mui/icons-material";
import { useSearchParams } from "../hooks/useSearchParams";
import { projectNoteTagService } from "../services/ProjectNoteTagService";
import { ProjectNoteTag } from "../models/ProjectNoteTag";
import { projectNotePartService } from "../services/ProjectNotePartService";

export const PARAM_PROJECT_NOTE_TAG = "projectNoteTag";

export const ProjectNoteTagComponent: React.FC = () => {
  const searchParams = useSearchParams();

  const [projectNoteTag, setProjectNoteTag] = useState<ProjectNoteTag | null>(
    null,
  );
  const [editingPartId, setEditingPartId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");

  useEffect(() => {
    const projectNoteTag = searchParams.get(PARAM_PROJECT_NOTE_TAG);

    if (projectNoteTag) {
      fetchProjectNotePartsByTag(projectNoteTag);
    }
  }, [searchParams]);

  const fetchProjectNotePartsByTag = async (tag: string) => {
    const fetchedTag =
      await projectNoteTagService.getProjectNoteTagByTagName(tag);
    if (fetchedTag) {
      setProjectNoteTag(fetchedTag);
    }
  };

  const handleEditClick = (partId: number, content: string | null) => {
    setEditingPartId(partId);
    setEditingContent(content || "enter");
  };

  const handleSaveClick = async (partId: number) => {
    if (projectNoteTag) {
      // Update the local state first
      const updatedParts = projectNoteTag.projectNoteParts.map((part) =>
        part.id === partId ? { ...part, content: editingContent } : part,
      );
      setProjectNoteTag({
        ...projectNoteTag,
        projectNoteParts: updatedParts,
      });
      setEditingPartId(null);
      setEditingContent("");

      await projectNotePartService.updateProjectNotePartContent(partId, {
        content: editingContent,
      });
    }
  };

  if (!projectNoteTag) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          p: 2,
        }}
      >
        <Typography color="textSecondary">
          No project note parts found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "#f5f5f5", color: "black" }}>
      <Box
        sx={{
          p: 1,
          backgroundColor: "white",
          borderBottom: "1px solid #666666",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "black" }}>
          #{projectNoteTag.tagName}
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: "#666666" }} />
      {projectNoteTag.projectNoteParts.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography color="textSecondary">
            No parts found for this tag
          </Typography>
        </Box>
      ) : (
        projectNoteTag.projectNoteParts.map((part, index) => (
          <React.Fragment key={part.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                p: 0,
                "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              }}
            >
              {editingPartId === part.id ? (
                <>
                  <TextField
                    value={editingContent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingContent(e.target.value)
                    }
                    size="small"
                    autoFocus
                    fullWidth
                    multiline
                    maxRows={4}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        handleSaveClick(part.id);
                      } else if (e.key === "Escape") {
                        setEditingPartId(null);
                        setEditingContent("");
                      }
                    }}
                    sx={{
                      backgroundColor: "white",
                      pl: 1,
                      "& .MuiOutlinedInput-input": {
                        color: "black",
                      },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleSaveClick(part.id)}
                    sx={{ mr: 1 }}
                  >
                    <SaveIcon sx={{ color: "green", fontSize: "12" }} />
                  </IconButton>
                </>
              ) : (
                <>
                  {part.content && (
                    <Typography
                      sx={{
                        color: "black",
                        flex: 1,
                        pl: 1,
                      }}
                    >
                      {part.content}
                    </Typography>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleEditClick(part.id, part.content)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon sx={{ color: "#666666", fontSize: "12" }} />
                  </IconButton>
                </>
              )}
            </Box>
            {index < projectNoteTag.projectNoteParts.length - 1 && (
              <Divider sx={{ bgcolor: "#666666" }} />
            )}
          </React.Fragment>
        ))
      )}
    </Box>
  );
};
