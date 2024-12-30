import React, { useState } from "react";
import { Box, TextField, Button, Typography, Container } from "@mui/material";
import { authService } from "../services/AuthService";
import { sessionStorage } from "../store/Session";

const Login = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [createAccount, setCreateAccount] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (createAccount) {
        await handleCreateAccount();
        return;
      }

      const response = await authService.login({ email });
      sessionStorage.setSession({
        isAuthenticated: true,
        user: {
          email: email,
          token: response.token,
          name: fullName,
        },
      });
      window.location.href = "/Projects";
    } catch (error) {
      setCreateAccount(true);
    }
  };

  const handleCreateAccount = async () => {
    try {
      const response = await authService.register({ email, name: fullName });
      sessionStorage.setSession({
        isAuthenticated: true,
        user: {
          email: email,
          name: fullName,
          token: response.token,
        },
      });
      window.location.href = "/Home";
    } catch (error) {
      console.error("Error creating account:", error);
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
