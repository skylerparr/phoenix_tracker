import * as React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Box from "@mui/material/Box";
import Home from "../pages/Home";

export default function Sidebar() {
  return (
    <Router>
      <Box sx={{ display: "flex" }}>
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 0, width: `100%`, height: `100%` }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<Box>About</Box>} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}
