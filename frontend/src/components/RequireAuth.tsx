import React, { useEffect } from "react";
import { sessionStorage } from "../store/Session";
import { useNavigate, useLocation } from "react-router-dom";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const session = sessionStorage.getSession();

    if (!session.isAuthenticated) {
      navigate("/Login");
      return;
    }

    // If user is authenticated but hasn't selected a project, redirect to projects page
    // Skip this check if we're already on the projects page
    if (
      session.isAuthenticated &&
      !session.hasProject &&
      location.pathname !== "/projects"
    ) {
      navigate("/projects");
      return;
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
};

export default RequireAuth;
