import React, { useEffect } from "react";
import { sessionStorage } from "../store/Session";
import { useNavigate } from "react-router-dom";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const session = sessionStorage.getSession();
    if (!session.isAuthenticated) {
      navigate("/Login");
    }
  }, [navigate]);

  return <>{children}</>;
};

export default RequireAuth;
