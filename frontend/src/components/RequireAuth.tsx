import React, { useEffect } from "react";
import { sessionStorage } from "../store/Session";
import { useNavigate, useLocation } from "react-router-dom";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const session = sessionStorage.getSession();
    console.log("RequireAuth - Current location:", location.pathname);
    console.log("RequireAuth - Session:", session);

    if (!session.isAuthenticated) {
      console.log("RequireAuth - Not authenticated, redirecting to login");
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
      console.log(
        "RequireAuth - No project selected, redirecting to projects page",
      );
      navigate("/projects");
      return;
    }

    console.log("RequireAuth - All checks passed, staying on current page");
  }, [navigate, location.pathname]);

  return <>{children}</>;
};

export default RequireAuth;
