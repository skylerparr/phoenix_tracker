import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import { styled } from '@mui/material/styles';
const theme = createTheme();
const GlobalStyles = styled('div')({
  'body, html, #root': {
    height: '100%',
    margin: 0,
  },
});
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <Container maxWidth={false} disableGutters>
      </Container>
    </ThemeProvider>
  );
};

export default App;
