import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  IconButton,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import {
  projectNoteService,
  CreateProjectNoteRequest,
} from "../services/ProjectNoteService";
import { ProjectNote } from "../models/ProjectNote";
import ReactMarkdown from "react-markdown";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DeleteIcon from "@mui/icons-material/Delete";

export const ProjectNotesComponent: React.FC = () => {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "update">("content");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDetail, setEditDetail] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const fetchedNotes =
          await projectNoteService.getProjectNotesByProject();
        setNotes(fetchedNotes);
      } catch (error) {
        console.error("Error fetching project notes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const handleCreateNewNote = async () => {
    try {
      const newProjectNote: CreateProjectNoteRequest = {
        title: "New Note",
        detail: "",
      };
      const newNote =
        await projectNoteService.createProjectNote(newProjectNote);
      setNotes((prevNotes: ProjectNote[]) => [...prevNotes, newNote]);
    } catch (error) {
      console.error("Error creating project note:", error);
    }
  };

  const handleExpandNote = (note: ProjectNote) => {
    if (expandedNoteId === note.id) {
      return;
    }
    setExpandedNoteId(note.id);
    setActiveTab("content");
    setEditTitle(note.title);
    setEditDetail(note.detail || "");
  };

  const handleCollapseAndSave = async () => {
    if (expandedNoteId === null) return;

    try {
      const noteToUpdate = notes.find((note) => note.id === expandedNoteId);
      if (!noteToUpdate) return;

      if (
        noteToUpdate.title !== editTitle ||
        noteToUpdate.detail !== editDetail
      ) {
        // Only update if there are changes
        await projectNoteService.updateProjectNote(expandedNoteId, {
          title: editTitle,
          detail: editDetail,
        });

        // Update the local state
        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note.id === expandedNoteId
              ? {
                  ...note,
                  title: editTitle,
                  detail: editDetail,
                }
              : note,
          ),
        );
      }

      setExpandedNoteId(null);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleDeleteNote = async () => {
    if (expandedNoteId === null) return;

    try {
      await projectNoteService.deleteProjectNote(expandedNoteId);

      // Update the local state by removing the deleted note
      setNotes((prevNotes) =>
        prevNotes.filter((note) => note.id !== expandedNoteId),
      );

      // Close the delete dialog and expanded view
      setDeleteDialogOpen(false);
      setExpandedNoteId(null);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleTabChange = (tab: "content" | "update") => {
    setActiveTab(tab);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleCreateNewNote()}
          sx={{
            borderRadius: 1,
            bgcolor: "#437aa2",
            "&:hover": {
              bgcolor: "#326491",
            },
          }}
        >
          Create new note
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress />
        </Box>
      ) : notes.length === 0 ? (
        <Typography sx={{ color: "#ababab", p: 2 }}>
          No project notes available
        </Typography>
      ) : (
        <Stack spacing={1}>
          {notes.map((note: ProjectNote) => (
            <Paper
              key={note.id}
              elevation={1}
              sx={{
                borderRadius: 1,
                width: "100%",
                bgcolor: expandedNoteId === note.id ? "#f9f9f9" : "#f5f5f5",
                padding: 0,
                margin: 0,
                "&:hover": {
                  bgcolor: "#e0e0e0",
                  transition: "background-color 0.2s ease",
                },
              }}
            >
              {expandedNoteId === note.id ? (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <IconButton onClick={handleCollapseAndSave} size="small">
                      <KeyboardArrowUpIcon sx={{ color: "black" }} />
                    </IconButton>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      sx={{
                        backgroundColor: "#f6f6f6",
                        color: "#4a4a4a",
                        boxShadow: "inset 0 1px 5px rgba(0,0,0,0.3)",
                        "& .MuiInputBase-input": {
                          color: "#4a4a4a",
                        },
                      }}
                    />
                  </Box>

                  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                    <Tabs
                      value={activeTab}
                      onChange={(_, newValue) => handleTabChange(newValue)}
                      aria-label="note tabs"
                      textColor="inherit"
                      indicatorColor="primary"
                      sx={{
                        "& .MuiTab-root": {
                          color: "black",
                          "&.Mui-selected": {
                            color: "black",
                            backgroundColor: "rgba(0, 0, 0, 0.05)",
                            borderTopLeftRadius: "4px",
                            borderTopRightRadius: "4px",
                          },
                        },
                        "& .MuiTabs-indicator": {
                          backgroundColor: "black",
                        },
                      }}
                    >
                      <Tab label="Content" value="content" />
                      <Tab label="Update" value="update" />
                    </Tabs>
                  </Box>

                  {activeTab === "content" ? (
                    <Box
                      sx={{
                        bgcolor: "transparent",
                        minHeight: "100px",
                        border: "1px solid rgba(0, 0, 0, 0.23)",
                        borderRadius: "4px",
                        color: "black",
                        paddingLeft: "10px",
                        overflowY: "auto",
                      }}
                    >
                      <ReactMarkdown>{editDetail}</ReactMarkdown>
                    </Box>
                  ) : (
                    <Box sx={{}}>
                      <TextField
                        multiline
                        fullWidth
                        placeholder="Add a comment"
                        sx={{
                          bgcolor: "white",
                          "& .MuiInputBase-input": { color: "black" },
                          "& .MuiInputBase-root": {
                            resize: "vertical",
                            minHeight: "100px",
                            "& textarea": {
                              resize: "none",
                              overflow: "hidden",
                              minHeight: "100px",
                            },
                          },
                        }}
                        value={editDetail}
                        onChange={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                          setEditDetail(e.target.value);
                        }}
                      />
                    </Box>
                  )}

                  {/* Delete button at the bottom */}
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}
                  >
                    <IconButton
                      onClick={() => setDeleteDialogOpen(true)}
                      size="small"
                      color="error"
                      title="Delete note"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box
                  onClick={() => handleExpandNote(note)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <IconButton size="small">
                    <KeyboardArrowDownIcon sx={{ color: "black" }} />
                  </IconButton>
                  <Box sx={{ width: "100%" }}>
                    <Typography
                      sx={{
                        color: "#000000",
                        fontWeight: "medium",
                      }}
                    >
                      {note.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#000000",
                        fontSize: "12px",
                        mt: 0.5,
                      }}
                    >
                      Created on {new Date(note.createdAt).toLocaleString()}
                    </Typography>
                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                      <Typography
                        sx={{
                          color: "#000000",
                          fontSize: "12px",
                        }}
                      >
                        Updated on {new Date(note.updatedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Delete Note"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this note? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteNote} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
