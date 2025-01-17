import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import { styled } from "@mui/material/styles";
import Sidebar from "./navigation/Sidebar";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#f48fb1",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
});

const GlobalStyles = styled("div")({
  "body, html, #root": {
    height: "100%",
    margin: 0,
    backgroundColor: "#121212",
    color: "#ffffff",
  },
  "#root": {
    overflow: "hidden",
    position: "fixed",
    width: "100%",
    height: "100%",
  },
});
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          height: "100vh",
          overflow: "hidden",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <Sidebar />
      </Container>
    </ThemeProvider>
  );
};
export default App;
