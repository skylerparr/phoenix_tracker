import React from "react";
import RequireAuth from "../components/RequireAuth";
import { Box } from "@mui/material";
import { sessionStorage } from "../store/Session";

const Logout: React.FC = () => {
  sessionStorage.logout();
  return (
    <RequireAuth>
      <Box />
    </RequireAuth>
  );
};

export default Logout;
