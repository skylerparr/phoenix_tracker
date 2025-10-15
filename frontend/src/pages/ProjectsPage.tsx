import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Box,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import RequireAuth from "../components/RequireAuth";
import { projectService } from "../services/ProjectService";
import { Project } from "../models/Project";

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const userProjects = await projectService.getAllProjectsByUserId();
        setProjects(userProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (isCreatingProject || !newProjectName.trim()) return;

    setIsCreatingProject(true);
    try {
      const newProject = await projectService.createProject({
        name: newProjectName.trim(),
      });
      setProjects([...projects, newProject]);
      setNewProjectName("");
      handleProjectClick(newProject);
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleProjectClick = async (project: Project) => {
    try {
      // Use the new JWT-based project switching
      await projectService.switchToProject(project.id);
      // Navigate to home with project ID in URL to force component refresh
      navigate(`/home?project=${project.id}`);
    } catch (error) {
      console.error("Failed to switch to project:", error);
      // Fallback to old method if needed
      await projectService.selectProject(project.id);
      navigate(`/home?project=${project.id}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreatingProject && newProjectName.trim()) {
      handleCreateProject();
    }
  };

  return (
    <RequireAuth>
      <Container
        maxWidth="lg"
        sx={{
          py: 4,
          height: "calc(100vh - 64px)",
          maxHeight: "100vh",
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ justifySelf: "flex-start" }}
          >
            Projects
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifySelf: "flex-end" }}>
            <TextField
              size="small"
              label="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isCreatingProject}
            />
            <Button
              variant="contained"
              color="primary"
              disabled={!newProjectName.trim() || isCreatingProject}
              onClick={handleCreateProject}
              startIcon={
                isCreatingProject ? <CircularProgress size={16} /> : null
              }
              sx={{ minWidth: 140 }}
            >
              {isCreatingProject ? "Creating..." : "Create Project"}
            </Button>
          </Box>
        </Box>
        <Grid container spacing={4}>
          {projects.map((project: Project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                sx={{
                  backgroundColor: "#1a237e",
                  border: "1px solid #0d47a1",
                  borderRadius: "16px",
                  cursor: "pointer",
                  position: "relative",
                  "&:hover": {
                    transform: "scale(1.02)",
                    transition: "transform 0.2s ease-in-out",
                  },
                }}
                onClick={() => handleProjectClick(project)}
              >
                {project.notificationCount > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#ff4444",
                      color: "white",
                      borderRadius: "50%",
                      minWidth: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      zIndex: 1,
                    }}
                  >
                    {project.notificationCount}
                  </Box>
                )}
                <CardContent>
                  <Typography variant="h6" component="h2">
                    {project.name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </RequireAuth>
  );
};

export default ProjectsPage;
