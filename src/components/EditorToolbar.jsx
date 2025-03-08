import React from 'react';
import { AppBar, Toolbar, Typography, FormControl, InputLabel, Select, MenuItem, Box, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FileOpenIcon from '@mui/icons-material/FileOpen';

const EditorToolbar = ({ architecture, setArchitecture, handleLoad, handleSave }) => {
  const architectures = ['8051', 'ARM', 'x86'];

  return (
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
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default EditorToolbar; 