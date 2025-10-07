import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import { styled } from "@mui/material/styles";
import Sidebar from "./navigation/Sidebar";
import { MobileProvider } from "./context/MobileContext";
import "./styles/mobile.css";
import { PreviewOverlayProvider } from "./context/PreviewOverlayContext";

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
    width: "100%",
    height: "100%",
  },
});
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <MobileProvider>
        <PreviewOverlayProvider>
          <Container
            maxWidth={false}
            disableGutters
            sx={{
              height: "100vh",
              overflow: "hidden",
              width: "100%",
            }}
          >
            <Sidebar />
          </Container>
        </PreviewOverlayProvider>
      </MobileProvider>
    </ThemeProvider>
  );
};
export default App;
