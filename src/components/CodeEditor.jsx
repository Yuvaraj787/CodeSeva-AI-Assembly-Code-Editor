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
  Paper,
  Button,
  Card,
  CardActions,
  CardContent
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const architectures = ['8051', 'ARM', 'x86'];

export const CodeEditor = () => {
  const [code, setCode] = useState('');
  const [architecture, setArchitecture] = useState('8051');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState('');
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
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

  const provideCommentToLine = async(lineContext) => {
    var comment = await useLLM(`Provide a comment for the following line in ${architecture} language. : `+ lineContext + " . The response should be very short containing only short comment no other explanation")
    return comment;
  }

  const nextLinesSuggest = async (previousLines) => {
    const previousLinesString = previousLines.join("\n")
    var nextLines = await useLLM(`Provide next 2 lines of code in ${architecture} language. : `+ previousLinesString + " . The response should be very short containing only next 2 lines of code no other explanation")
    return nextLines;
  }

  const useLLM =  async (prompt) => {
    try {
        const apiKey = "AIzaSyBi7INxXx7iKCL9RXNIC4tCPQCT5pgQ1ds";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        };
  
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
  
        const data = await response.json();
        let aiText = data.candidates[0].content.parts[0].text;
        return aiText
      } catch (e) {
        console.log("Error:", e);
        return "Model ERROR";
      }
  }

  const handleAcceptSuggestion = () => {
    if (suggestions) {
      // Get current cursor position
      const currentPosition = textareaRef.current.selectionStart;
      
      // Insert suggestions at current position
      const newCode = code.substring(0, currentPosition) + 
                     suggestions + 
                     code.substring(currentPosition);
      
      setCode(newCode);
      setSuggestions('');
      setShowSuggestionPopup(false);

      // Move cursor to end of inserted suggestions
      setTimeout(() => {
        const newPosition = currentPosition + suggestions.length;
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }, 0);
    }
  };

  const handleDeclineSuggestion = () => {
    setSuggestions('');
    setShowSuggestionPopup(false);
  };

  const handleEnterPress = async (currentLineContent) => {
    // Get all lines
    const lines = code.split('\n');
    // Find the current line index
    const currentLineIndex = lines.findIndex(line => line === currentLineContent);
    
    if (currentLineIndex !== -1) {
      // Add custom string to the current line
      const customString = await provideCommentToLine(currentLineContent);
      lines[currentLineIndex] = currentLineContent + "   ;" + customString + "\n";
      
      // Get suggestions for next lines
      const suggestedLines = await nextLinesSuggest(lines.slice(0, currentLineIndex + 1));
      setSuggestions(suggestedLines);
      setShowSuggestionPopup(true);

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
      zIndex: 1,
    },
    suggestions: {
      position: 'absolute',
      left: '40px',
      right: 0,
      top: 0,
      bottom: 0,
      padding: '8px',
      color: '#d4d4d4',
      opacity: 0.4,
      pointerEvents: 'none',
      whiteSpace: 'pre',
      lineHeight: '1.5',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      overflow: 'hidden',
      zIndex: 0,
    },
    suggestionPopup: {
      position: 'absolute',
      right: '20px',
      top: '20px',
      zIndex: 2,
      width: '300px',
      backgroundColor: '#252526',
      color: '#d4d4d4',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    },
    suggestionContent: {
      padding: '12px',
      maxHeight: '150px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      borderBottom: '1px solid #404040',
    },
    suggestionActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '8px',
      gap: '8px',
    }
  };

  // Calculate the vertical offset for suggestions based on current code
  const getSuggestionsOffset = () => {
    const lines = code.split('\n').length;
    return `${lines * 1.5}em`; // 1.5em matches the line-height
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
            {suggestions && (
              <div 
                style={{
                  ...editorStyles.suggestions,
                  marginTop: getSuggestionsOffset(),
                }}
              >
                {suggestions}
              </div>
            )}
            {showSuggestionPopup && suggestions && (
              <Card style={editorStyles.suggestionPopup}>
                <CardContent style={editorStyles.suggestionContent}>
                  <Typography variant="subtitle2" gutterBottom>
                    Suggested next lines:
                  </Typography>
                  <Typography variant="body2" style={{ color: '#d4d4d4' }}>
                    {suggestions}
                  </Typography>
                </CardContent>
                <CardActions style={editorStyles.suggestionActions}>
                  <Button
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={handleDeclineSuggestion}
                    color="error"
                  >
                    Decline
                  </Button>
                  <Button
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={handleAcceptSuggestion}
                    color="success"
                  >
                    Accept
                  </Button>
                </CardActions>
              </Card>
            )}
          </div>
        </Paper>
      </Box>
    </Box>
  );
}; 