import React, { useState } from "react";
import { Box, TextField, Button, Typography, Container } from "@mui/material";
import { authService } from "../services/AuthService";
import { sessionStorage } from "../store/Session";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [createAccount, setCreateAccount] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await (createAccount
        ? authService.register({ email, name: fullName })
        : authService.login({ email }));

      sessionStorage.setUserData({
        user_id: response.user_id,
        email: email,
        token: response.token,
        name: fullName,
      });

      if (response.project_id) {
        navigate("/home");
      } else {
        navigate("/projects");
      }
    } catch (error) {
      if (!createAccount) {
        setCreateAccount(true);
      } else {
        console.error("Error creating account:", error);
      }
    }
  };
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          {createAccount ? "Create Account" : "Login"}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          {createAccount && (
            <TextField
              margin="normal"
              required
              fullWidth
              id="fullName"
              label="Full Name"
              name="fullName"
              autoComplete="name"
              autoFocus
              value={fullName}
              onChange={(e: any) => setFullName(e.target.value)}
            />
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            disabled={createAccount}
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {createAccount ? "Create Account" : "Sign In"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
