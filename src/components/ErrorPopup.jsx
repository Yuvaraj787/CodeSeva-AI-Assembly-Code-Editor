import React from 'react';
import { Card, CardContent, CardActions, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const ErrorPopup = ({ error, cursorCoords, handleAcceptErrorSuggestion, setError }) => {
  if (!error) return null;

  return (
    <Card style={{
      position: 'absolute',
      zIndex: 2,
      width: '320px',
      backgroundColor: '#252526',
      color: '#d4d4d4',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      left: `${cursorCoords.x + 50}px`,
      top: `${cursorCoords.y}px`
    }}>
      <CardContent style={{ padding: '12px', maxHeight: '180px', overflow: 'auto', whiteSpace: 'pre-wrap', borderBottom: '1px solid #404040' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorOutlineIcon style={{ color: '#ff6b6b' }} />
          Error:
        </Typography>
        <Typography variant="body2" color="error" gutterBottom>
          {error.message}
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Suggested Correction:
        </Typography>
        <Typography variant="body2" sx={{ color: '#2e7d32', bgcolor: '#f1f8e9', p: 1, borderRadius: 1 }}>
          {error.correction}
        </Typography>
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
      <CardActions style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px', gap: '8px' }}>
        <Button
          size="small"
          startIcon={<CloseIcon />}
          onClick={() => setError(null)}
          color="error"
        >
          Decline
        </Button>
        <Button
          size="small"
          startIcon={<CheckIcon />}
          onClick={handleAcceptErrorSuggestion}
          color="success"
        >
          Accept
        </Button>
      </CardActions>
    </Card>
  );
};

export default ErrorPopup; 