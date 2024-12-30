import React, { useEffect } from "react";
import { Box, Container, Typography, Paper, Grid, Button } from "@mui/material";
import { sessionStorage } from "../store/Session";
import RequireAuth from "../components/RequireAuth";

const Home = () => {
  return (
    <RequireAuth>
      <Box></Box>
    </RequireAuth>
  );
};

export default Home;
