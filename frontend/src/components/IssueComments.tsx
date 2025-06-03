import React, { useState } from "react";
import {
  Typography,
  Stack,
  TextField,
  Button,
  Tabs,
  Tab,
  Box,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { Comment } from "../models/Comment";
import { User } from "../models/User";
import { commentService } from "../services/CommentService";
import ReactMarkdown from "react-markdown";

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
  const [activeTab, setActiveTab] = useState<number>(0);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [editingActiveTab, setEditingActiveTab] = useState<number>(0);

  const handlePostComment = async () => {
    await commentService.createComment({
      issueId: issueId,
      content: comment,
    });
    setComment("");
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditingTabChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ) => {
    setEditingActiveTab(newValue);
  };

  const handleEditComment = (commentToEdit: Comment) => {
    setEditingCommentId(commentToEdit.id);
    setEditingContent(commentToEdit.content);
    setEditingActiveTab(0);
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
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={editingActiveTab}
                    onChange={handleEditingTabChange}
                    aria-label="edit comment tabs"
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
                    <Tab label="Write" />
                    <Tab label="Preview" />
                  </Tabs>
                </Box>

                <Box
                  sx={{ display: editingActiveTab === 0 ? "block" : "none" }}
                >
                  <TextField
                    multiline
                    rows={4}
                    fullWidth
                    sx={{
                      bgcolor: "white",
                      "& .MuiInputBase-input": { color: "black" },
                      "& .MuiInputBase-root": {
                        resize: "vertical",
                        minHeight: "100px",
                        "& textarea": {
                          resize: "vertical",
                        },
                      },
                    }}
                    value={editingContent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingContent(e.target.value)
                    }
                  />
                </Box>

                <Box
                  sx={{
                    display: editingActiveTab === 1 ? "block" : "none",
                    bgcolor: "transparent",
                    minHeight: "100px",
                    border: "1px solid rgba(0, 0, 0, 0.23)",
                    borderRadius: "4px",
                    color: "black",
                    overflowY: "auto",
                    padding: "8px",
                  }}
                >
                  {editingContent ? (
                    <ReactMarkdown>{editingContent}</ReactMarkdown>
                  ) : (
                    <Typography sx={{ color: "#999", fontStyle: "italic" }}>
                      Nothing to preview
                    </Typography>
                  )}
                </Box>

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
              <Typography sx={{ color: "#333" }}>
                <ReactMarkdown>{comment.content}</ReactMarkdown>
              </Typography>
            )}
          </Stack>
          <hr />
        </React.Fragment>
      ))}

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="comment tabs"
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
          <Tab label="Write" />
          <Tab label="Preview" />
        </Tabs>
      </Box>

      <Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="Add a comment"
          sx={{
            bgcolor: "white",
            "& .MuiInputBase-input": { color: "black" },
            "& .MuiInputBase-root": {
              resize: "vertical",
              minHeight: "100px",
              "& textarea": {
                resize: "vertical",
              },
            },
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
      </Box>

      <Box
        sx={{
          display: activeTab === 1 ? "block" : "none",
          bgcolor: "transparent",
          minHeight: "100px",
          border: "1px solid rgba(0, 0, 0, 0.23)",
          borderRadius: "4px",
          color: "black",
          overflowY: "auto",
          padding: "8px",
        }}
      >
        {comment ? (
          <ReactMarkdown>{comment}</ReactMarkdown>
        ) : (
          <Typography sx={{ color: "#999", fontStyle: "italic" }}>
            Nothing to preview
          </Typography>
        )}
      </Box>

      <Button
        variant="contained"
        disabled={!comment || comment.length < 2}
        sx={{ width: "200px", marginLeft: "auto", display: "block" }}
        onClick={handlePostComment}
      >
        Post Comment
      </Button>
    </Stack>
  );
};

export default IssueComments;
