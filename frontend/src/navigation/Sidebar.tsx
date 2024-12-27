import * as React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Box from "@mui/material/Box";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Projects from "../pages/Projects";

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
            <Route path="/Login" element={<Login />} />
            <Route path="/Projects" element={<Projects />} />
            <Route path="/home" element={<Home />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}
