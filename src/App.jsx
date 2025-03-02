import React from 'react';
import { CodeEditor } from './components/CodeEditor';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1e1e1e',
      paper: '#252526'
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CodeEditor />
    </ThemeProvider>
  );
}

export default App;
