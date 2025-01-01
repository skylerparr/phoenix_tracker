import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Box,
} from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import { projectService } from "../services/ProjectService";
import { Project } from "../models/Project";
import { useNavigate } from "react-router-dom";
import { sessionStorage } from "../store/Session";
const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const navigate = useNavigate();

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
    try {
      const newProject = await projectService.createProject({
        name: newProjectName,
      });
      setProjects([...projects, newProject]);
      setNewProjectName("");
      handleProjectClick(newProject);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleProjectClick = (project: Project) => {
    sessionStorage.setProject(project);
    navigate("/home");
  };

  return (
    <RequireAuth>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1">
            Projects
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              size="small"
              label="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              disabled={!newProjectName}
              onClick={handleCreateProject}
            >
              Create Project
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
                  "&:hover": {
                    transform: "scale(1.02)",
                    transition: "transform 0.2s ease-in-out",
                  },
                }}
                onClick={() => handleProjectClick(project)}
              >
                <CardContent>
                  <Typography variant="h6" component="h2">
                    {project.name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>{" "}
      </Container>
    </RequireAuth>
  );
};

export default ProjectsPage;
