import React, { useEffect, useRef, useState } from "react";
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
  Alert,
  Chip,
} from "@mui/material";
import {
  projectNoteService,
  CreateProjectNoteRequest,
} from "../services/ProjectNoteService";
import { ProjectNote } from "../models/ProjectNote";
import MDEditor from "@uiw/react-md-editor";
import MarkdownEditor from "./common/MarkdownEditor";
import {
  getHashtagRemarkPlugins,
  useHashtagClick,
} from "./common/hashtagMarkdown";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import AccessTime from "@mui/icons-material/AccessTime";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import useDebounce from "../utils/Debounce";
import { uploadService } from "../services/UploadService";
import { FileUpload } from "../models/FileUpload";
import UploadItem from "./UploadItem";
import { PARAM_HISTORY_PROJECT_NOTE_ID } from "./SearchComponent";
import { updateUrlWithParam } from "./IssueComponent";
import { PARAM_PROJECT_NOTE_TAG } from "./ProjectNoteTagComponent";

export const ProjectNotesComponent: React.FC = () => {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "update">("content");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDetail, setEditDetail] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const { debouncedUpdate } = useDebounce();
  const [filter, setFilter] = useState<string>("");

  const handleHistory = () => {
    if (expandedNoteId === null) return;
    updateUrlWithParam(
      PARAM_HISTORY_PROJECT_NOTE_ID,
      expandedNoteId.toString(),
    );
    window.dispatchEvent(new Event("urlchange"));
  };

  // Drag-and-drop and upload state (adapted from IssueComments)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [noteUploads, setNoteUploads] = useState<Record<number, FileUpload[]>>(
    {},
  );
  const contentPreviewRef = useRef<HTMLDivElement>(null);
  const onPreviewHashtagClick = React.useCallback((tag: string) => {
    updateUrlWithParam(PARAM_PROJECT_NOTE_TAG, tag);
    window.dispatchEvent(new Event("urlchange"));
  }, []);
  useHashtagClick(
    contentPreviewRef as React.RefObject<HTMLElement>,
    onPreviewHashtagClick,
    [editDetail],
  );

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

  const fetchUploadsForNote = async (noteId: number) => {
    try {
      const uploads = await uploadService.listForProjectNote(noteId);
      setNoteUploads((prev) => ({ ...prev, [noteId]: uploads }));
    } catch (e) {
      console.error("Failed to load uploads for note", e);
    }
  };

  const handleExpandNote = async (note: ProjectNote) => {
    if (expandedNoteId === note.id) {
      return;
    }
    setExpandedNoteId(note.id);
    setActiveTab("content");
    setEditTitle(note.title);
    setEditDetail(note.detail || "");

    // Reset upload UI state when switching notes
    setUploadedFiles([]);
    setErrors([]);
    setIsDragging(false);
    setIsUploading(false);

    // Load existing uploads for this note
    await fetchUploadsForNote(note.id);
  };

  const saveProjectNote = async (
    noteId: number,
    title: string,
    detail: string,
  ) => {
    try {
      await projectNoteService.updateProjectNote(noteId, {
        title,
        detail,
      });

      // Update the local state
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                title,
                detail,
              }
            : note,
        ),
      );

      return true;
    } catch (error) {
      console.error("Error updating note:", error);
      return false;
    }
  };

  const handleSaveNoteChanges = async () => {
    try {
      const noteToUpdate = notes.find((note) => note.id === expandedNoteId);
      if (!noteToUpdate) return;

      if (
        noteToUpdate.title !== editTitle ||
        noteToUpdate.detail !== editDetail
      ) {
        // Only update if there are changes
        const saveSuccess = await saveProjectNote(
          expandedNoteId as number,
          editTitle,
          editDetail,
        );
        if (!saveSuccess) return;
      }

      return true;
    } catch (error) {
      console.error("Error updating note:", error);
      return false;
    }
  };

  const handleCollapseAndSave = async () => {
    if (expandedNoteId === null) return;
    const success = await handleSaveNoteChanges();
    if (success) {
      setExpandedNoteId(null);
    }
  };

  const handleSaveNote = async () => {
    if (expandedNoteId === null) return;
    await handleSaveNoteChanges();
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

  const filteredNotes = React.useMemo(() => {
    if (!filter.trim()) return notes;
    const safe = filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");
    return notes.filter(
      (n: ProjectNote) => regex.test(n.title) || regex.test(n.detail || ""),
    );
  }, [notes, filter]);

  // Drag-and-drop handlers (adapted from useDragDropUpload)
  const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const clearErrors = () => setErrors([]);
  const removeUploadedFile = (fileId: number) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const validateFiles = (
    files: File[],
  ): { valid: File[]; errors: string[] } => {
    const maxFiles = 10;
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const valid: File[] = [];
    const errs: string[] = [];

    if (files.length > maxFiles) {
      errs.push(
        `Maximum ${maxFiles} files allowed. You tried to upload ${files.length} files.`,
      );
      return { valid: [], errors: errs };
    }

    for (const file of files) {
      if (file.size > maxFileSize) {
        errs.push(
          `${file.name}: File size exceeds maximum allowed size of ${Math.round(
            maxFileSize / (1024 * 1024),
          )}MB`,
        );
        continue;
      }
      const v = uploadService.validateFile(file);
      if (!v.valid) {
        errs.push(`${file.name}: ${v.error}`);
        continue;
      }
      valid.push(file);
    }

    return { valid, errors: errs };
  };

  const uploadFiles = async (files: File[]) => {
    if (!expandedNoteId) return;
    const { valid, errors: vErrors } = validateFiles(files);
    if (vErrors.length) setErrors(vErrors);
    if (!valid.length) return;

    setIsUploading(true);
    setErrors([]);
    try {
      const uploaded = await uploadService.uploadMultipleForProjectNote(
        expandedNoteId,
        valid,
      );
      setUploadedFiles((prev) => [...prev, ...uploaded]);
      setNoteUploads((prev) => ({
        ...prev,
        [expandedNoteId]: [...(prev[expandedNoteId] || []), ...uploaded],
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to upload files";
      setErrors((prev) => [...prev, msg]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      uploadFiles(Array.from(files));
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      uploadFiles(Array.from(files));
    }
  };

  const handleUploadDeleted = (noteId: number, fileId: number) => {
    setNoteUploads((prev) => ({
      ...prev,
      [noteId]: (prev[noteId] || []).filter((f) => f.id !== fileId),
    }));
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleTagClick = (tagName: string) => {
    updateUrlWithParam(PARAM_PROJECT_NOTE_TAG, tagName);
    window.dispatchEvent(new Event("urlchange"));
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
        <TextField
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
          placeholder="Filter notes..."
          sx={{
            ml: 2,
            width: 300,
            backgroundColor: "#ffffff",
            "& .MuiInputBase-input": { color: "#000000" },
          }}
        />
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
          {filteredNotes.map((note: ProjectNote) => (
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
                      ref={contentPreviewRef}
                      sx={{
                        bgcolor: "transparent",
                        minHeight: "100px",
                        border: "1px solid rgba(0, 0, 0, 0.23)",
                        borderRadius: "4px",
                        color: "black",
                        paddingLeft: "10px",
                        overflowY: "auto",
                        "& .hashtag-link:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      <MDEditor.Markdown
                        source={editDetail}
                        remarkPlugins={getHashtagRemarkPlugins(
                          onPreviewHashtagClick,
                        )}
                      />

                      {noteUploads[note.id] &&
                        noteUploads[note.id].length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Stack direction="row" gap={2} flexWrap="wrap">
                              {noteUploads[note.id].map((u) => (
                                <UploadItem
                                  key={u.id}
                                  upload={u}
                                  onDeleted={(id) =>
                                    handleUploadDeleted(note.id, id)
                                  }
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}
                    </Box>
                  ) : (
                    <Box>
                      <Box
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        sx={{
                          position: "relative",
                          border: isDragging
                            ? "2px dashed #1976d2"
                            : "2px dashed transparent",
                          borderRadius: "4px",
                          padding: isDragging ? "8px" : "0",
                          backgroundColor: isDragging
                            ? "rgba(25, 118, 210, 0.05)"
                            : "transparent",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {isDragging && (
                          <Paper
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              borderRadius: "4px",
                            }}
                          >
                            <Stack alignItems="center" spacing={2}>
                              <CloudUploadIcon
                                sx={{ fontSize: 48, color: "#1976d2" }}
                              />
                              <Typography variant="h6" color="primary">
                                Drop files here to upload
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Supported formats: PDF, Images, Text, Office
                                documents, ZIP
                              </Typography>
                            </Stack>
                          </Paper>
                        )}

                        <MarkdownEditor
                          value={editDetail}
                          onChange={(v: string) => {
                            setEditDetail(v);
                            debouncedUpdate(async () => {
                              if (expandedNoteId === null) return;
                              await saveProjectNote(
                                expandedNoteId,
                                editTitle,
                                v,
                              );
                            });
                          }}
                          onHashtagClick={handleTagClick}
                          height={240}
                          placeholder="Update note details..."
                          withTabs={false}
                        />
                      </Box>

                      {errors.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          {errors.map((error, index) => (
                            <Alert
                              key={index}
                              severity="error"
                              onClose={clearErrors}
                              sx={{ mb: 1 }}
                            >
                              {error}
                            </Alert>
                          ))}
                        </Box>
                      )}

                      {uploadedFiles.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="body2"
                            sx={{ mb: 1, fontWeight: "bold" }}
                          >
                            Attached Files:
                          </Typography>
                          <Stack direction="row" flexWrap="wrap" gap={1}>
                            {uploadedFiles.map((file) => (
                              <Chip
                                key={file.id}
                                label={file.originalFilename}
                                icon={<AttachFileIcon />}
                                onDelete={() => removeUploadedFile(file.id)}
                                deleteIcon={<CloseIcon />}
                                variant="outlined"
                                size="small"
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mt: 2,
                        }}
                      >
                        <Box>
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => handleFileSelect(e.target.files)}
                            accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.svg,.docx,.doc,.xlsx,.xls,.json,.md,.zip"
                          />
                          <Button
                            variant="outlined"
                            startIcon={
                              isUploading ? (
                                <CircularProgress size={16} />
                              ) : (
                                <AttachFileIcon />
                              )
                            }
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || !expandedNoteId}
                            sx={{ color: "black", borderColor: "black" }}
                          >
                            {isUploading ? "Uploading..." : "Attach Files"}
                          </Button>
                        </Box>
                      </Box>

                      {noteUploads[note.id] &&
                        noteUploads[note.id].length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography
                              variant="body2"
                              sx={{ mb: 1, fontWeight: "bold" }}
                            >
                              Files on this note:
                            </Typography>
                            <Stack direction="row" gap={2} flexWrap="wrap">
                              {noteUploads[note.id].map((u) => (
                                <UploadItem
                                  key={u.id}
                                  upload={u}
                                  onDeleted={(id) =>
                                    handleUploadDeleted(note.id, id)
                                  }
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}
                    </Box>
                  )}
                  {/* Action buttons at the bottom */}
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}
                  >
                    <IconButton
                      size="small"
                      sx={{
                        color: "#000000",
                      }}
                      title="See history of this note"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHistory();
                      }}
                    >
                      <AccessTime />
                    </IconButton>
                    <IconButton
                      onClick={() => handleSaveNote()}
                      size="small"
                      color="primary"
                      title="Save note"
                      sx={{ mr: 1 }}
                    >
                      <SaveIcon />
                    </IconButton>
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
