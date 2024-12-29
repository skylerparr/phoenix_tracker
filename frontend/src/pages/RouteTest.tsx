
import React from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import { userService } from "../services/UserService";
import { commentService } from "../services/CommentService";
import { projectService } from "../services/ProjectService";
import { issueService } from "../services/IssueService";
import { ownerService } from "../services/OwnerService";
import RequireAuth from "../components/RequireAuth";

const RouteTest = () => {
  // User Service Tests
  const testCreateUser = () => {
    const payload = { name: "Test User", email: "test@example.com" };
    userService.createUser(payload);
  };

  const testUpdateUser = () => {
    const payload = { name: "Updated User", email: "updated@example.com" };
    userService.updateUser(1, payload);
  };

  // Comment Service Tests
  const testCreateComment = () => {
    const payload = { content: "Test comment", user_id: 1, issue_id: 1 };
    commentService.createComment(payload);
  };

  const testUpdateComment = () => {
    const payload = { content: "Updated comment" };
    commentService.updateComment(1, payload);
  };

  // Project Service Tests
  const testCreateProject = () => {
    const payload = {
      name: "Test Project",
      description: "Test Description",
      owner_id: 1,
    };
    projectService.createProject(payload);
  };

  const testUpdateProject = () => {
    const payload = {
      name: "Updated Project",
      description: "Updated Description",
      owner_id: 2,
    };
    projectService.updateProject(1, payload);
  };

  // Issue Service Tests
  const testCreateIssue = () => {
    const payload = {
      title: "Test Issue",
      description: "Test Description",
      priority: "High",
      status: "Open",
      project_id: 1,
      user_id: 1,
    };
    issueService.createIssue(payload);
  };

  const testUpdateIssue = () => {
    const payload = {
      title: "Updated Issue",
      description: "Updated Description",
      priority: "Low",
      status: "Closed",
      project_id: 2,
    };
    issueService.updateIssue(1, payload);
  };

  // Owner Service Tests
  const testCreateOwner = () => {
    const payload = { user_id: 1 };
    ownerService.createOwner(payload);
  };

  const testUpdateOwner = () => {
    const payload = { user_id: 2 };
    ownerService.updateOwner(1, payload);
  };

  return (
    <RequireAuth>
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            API Route Testing
          </Typography>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">User Routes</Typography>
            <Button onClick={testCreateUser} variant="contained" sx={{ m: 1 }}>
              Create User
            </Button>
            <Button onClick={() => userService.getAllUsers()} variant="contained" sx={{ m: 1 }}>
              Get All Users
            </Button>
            <Button onClick={() => userService.getUser(1)} variant="contained" sx={{ m: 1 }}>
              Get User
            </Button>
            <Button onClick={testUpdateUser} variant="contained" sx={{ m: 1 }}>
              Update User
            </Button>
            <Button onClick={() => userService.deleteUser(1)} variant="contained" sx={{ m: 1 }}>
              Delete User
            </Button>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Comment Routes</Typography>
            <Button onClick={testCreateComment} variant="contained" sx={{ m: 1 }}>
              Create Comment
            </Button>
            <Button onClick={() => commentService.getAllComments()} variant="contained" sx={{ m: 1 }}>
              Get All Comments
            </Button>
            <Button onClick={testUpdateComment} variant="contained" sx={{ m: 1 }}>
              Update Comment
            </Button>
            <Button onClick={() => commentService.deleteComment(1)} variant="contained" sx={{ m: 1 }}>
              Delete Comment
            </Button>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Project Routes</Typography>
            <Button onClick={testCreateProject} variant="contained" sx={{ m: 1 }}>
              Create Project
            </Button>
            <Button onClick={() => projectService.getAllProjects()} variant="contained" sx={{ m: 1 }}>
              Get All Projects
            </Button>
            <Button onClick={testUpdateProject} variant="contained" sx={{ m: 1 }}>
              Update Project
            </Button>
            <Button onClick={() => projectService.deleteProject(1)} variant="contained" sx={{ m: 1 }}>
              Delete Project
            </Button>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Issue Routes</Typography>
            <Button onClick={testCreateIssue} variant="contained" sx={{ m: 1 }}>
              Create Issue
            </Button>
            <Button onClick={() => issueService.getAllIssues()} variant="contained" sx={{ m: 1 }}>
              Get All Issues
            </Button>
            <Button onClick={testUpdateIssue} variant="contained" sx={{ m: 1 }}>
              Update Issue
            </Button>
            <Button onClick={() => issueService.deleteIssue(1)} variant="contained" sx={{ m: 1 }}>
              Delete Issue
            </Button>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5">Owner Routes</Typography>
            <Button onClick={testCreateOwner} variant="contained" sx={{ m: 1 }}>
              Create Owner
            </Button>
            <Button onClick={() => ownerService.getAllOwners()} variant="contained" sx={{ m: 1 }}>
              Get All Owners
            </Button>
            <Button onClick={testUpdateOwner} variant="contained" sx={{ m: 1 }}>
              Update Owner
            </Button>
            <Button onClick={() => ownerService.deleteOwner(1)} variant="contained" sx={{ m: 1 }}>
              Delete Owner
            </Button>
          </Box>
        </Box>
      </Container>
    </RequireAuth>
  );
};

export default RouteTest;
