import React, { useState } from "react";
import { Typography, Stack, Button, Box, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { Comment } from "../models/Comment";
import { User } from "../models/User";
import { commentService } from "../services/CommentService";
import MarkdownEditor from "./common/MarkdownEditor";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";

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

  const handlePostComment = async () => {
    await commentService.createComment({
      issueId: issueId,
      content: comment,
    });
    setComment("");
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

      <MarkdownEditor
        value={comment}
        onChange={(v) => setComment(v)}
        height={200}
        placeholder="Add a comment"
      />

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
