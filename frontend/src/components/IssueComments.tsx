import React, { useState } from "react";
import {
  Typography,
  Stack,
  TextField,
  Button,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
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

  return (
    <Stack spacing={1}>
      <Typography sx={{ color: "#666", fontWeight: "bold" }}>
        Activity
      </Typography>

      {comments.map((comment: Comment) => (
        <React.Fragment key={comment.id}>
          <Stack spacing={1}>
            <Typography sx={{ color: "#666", fontSize: "12px" }}>
              Posted by{" "}
              {users.find((user: User) => user.id === comment.userId)?.name} on{" "}
              {new Date(comment.createdAt).toLocaleString()}{" "}
            </Typography>
            <Typography sx={{ color: "#333" }}>
              <ReactMarkdown>{comment.content}</ReactMarkdown>
            </Typography>
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
