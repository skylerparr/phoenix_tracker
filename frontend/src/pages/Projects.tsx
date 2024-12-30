import React from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
} from "@mui/material";
import RequireAuth from "../components/RequireAuth";

const Projects: React.FC = () => {
  return (
    <RequireAuth>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Projects
        </Typography>
        <Grid container spacing={4}></Grid>
      </Container>
    </RequireAuth>
  );
};

export default Projects;
