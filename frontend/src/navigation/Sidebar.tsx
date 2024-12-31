import * as React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Box from "@mui/material/Box";
import Home from "../pages/Home";
import Login from "../pages/Login";
import ProjectsPage from "../pages/ProjectsPage";
import RouteTest from "../pages/RouteTest";
import Logout from "../pages/Logout";

export default function Sidebar() {
  return (
    <Router>
      <Box sx={{ display: "flex" }}>
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 0, width: `100%`, height: `100%` }}
        >
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/-----" element={<RouteTest />} />
            <Route path="/home" element={<Home />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}
