import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Checkbox,
} from "@mui/material";
import { userService } from "../services/UserService";
import { commentService } from "../services/CommentService";
import { projectService } from "../services/ProjectService";
import { issueService } from "../services/IssueService";
import { ownerService } from "../services/OwnerService";
import { tagService } from "../services/TagService";
import RequireAuth from "../components/RequireAuth";

const RouteTest = () => {
  // User Form States
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    userId: "",
  });

  // Comment Form States
  const [commentForm, setCommentForm] = useState({
    content: "",
    userId: "",
    issueId: "",
    commentId: "",
  });

  // Project Form States
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    ownerId: "",
    projectId: "",
  });

  // Issue Form States
  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    projectId: "",
    userId: "",
    issueId: "",
  });

  // Owner Form States
  const [ownerForm, setOwnerForm] = useState({
    userId: "",
    ownerId: "",
  });

  // Tag Form States
  const [tagForm, setTagForm] = useState({
    name: "",
    color: 0,
    isEpic: false,
    tagId: "",
  });

  return (
    <RequireAuth>
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            API Route Testing
          </Typography>

          {/* User Routes Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">User Routes</Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}
            >
              <TextField
                label="Name"
                value={userForm.name}
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
              />
              <TextField
                label="Email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
              />
              <TextField
                label="User ID"
                value={userForm.userId}
                onChange={(e) =>
                  setUserForm({ ...userForm, userId: e.target.value })
                }
              />
            </Box>
            <Button
              onClick={() =>
                userService.createUser({
                  name: userForm.name,
                  email: userForm.email,
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Create User
            </Button>
            <Button
              onClick={() => userService.getAllUsers()}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get All Users
            </Button>
            <Button
              onClick={() => userService.getUser(parseInt(userForm.userId))}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get User
            </Button>
            <Button
              onClick={() =>
                userService.updateUser(parseInt(userForm.userId), {
                  name: userForm.name,
                  email: userForm.email,
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Update User
            </Button>
            <Button
              onClick={() => userService.deleteUser(parseInt(userForm.userId))}
              variant="contained"
              sx={{ m: 1 }}
            >
              Delete User
            </Button>
          </Box>

          {/* Comment Routes Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Comment Routes</Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}
            >
              <TextField
                label="Content"
                multiline
                rows={2}
                value={commentForm.content}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, content: e.target.value })
                }
              />
              <TextField
                label="User ID"
                value={commentForm.userId}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, userId: e.target.value })
                }
              />
              <TextField
                label="Issue ID"
                value={commentForm.issueId}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, issueId: e.target.value })
                }
              />
              <TextField
                label="Comment ID"
                value={commentForm.commentId}
                onChange={(e) =>
                  setCommentForm({ ...commentForm, commentId: e.target.value })
                }
              />
            </Box>
            <Button
              onClick={() =>
                commentService.createComment({
                  content: commentForm.content,
                  user_id: parseInt(commentForm.userId),
                  issue_id: parseInt(commentForm.issueId),
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Create Comment
            </Button>
            <Button
              onClick={() => commentService.getAllComments()}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get All Comments
            </Button>
            <Button
              onClick={() =>
                commentService.updateComment(parseInt(commentForm.commentId), {
                  content: commentForm.content,
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Update Comment
            </Button>
            <Button
              onClick={() =>
                commentService.deleteComment(parseInt(commentForm.commentId))
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Delete Comment
            </Button>
          </Box>

          {/* Project Routes Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Project Routes</Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}
            >
              <TextField
                label="Project Name"
                value={projectForm.name}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, name: e.target.value })
                }
              />
              <TextField
                label="Description"
                multiline
                rows={2}
                value={projectForm.description}
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    description: e.target.value,
                  })
                }
              />
              <TextField
                label="Owner ID"
                value={projectForm.ownerId}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, ownerId: e.target.value })
                }
              />
              <TextField
                label="Project ID"
                value={projectForm.projectId}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, projectId: e.target.value })
                }
              />
            </Box>
            <Button
              onClick={() =>
                projectService.createProject({
                  name: projectForm.name,
                  description: projectForm.description,
                  owner_id: parseInt(projectForm.ownerId),
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Create Project
            </Button>
            <Button
              onClick={() => projectService.getAllProjects()}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get All Projects
            </Button>
            <Button
              onClick={() =>
                projectService.updateProject(parseInt(projectForm.projectId), {
                  name: projectForm.name,
                  description: projectForm.description,
                  owner_id: parseInt(projectForm.ownerId),
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Update Project
            </Button>
            <Button
              onClick={() =>
                projectService.deleteProject(parseInt(projectForm.projectId))
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Delete Project
            </Button>
          </Box>

          {/* Issue Routes Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Issue Routes</Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}
            >
              <TextField
                label="Title"
                value={issueForm.title}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, title: e.target.value })
                }
              />
              <TextField
                label="Description"
                multiline
                rows={2}
                value={issueForm.description}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, description: e.target.value })
                }
              />
              <TextField
                label="Priority"
                value={issueForm.priority}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, priority: e.target.value })
                }
              />
              <TextField
                label="Status"
                value={issueForm.status}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, status: e.target.value })
                }
              />
              <TextField
                label="Project ID"
                value={issueForm.projectId}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, projectId: e.target.value })
                }
              />
              <TextField
                label="User ID"
                value={issueForm.userId}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, userId: e.target.value })
                }
              />
              <TextField
                label="Issue ID"
                value={issueForm.issueId}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, issueId: e.target.value })
                }
              />
            </Box>
            <Button
              onClick={() =>
                issueService.createIssue({
                  title: issueForm.title,
                  description: issueForm.description,
                  priority: issueForm.priority,
                  status: issueForm.status,
                  project_id: parseInt(issueForm.projectId),
                  user_id: parseInt(issueForm.userId),
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Create Issue
            </Button>
            <Button
              onClick={() => issueService.getAllIssues()}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get All Issues
            </Button>
            <Button
              onClick={() =>
                issueService.updateIssue(parseInt(issueForm.issueId), {
                  title: issueForm.title,
                  description: issueForm.description,
                  priority: issueForm.priority,
                  status: issueForm.status,
                  project_id: parseInt(issueForm.projectId),
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Update Issue
            </Button>
            <Button
              onClick={() =>
                issueService.deleteIssue(parseInt(issueForm.issueId))
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Delete Issue
            </Button>
          </Box>

          {/* Owner Routes Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Owner Routes</Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}
            >
              <TextField
                label="User ID"
                value={ownerForm.userId}
                onChange={(e) =>
                  setOwnerForm({ ...ownerForm, userId: e.target.value })
                }
              />
              <TextField
                label="Owner ID"
                value={ownerForm.ownerId}
                onChange={(e) =>
                  setOwnerForm({ ...ownerForm, ownerId: e.target.value })
                }
              />
            </Box>
            <Button
              onClick={() =>
                ownerService.createOwner({
                  user_id: parseInt(ownerForm.userId),
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Create Owner
            </Button>
            <Button
              onClick={() => ownerService.getAllOwners()}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get All Owners
            </Button>
            <Button
              onClick={() =>
                ownerService.updateOwner(parseInt(ownerForm.ownerId), {
                  user_id: parseInt(ownerForm.userId),
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Update Owner
            </Button>
            <Button
              onClick={() =>
                ownerService.deleteOwner(parseInt(ownerForm.ownerId))
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Delete Owner
            </Button>
          </Box>

          {/* Tag Routes Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Tag Routes</Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}
            >
              <TextField
                label="Tag Name"
                value={tagForm.name}
                onChange={(e) =>
                  setTagForm({ ...tagForm, name: e.target.value })
                }
              />
              <TextField
                label="Color"
                type="number"
                value={tagForm.color}
                onChange={(e) =>
                  setTagForm({ ...tagForm, color: parseInt(e.target.value) })
                }
              />
              <Typography>Is Epic?</Typography>
              <Checkbox
                checked={tagForm.isEpic}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTagForm({ ...tagForm, isEpic: e.target.value === "true" })
                }
              />
              <TextField
                label="Tag ID"
                value={tagForm.tagId}
                onChange={(e) =>
                  setTagForm({ ...tagForm, tagId: e.target.value })
                }
              />
            </Box>
            <Button
              onClick={() =>
                tagService.createTag({
                  name: tagForm.name,
                  color: tagForm.color,
                  isEpic: tagForm.isEpic,
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Create Tag
            </Button>
            <Button
              onClick={() => tagService.getAllTags()}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get All Tags
            </Button>
            <Button
              onClick={() => tagService.getTag(parseInt(tagForm.tagId))}
              variant="contained"
              sx={{ m: 1 }}
            >
              Get Tag
            </Button>
            <Button
              onClick={() =>
                tagService.updateTag(parseInt(tagForm.tagId), {
                  name: tagForm.name,
                  color: tagForm.color,
                  isEpic: tagForm.isEpic,
                })
              }
              variant="contained"
              sx={{ m: 1 }}
            >
              Update Tag
            </Button>
            <Button
              onClick={() => tagService.deleteTag(parseInt(tagForm.tagId))}
              variant="contained"
              sx={{ m: 1 }}
            >
              Delete Tag
            </Button>
          </Box>
        </Box>
      </Container>
    </RequireAuth>
  );
};

export default RouteTest;
