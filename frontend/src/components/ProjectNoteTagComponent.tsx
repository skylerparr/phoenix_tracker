import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Divider,
  IconButton,
  TextField,
  Link,
} from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon } from "@mui/icons-material";
import { useSearchParams } from "../hooks/useSearchParams";
import { projectNoteTagService } from "../services/ProjectNoteTagService";
import { ProjectNoteTag } from "../models/ProjectNoteTag";
import { projectNotePartService } from "../services/ProjectNotePartService";
import { useHashtagClick } from "./common/hashtagMarkdown";
import { updateUrlWithParam } from "./IssueComponent";

export const PARAM_PROJECT_NOTE_TAG = "projectNoteTag";
export const PARAM_PROJECT_NOTE_ID = "projectNoteId";

export const ProjectNoteTagComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const [projectNoteTag, setProjectNoteTag] = useState<ProjectNoteTag | null>(
    null,
  );
  const [editingPartId, setEditingPartId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");

  const onHashtagClick = React.useCallback((tag: string) => {
    updateUrlWithParam(PARAM_PROJECT_NOTE_TAG, tag);
    window.dispatchEvent(new Event("urlchange"));
  }, []);

  useHashtagClick(
    contentContainerRef as React.RefObject<HTMLElement>,
    onHashtagClick,
    [projectNoteTag],
  );

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
      const updatedNotes = projectNoteTag.projectNoteParts.map((note) => ({
        ...note,
        parts: note.parts.map((part) =>
          part.id === partId ? { ...part, content: editingContent } : part,
        ),
      }));
      setProjectNoteTag({
        ...projectNoteTag,
        projectNoteParts: updatedNotes,
      });
      setEditingPartId(null);
      setEditingContent("");

      await projectNotePartService.updateProjectNotePartContent(partId, {
        content: editingContent,
      });
    }
  };

  const handleProjectNoteTitleClick = (projectNoteId: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM_PROJECT_NOTE_ID, projectNoteId.toString());
    // Preserve the projectNoteTag if it exists
    const currentTag = searchParams.get(PARAM_PROJECT_NOTE_TAG);
    if (currentTag) {
      url.searchParams.set(PARAM_PROJECT_NOTE_TAG, currentTag);
    }
    window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("urlchange"));
  };

  const handleHashtagClick = (tag: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM_PROJECT_NOTE_TAG, tag);
    window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("urlchange"));
  };

  const renderContentWithHashtags = (content: string) => {
    const hashtagRegex = /(#\w+)/g;
    const parts = content.split(hashtagRegex);

    return parts.map((part, index) => {
      if (part.match(hashtagRegex)) {
        const tag = part.substring(1); // Remove the # prefix
        return (
          <Link
            key={index}
            component="span"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleHashtagClick(tag);
            }}
            sx={{
              cursor: "pointer",
              color: "#1976d2",
              textDecoration: "none",
              fontWeight: 500,
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            {part}
          </Link>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
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
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", color: "blue", p: 0 }}
        >
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
        projectNoteTag.projectNoteParts.map((note, noteIndex) => (
          <React.Fragment key={note.id}>
            <Box
              sx={{
                p: 0.5,
                backgroundColor: "#e8e8e8",
                borderBottom: "1px solid #cccccc",
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "#d0d0d0",
                },
              }}
              onClick={() => handleProjectNoteTitleClick(note.id)}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: "bold",
                  color: "#1976d2",
                  textDecoration: "underline",
                }}
              >
                {note.title}
              </Typography>
            </Box>
            {note.parts.map((part, partIndex) => (
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
                        onKeyDown={(
                          e: React.KeyboardEvent<HTMLInputElement>,
                        ) => {
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
                            pt: 0.7,
                            ml: 0.5,
                          }}
                        >
                          {renderContentWithHashtags(part.content)}
                        </Typography>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(part.id, part.content)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon sx={{ color: "#666666", fontSize: "10" }} />
                      </IconButton>
                    </>
                  )}
                </Box>
                {partIndex < note.parts.length - 1 && (
                  <Divider sx={{ bgcolor: "#e0e0e0" }} />
                )}
              </React.Fragment>
            ))}
            {noteIndex < projectNoteTag.projectNoteParts.length - 1 && (
              <Divider sx={{ bgcolor: "#666666", height: "2px" }} />
            )}
          </React.Fragment>
        ))
      )}
    </Box>
  );
};
