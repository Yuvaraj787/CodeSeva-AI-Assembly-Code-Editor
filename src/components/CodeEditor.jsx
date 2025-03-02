import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import FileOpenIcon from '@mui/icons-material/FileOpen';

const architectures = ['8051', 'ARM', 'x86'];

export const CodeEditor = () => {
  const [code, setCode] = useState('');
  const [architecture, setArchitecture] = useState('8051');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  useEffect(() => {
    // Sync scroll between textarea and line numbers
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;

    const handleScroll = () => {
      if (lineNumbers) {
        lineNumbers.scrollTop = textarea.scrollTop;
      }
    };

    textarea.addEventListener('scroll', handleScroll);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, []);

  const handleEditorChange = (e) => {
    const value = e.target.value;
    setCode(value);
    setCursorPosition(e.target.selectionStart);
  };

  const provideCommentToLine = (lineContext) => {
    return "This is a comment"
  }

  const nextLinesSuggest = (previousLines) => {
    return ["This is a comment", "This is a comment", "This is a comment"]
  }

  const handleEnterPress = (currentLineContent) => {
    // Get all lines
    const lines = code.split('\n');
    // Find the current line index
    const currentLineIndex = lines.findIndex(line => line === currentLineContent);
    
    if (currentLineIndex !== -1) {
      // Add custom string to the current line
      const customString = provideCommentToLine(currentLineContent); // You can modify this string as needed
      lines[currentLineIndex] = currentLineContent + "   ;" + customString + "\n";
      
      // Join all lines back together
      const newCode = lines.join('\n');
      setCode(newCode);
      
      // Update cursor position to the next line
      const textarea = textareaRef.current;
      if (textarea) {
        setTimeout(() => {
          const newPosition = textarea.selectionStart;
          textarea.selectionStart = newPosition;
          textarea.selectionEnd = newPosition;
        }, 0);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const spaces = '  '; // 2 spaces for indentation
      
      setCode(
        code.substring(0, start) + spaces + code.substring(end)
      );

      // Move cursor after indentation
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + spaces.length;
      }, 0);
    } else if (e.key === 'Enter') {
      // Get the current line content before Enter is pressed
      const lines = code.split('\n');
      const currentPosition = e.target.selectionStart;
      const currentLineNumber = code.substring(0, currentPosition).split('\n').length - 1;
      const currentLineContent = lines[currentLineNumber];

      // Call the handler after the Enter key event is processed
      setTimeout(() => {
        handleEnterPress(currentLineContent);
      }, 0);
    }
  };

  const handleSave = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.asm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asm,.s';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setCode(e.target.result);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const getLineNumbers = () => {
    const lines = code.split('\n');
    return lines.map((_, i) => i + 1).join('\n');
  };

  const editorStyles = {
    container: {
      position: 'relative',
      height: '100%',
      backgroundColor: '#1e1e1e',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      fontSize: '14px',
    },
    lineNumbers: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '40px',
      backgroundColor: '#252526',
      color: '#858585',
      borderRight: '1px solid #404040',
      textAlign: 'right',
      padding: '8px 4px',
      userSelect: 'none',
      overflow: 'hidden',
      whiteSpace: 'pre',
      lineHeight: '1.5',
    },
    textarea: {
      position: 'absolute',
      left: '40px',
      top: 0,
      right: 0,
      bottom: 0,
      padding: '8px',
      color: '#d4d4d4',
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none',
      lineHeight: '1.5',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      caretColor: '#fff',
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 3 }}>
            Assembly Editor
          </Typography>
          
          <FormControl sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel>Architecture</InputLabel>
            <Select
              value={architecture}
              label="Architecture"
              onChange={(e) => setArchitecture(e.target.value)}
              size="small"
            >
              {architectures.map((arch) => (
                <MenuItem key={arch} value={arch}>{arch}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Open File">
              <IconButton onClick={handleLoad} color="primary">
                <FileOpenIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save">
              <IconButton onClick={handleSave} color="primary">
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Run">
              <IconButton onClick={() => console.log('Running code...')} color="success">
                <PlayArrowIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, p: 2 }}>
        <Paper elevation={3} sx={{ height: '100%', overflow: 'hidden' }}>
          <div style={editorStyles.container}>
            <div 
              ref={lineNumbersRef}
              style={editorStyles.lineNumbers}
            >
              {getLineNumbers()}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleEditorChange}
              onKeyDown={handleKeyDown}
              style={editorStyles.textarea}
              spellCheck="false"
              wrap="off"
            />
          </div>
        </Paper>
      </Box>
    </Box>
  );
}; 