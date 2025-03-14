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
import { useLLM } from '../assets/bin/others/llmService';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const architectures = ['8051', 'ARM', '8085'];

export const CodeEditor = () => {
  const [code, setCode] = useState('');
  const [architecture, setArchitecture] = useState('8051');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState('');
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [isCtrlEnterSuggestion, setIsCtrlEnterSuggestion] = useState(false);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [error, setError] = useState(null);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

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
    
    // Get cursor coordinates
    const cursorIndex = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorIndex);
    const lines = textBeforeCursor.split('\n');
    const lineHeight = 21; // Approximate line height in pixels
    const y = lines.length * lineHeight;
    const x = lines[lines.length - 1].length * 8; // Approximate character width
    
    setCursorCoords({ x, y });
  };

  const provideCommentToLine = async(lineContext) => {
    var comment = await useLLM(`Provide a comment for the following line in ${architecture} language. : `+ lineContext + " . The response should be short containing only comment no other explanation")
    return comment;
  }

  const nextLinesSuggest = async (previousLines) => {
    const previousLinesString = previousLines.join("\n");
    var nextLines = await useLLM(`Given the following ${architecture} assembly code:
${previousLinesString}

Provide 3 DIFFERENT suggestions, where each suggestion contains TWO lines of assembly code.
Format your response exactly like this, with exactly 3 suggestions of 2 lines each:
SUGGESTION_1:
[first line of first suggestion]
[second line of first suggestion]
SUGGESTION_2:
[first line of second suggestion]
[second line of second suggestion]
SUGGESTION_3:
[first line of third suggestion]
[second line of third suggestion]

Make each suggestion unique and valid for ${architecture} architecture.`);
    
    // Parse the suggestions
    const suggestions = [];
    const lines = nextLines.split('\n');
    
    for (let i = 1; i <= 3; i++) {
      const startIndex = lines.findIndex(line => line.trim() === `SUGGESTION_${i}:`);
      if (startIndex !== -1 && startIndex + 2 <= lines.length) {
        const firstLine = lines[startIndex + 1]?.trim();
        const secondLine = lines[startIndex + 2]?.trim();
        if (firstLine && secondLine) {
          suggestions.push([firstLine, secondLine]);
        }
      }
    }
    
    // If we got valid suggestions, get comments for each line
    if (suggestions.length > 0) {
      const suggestionsWithComments = await Promise.all(
        suggestions.map(async ([line1, line2]) => {
          const comment1 = await provideCommentToLine(line1);
          const comment2 = await provideCommentToLine(line2);
          return `${line1}   ;${comment1}${line2}   ;${comment2}`;
        })
      );
      return suggestionsWithComments;
    }
    
    return [];
  };

  const handleAcceptSuggestion = () => {
    if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
      // Get current cursor position
      const currentPosition = textareaRef.current.selectionStart;
      
      // Get the selected suggestion
      const selectedSuggestion = suggestions[selectedSuggestionIndex];
      
      // Clean up suggestion by trimming and removing any extra newlines
      const cleanedSuggestion = selectedSuggestion.trim();
      
      // Insert suggestion at current position with proper line break
      const newCode = code.substring(0, currentPosition) + 
                    cleanedSuggestion + 
                     code.substring(currentPosition);
      
      setCode(newCode);
      setSuggestions([]);
      setShowSuggestionPopup(false);
      setIsCtrlEnterSuggestion(false);
      setSelectedSuggestionIndex(0);

      // Move cursor to the start of the next line after the suggestions
      setTimeout(() => {
        const newPosition = currentPosition + cleanedSuggestion.length + 2; // +2 for the added newline
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }, 0);
    }
  };

  const handleDeclineSuggestion = () => {
    setSuggestions('');
    setShowSuggestionPopup(false);
    setIsCtrlEnterSuggestion(false);
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
        corrections: result.corrections || [result.correction].filter(Boolean),
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
    const currentLineNumber = code.split('\n').filter(line => line.trim()).length - 1;
    //log the current line number
    console.log(currentLineNumber);
    if (currentLineNumber >= 0 && currentLineNumber < lines.length) {
      // Add custom string to the current line
      const customString = await provideCommentToLine(currentLineContent);
      lines[currentLineNumber] = currentLineContent + "   ;" + customString;
      
      // Join all lines back together
      //dont join emmpty lines
      const newCode = lines.filter(line => line.trim()).join('\n');
      setCode(newCode);
      
      // Add a new line after the current line
      const newPosition = newCode.split('\n').filter(line => line.trim()).length - 1;
      console.log(newPosition);
      const finalCode = newCode.substring(0, newPosition)  + newCode.substring(newPosition);
      setCode(finalCode);
      
      // Update cursor position to the next line
      const textarea = textareaRef.current;
      if (textarea) {
        setTimeout(() => {
          textarea.selectionStart = newPosition;
          textarea.selectionEnd = newPosition;
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
    } else if (e.key === 'Enter' && e.ctrlKey) {
      // Handle Ctrl+Enter for next line suggestions without comments
      e.preventDefault();
      handleCtrlEnterPress();
    } else if (e.key === 'Enter') {
      // Get the current line content before Enter is pressed
      const lines = code.split('\n');
      const currentPosition = e.target.selectionStart;
      const currentLineNumber = code.split('\n').filter(line => line.trim()).length - 1;
      const currentLineContent = lines[currentLineNumber];

      // Call the handler after the Enter key event is processed
      setTimeout(() => {
        handleEnterPress(currentLineContent);
      }, 0);
    }
  };

  const handleCtrlEnterPress = async () => {
    // Get all lines and current cursor position
    const lines = code.split('\n');
    const currentPosition = textareaRef.current.selectionStart;
    const currentLineNumber = code.split('\n').filter(line => line.trim()).length - 1;
    
    if (currentLineNumber >= 0 && currentLineNumber < lines.length) {
      // Get suggestions for next lines without adding comments
      const suggestedLines = await nextLinesSuggest(lines.slice(0, currentLineNumber + 1));
      setSuggestions(suggestedLines);
      setShowSuggestionPopup(true);
      setIsCtrlEnterSuggestion(true);
      
      // Update cursor coordinates for popup positioning
      const textarea = textareaRef.current;
      if (textarea) {
        const textBeforeCursor = code.substring(0, currentPosition);
        const lines = textBeforeCursor.split('\n');
        const lineHeight = 21; // Approximate line height in pixels
        const y = lines.length * lineHeight;
        const x = lines[lines.length - 1].length * 8; // Approximate character width
        
        setCursorCoords({ x, y });
      }
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

  const handleAcceptErrorSuggestion = (correctionIndex = 0) => {
    if (error && error.corrections && error.corrections.length > correctionIndex) {
      const lines = code.split('\n');
      
      // Find the line with the error (should be the line that matches error.currentLine)
      const errorLineIndex = lines.findIndex(line => line.trim() === error.currentLine.trim());
      
      if (errorLineIndex >= 0) {
        // Replace the error line with the selected correction
        lines[errorLineIndex] = error.corrections[correctionIndex];
        
        // Add next suggested lines if available
        if (error.nextLines) {
          const nextLines = error.nextLines.split('\n').filter(line => line.trim());
          lines.splice(errorLineIndex + 1, 0, ...nextLines);
        }
        
        const newCode = lines.join('\n');
        setCode(newCode);
        setError(null);
        
        // Move cursor to end of corrected line
        setTimeout(() => {
          const newLines = newCode.split('\n');
          const lastLineIndex = errorLineIndex + (error.nextLines ? error.nextLines.split('\n').filter(line => line.trim()).length : 0);
          const position = newCode.split('\n').slice(0, lastLineIndex + 1).join('\n').length;
          textareaRef.current.selectionStart = position;
          textareaRef.current.selectionEnd = position;
          textareaRef.current.focus();
        }, 0);
      }
    }
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
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

          <Tooltip title="Press Enter to add comments to current line. Press Ctrl+Enter to get next line suggestions.">
            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 2 }}>
              Ctrl+Enter for next line suggestions
            </Typography>
          </Tooltip>

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
                {suggestions.map((suggestion, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      mb: 2, 
                      p: 1, 
                      bgcolor: selectedSuggestionIndex === index ? '#2b2d30' : 'transparent',
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: selectedSuggestionIndex === index ? '2px solid #2e7d32' : '2px solid transparent',
                      '&:hover': {
                        bgcolor: '#2b2d30',
                        border: '2px solid #2e7d32'
                      },
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedSuggestionIndex(index)}
                  >
                    <Typography variant="body2" style={{ 
                      color: selectedSuggestionIndex === index ? '#fff' : '#d4d4d4', 
                      fontFamily: 'monospace'
                    }}>
                      {suggestion}
                    </Typography>
                  </Box>
                ))}
              </div>
            )}
            {showSuggestionPopup && suggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
              <Card style={{
                ...editorStyles.suggestionPopup,
                left: `${cursorCoords.x + 50}px`,
                top: `${cursorCoords.y}px`,
                width: '400px' // Increased width for better readability
              }}>
                <CardContent style={editorStyles.suggestionContent}>
                  <Typography variant="subtitle2" gutterBottom>
                    {isCtrlEnterSuggestion ? "Next line suggestions:" : "Suggested next lines:"}
                  </Typography>
                  {suggestions.map((suggestion, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        mb: 2, 
                        p: 1, 
                        bgcolor: selectedSuggestionIndex === index ? '#2b2d30' : 'transparent',
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: selectedSuggestionIndex === index ? '2px solid #2e7d32' : '2px solid transparent',
                        '&:hover': {
                          bgcolor: '#2b2d30',
                          border: '2px solid #2e7d32'
                        },
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => setSelectedSuggestionIndex(index)}
                    >
                      <Typography variant="body2" style={{ 
                        color: selectedSuggestionIndex === index ? '#fff' : '#d4d4d4', 
                        fontFamily: 'monospace'
                      }}>
                        {suggestion}
                      </Typography>
                    </Box>
                  ))}
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
            {error && (
              <Card style={{
                ...editorStyles.errorPopup,
                left: `${cursorCoords.x + 50}px`,
                top: `${cursorCoords.y}px`,
                width: '400px' // Increased width for multiple suggestions
              }}>
                <CardContent style={editorStyles.suggestionContent}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorOutlineIcon style={{ color: '#ff6b6b' }} />
                    Error:
                  </Typography>
                  <Typography variant="body2" color="error" gutterBottom>
                    {error.message}
                  </Typography>
                  
                  {error.corrections && error.corrections.length > 0 && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Suggested Corrections:
                      </Typography>
                      
                      {error.corrections.map((correction, index) => (
                        <Box key={index} sx={{ mb: 2, p: 1, bgcolor: '#f1f8e9', borderRadius: 1, position: 'relative' }}>
                          <Typography variant="body2" sx={{ color: '#2e7d32', pr: 8 }}>
                            {correction}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<CheckIcon />}
                            onClick={() => handleAcceptErrorSuggestion(index)}
                            color="success"
                            sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            Accept
                          </Button>
                        </Box>
                      ))}
                    </>
                  )}
                  
                  {error.nextLines && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Next Lines:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#2e7d32', bgcolor: '#f1f8e9', p: 1, borderRadius: 1 }}>
                        {error.nextLines}
                      </Typography>
                    </>
                  )}
                </CardContent>
                <CardActions style={editorStyles.suggestionActions}>
                  <Button
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={() => setError(null)}
                    color="error"
                  >
                    Dismiss
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