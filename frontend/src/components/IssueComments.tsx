import React, { useState, useRef } from "react";
import {
  Typography,
  Stack,
  Button,
  Box,
  IconButton,
  Alert,
  Chip,
  CircularProgress,
  Paper,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import { Comment } from "../models/Comment";
import { User } from "../models/User";
import { commentService } from "../services/CommentService";
import { uploadService } from "../services/UploadService";
import MarkdownEditor from "./common/MarkdownEditor";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";
import { useDragDropUpload } from "../hooks/useDragDropUpload";
import { FileUpload } from "../models/FileUpload";

interface IssueCommentsProps {
  issueId: number;
  comments: Comment[];
  users: User[];
}

const IssueComments: React.FC<IssueCommentsProps> = ({
  issueId,
  comments,
  users,
}) => {
  const [comment, setComment] = useState<string>("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isDragging,
    isUploading,
    uploadedFiles,
    errors,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    clearErrors,
    removeUploadedFile,
  } = useDragDropUpload({
    issueId,
    onUploadSuccess: (files: FileUpload[]) => {
      // You can add logic here to handle successful uploads
      console.log("Files uploaded successfully:", files);
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
    },
  });

  const handlePostComment = async () => {
    try {
      const newComment = await commentService.createComment({
        issueId: issueId,
        content: comment,
      });

      if (uploadedFiles.length > 0) {
        // Attach each uploaded file to the newly created comment
        await Promise.all(
          uploadedFiles.map((file) =>
            uploadService.attachToComment(newComment.id, file.id),
          ),
        );
        // Optionally clear attached files from the UI after successful attachment
        uploadedFiles.forEach((file) => removeUploadedFile(file.id));
      }

      setComment("");
    } catch (err) {
      console.error("Failed to post comment or attach files:", err);
    }
  };

  const handleEditComment = (commentToEdit: Comment) => {
    setEditingCommentId(commentToEdit.id);
    setEditingContent(commentToEdit.content);
  };

  const handleSaveComment = async () => {
    if (editingCommentId && editingContent.trim()) {
      await commentService.updateComment(editingCommentId, {
        content: editingContent,
      });
      setEditingCommentId(null);
      setEditingContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleDeleteComment = async (commentId: number) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      await commentService.deleteComment(commentId);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography sx={{ color: "#666", fontWeight: "bold" }}>
        Activity
      </Typography>

      {comments.map((comment: Comment) => (
        <React.Fragment key={comment.id}>
          <Stack spacing={1}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography sx={{ color: "#666", fontSize: "12px" }}>
                Posted by{" "}
                {users.find((user: User) => user.id === comment.userId)?.name}{" "}
                on {new Date(comment.createdAt).toLocaleString()}{" "}
              </Typography>
              <Box>
                <IconButton
                  size="small"
                  onClick={() => handleEditComment(comment)}
                  sx={{ color: "#666" }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteComment(comment.id)}
                  sx={{ color: "#666" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {editingCommentId === comment.id ? (
              <Stack spacing={1}>
                <MarkdownEditor
                  value={editingContent}
                  onChange={(v) => setEditingContent(v)}
                  height={200}
                />

                <Box
                  sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelEdit}
                    sx={{ color: "black", borderColor: "black" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={!editingContent.trim()}
                    onClick={handleSaveComment}
                  >
                    Save
                  </Button>
                </Box>
              </Stack>
            ) : (
              <Box sx={{ color: "#333" }}>
                <MDEditor.Markdown
                  source={comment.content}
                  remarkPlugins={[remarkGfm]}
                />
              </Box>
            )}
          </Stack>
          <hr />
        </React.Fragment>
      ))}

      <Box
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          position: "relative",
          border: isDragging ? "2px dashed #1976d2" : "2px dashed transparent",
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
              <CloudUploadIcon sx={{ fontSize: 48, color: "#1976d2" }} />
              <Typography variant="h6" color="primary">
                Drop files here to upload
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: PDF, Images, Text, Office documents
              </Typography>
            </Stack>
          </Paper>
        )}

        <MarkdownEditor
          value={comment}
          onChange={(v) => setComment(v)}
          height={200}
          placeholder="Add a comment"
        />
      </Box>

      {/* Error messages */}
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

      {/* Uploaded files display */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: "bold" }}>
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

      {/* File input and buttons */}
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
            accept=".pdf,.txt,.png,.jpg,.jpeg,.svg,.docx,.doc,.xlsx,.xls,.json,.md"
          />
          <Button
            variant="outlined"
            startIcon={
              isUploading ? <CircularProgress size={16} /> : <AttachFileIcon />
            }
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            sx={{ color: "black", borderColor: "black" }}
          >
            {isUploading ? "Uploading..." : "Attach Files"}
          </Button>
        </Box>

        <Button
          variant="contained"
          disabled={!comment || comment.length < 2 || isUploading}
          sx={{ width: "200px" }}
          onClick={handlePostComment}
        >
          Post Comment
        </Button>
      </Box>
    </Stack>
  );
};

export default IssueComments;
