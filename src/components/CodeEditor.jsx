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
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useLLM } from '../services/llmService';
import ErrorPopup from './ErrorPopup';
import EditorToolbar from './EditorToolbar';

const architectures = ['8051', 'ARM', 'x86'];

export const CodeEditor = () => {
  const [code, setCode] = useState('');
  const [architecture, setArchitecture] = useState('8051');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState('');
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [error, setError] = useState(null);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });

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

  const handleEditorChange = async (e) => {
    const value = e.target.value;
    setCode(value);
    setCursorPosition(e.target.selectionStart);
    
    // Get cursor coordinates
    const cursorIndex = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorIndex);
    const lines = textBeforeCursor.split('\n');
    const lineHeight = 21; // Approximate line height in pixels
    const y = lines.length * lineHeight;
    const x = lines[lines.length - 1].length * 8; // Approximate character width
    
    setCursorCoords({ x, y });

    // Trigger syntax validation
    const currentLineContent = lines[lines.length - 1];
    const syntaxResult = await useLLM({ architecture, code: currentLineContent }, 'syntaxCheck');
    if (!syntaxResult.isValid) {
      setError({
        line: lines.length - 1,
        message: syntaxResult.message,
        correction: syntaxResult.correction,
        nextLines: '',
        currentLine: currentLineContent
      });
    } else {
      setError(null);
    }

    // Trigger code suggestions
    const suggestionResult = await useLLM({ architecture, code: textBeforeCursor }, 'codeSuggestion');
    setSuggestions(suggestionResult);
    setShowSuggestionPopup(true);
  };

  const provideCommentToLine = async(lineContext) => {
    var comment = await useLLM(`Provide a comment for the following line in ${architecture} language. : `+ lineContext + " . The response should be short containing only comment no other explanation")
    return comment;
  }

  const nextLinesSuggest = async (previousLines) => {
    const previousLinesString = previousLines.join("\n")
    var nextLines = await useLLM(`Provide next 2 lines of code in ${architecture} language. : `+ previousLinesString + " . The response should be very short containing only next 2 lines of code no other explanation")
    return nextLines;
  }

  const handleAcceptSuggestion = () => {
    if (suggestions) {
      // Get current cursor position
      const currentPosition = textareaRef.current.selectionStart;
      
      // Clean up suggestions by trimming and removing any extra newlines
      const cleanedSuggestions = suggestions.trim();
      
      // Insert suggestions at current position
      const newCode = code.substring(0, currentPosition) + 
                     cleanedSuggestions + 
                     code.substring(currentPosition);
      
      setCode(newCode);
      setSuggestions('');
      setShowSuggestionPopup(false);

      // Move cursor to end of inserted suggestions
      setTimeout(() => {
        const newPosition = currentPosition + cleanedSuggestions.length;
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

  const checkForErrors = async (lineContent) => {
    const result = await useLLM({
      architecture,
      code: lineContent
    }, true);
    
    if (!result.isValid) {
      setError({
        line: code.split('\n').length - 1,
        message: result.message,
        correction: result.correction,
        nextLines: result.nextLines,
        currentLine: lineContent // Store the current line content
      });
    } else {
      setError(null);
    }
    return result.isValid;
  };

  const handleEnterPress = async (currentLineContent) => {
    // Skip if line is empty or contains only whitespace
    if (!currentLineContent || !currentLineContent.trim()) {
      return;
    }

    // Check for errors first
    const isValid = await checkForErrors(currentLineContent);
    if (!isValid) {
      return; // Don't proceed if there are errors
    }

    // Get all lines and current cursor position
    const lines = code.split('\n');
    const currentPosition = textareaRef.current.selectionStart;
    const currentLineNumber = code.substring(0, currentPosition).split('\n').length - 1;
    
    if (currentLineNumber >= 0 && currentLineNumber < lines.length) {
      // Add custom string to the current line
      const customString = await provideCommentToLine(currentLineContent);
      lines[currentLineNumber] = currentLineContent + "   ;" + customString;
      
      // Get suggestions for next lines
      const suggestedLines = await nextLinesSuggest(lines.slice(0, currentLineNumber + 1));
      setSuggestions(suggestedLines);
      setShowSuggestionPopup(true);

      // Join all lines back together
      const newCode = lines.join('\n');
      setCode(newCode);
      
      // Update cursor position to the next line
      const textarea = textareaRef.current;
      if (textarea) {
        setTimeout(() => {
          // Calculate position at the start of next line
          const nextLinePosition = newCode.split('\n').slice(0, currentLineNumber + 1).join('\n').length + 1;
          textarea.selectionStart = nextLinePosition;
          textarea.selectionEnd = nextLinePosition;
          textarea.focus();
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

  // Function to format the code with colored comments
  const formatCodeWithComments = (text) => {
    return text.split('\n').map((line, index) => {
      const parts = line.split(';');
      if (parts.length > 1) {
        // If line has a comment
        return (
          <div key={index} style={{ display: 'flex' }}>
            <span>{parts[0]}</span>
            <span style={{ color: '#6A9955' }}>{';' + parts.slice(1).join(';')}</span>
          </div>
        );
      }
      // If line has no comment
      return <div key={index}>{line}</div>;
    });
  };
  
  const editorStyles = {
    container: {
      position: 'relative',
      height: '600px', // Increased height for better editing experience
      backgroundColor: '#1e1e1e',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      fontSize: '16px', // Slightly larger font for readability
    },
    lineNumbers: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '50px', // Adjusted width for better spacing
      backgroundColor: '#252526',
      color: '#858585',
      borderRight: '1px solid #404040',
      textAlign: 'right',
      padding: '12px 6px', // Increased padding
      userSelect: 'none',
      overflow: 'hidden',
      whiteSpace: 'pre',
      lineHeight: '1.6',
    },
    textarea: {
      position: 'absolute',
      left: '50px', // Adjusted to match line number width
      top: 0,
      right: 0,
      bottom: 0,
      padding: '12px',
      color: '#d4d4d4',
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none',
      lineHeight: '1.6',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      caretColor: '#fff',
      zIndex: 1,
    },
    suggestions: {
      position: 'absolute',
      left: '50px',
      right: 0,
      top: 0,
      bottom: 0,
      padding: '12px',
      color: '#d4d4d4',
      opacity: 0.4,
      pointerEvents: 'none',
      whiteSpace: 'pre',
      lineHeight: '1.6',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      overflow: 'hidden',
      zIndex: 0,
    },
    suggestionPopup: {
      position: 'absolute',
      zIndex: 2,
      width: '320px',
      backgroundColor: '#252526',
      color: '#d4d4d4',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    },
    suggestionContent: {
      padding: '12px',
      maxHeight: '180px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      borderBottom: '1px solid #404040',
    },
    suggestionActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '8px',
      gap: '8px',
    },
    codeContainer: {
      position: 'absolute',
      left: '50px',
      top: 0,
      right: 0,
      bottom: 0,
      padding: '12px',
      color: '#d4d4d4',
      backgroundColor: 'transparent',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: '1.6',
      whiteSpace: 'pre',
      overflow: 'auto',
      zIndex: 2,
      pointerEvents: 'none',
    },
    hiddenTextarea: {
      position: 'absolute',
      left: '50px',
      top: 0,
      right: 0,
      bottom: 0,
      padding: '12px',
      color: 'transparent',
      caretColor: '#fff',
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      resize: 'none',
      lineHeight: '1.6',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      zIndex: 1,
    },
    errorPopup: {
      position: 'absolute',
      zIndex: 2,
      width: '320px',
      backgroundColor: '#252526',
      color: '#d4d4d4',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      borderLeft: '3px solid rgb(132, 3, 3)',
    },
    errorIcon: {
      fontSize: '18px',
      color: '#ff6b6b',
    },
  };
  
  // Calculate the vertical offset for suggestions based on current code
  const getSuggestionsOffset = () => {
    const lines = code.split('\n').length;
    return `${lines * 1.5}em`; // 1.5em matches the line-height
  };

  const handleAcceptErrorSuggestion = () => {
    if (error && error.correction) {
      const lines = code.split('\n');
      const currentLineIndex = code.split('\n').length - 1; // Get the current line index
      
      if (currentLineIndex >= 0) {
        // Get the current line content
        const currentLine = lines[currentLineIndex];
        
        // Remove the incorrect line and replace with correction
        lines.splice(currentLineIndex, 1, error.correction);
        
        // Add next suggested lines if available
        if (error.nextLines) {
          const nextLines = error.nextLines.split('\n').filter(line => line.trim());
          lines.splice(currentLineIndex + 1, 0, ...nextLines);
        }
        
        const newCode = lines.join('\n');
        setCode(newCode);
        setError(null);
        
        // Move cursor to end of last inserted line
        setTimeout(() => {
          const newLines = newCode.split('\n');
          const lastLineIndex = currentLineIndex + (error.nextLines ? nextLines.length : 0);
          const lastLine = newLines[lastLineIndex];
          const newPosition = newCode.split('\n').slice(0, lastLineIndex).join('\n').length + lastLine.length;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
          textareaRef.current.focus();
        }, 0);
      }
    }
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <EditorToolbar
        architecture={architecture}
        setArchitecture={setArchitecture}
        handleLoad={handleLoad}
        handleSave={handleSave}
      />

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
              style={editorStyles.hiddenTextarea}
              spellCheck="false"
              wrap="off"
            />
            <div style={editorStyles.codeContainer}>
              {formatCodeWithComments(code)}
            </div>
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
              <Card style={{
                ...editorStyles.suggestionPopup,
                left: `${cursorCoords.x + 50}px`,
                top: `${cursorCoords.y}px`
              }}>
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
            <ErrorPopup
              error={error}
              cursorCoords={cursorCoords}
              handleAcceptErrorSuggestion={handleAcceptErrorSuggestion}
              setError={setError}
            />
          </div>
        </Paper>
      </Box>
    </Box>
  );
};

const styles = {
  errorContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '300px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    marginTop: '8px',
    marginRight: '8px'
  },
  errorMessage: {
    padding: '8px 12px',
    borderBottom: '1px solid #eee',
    color: '#ff6b6b',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center'
  },
  suggestionBox: {
    padding: '12px'
  },
  suggestionTitle: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
    fontWeight: 500
  },
  suggestionCode: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#2e7d32',
    backgroundColor: '#f1f8e9',
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '12px',
    whiteSpace: 'pre-wrap'
  },
  suggestionActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  }
}; 