import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// API endpoint for predictions
app.post('/api/predict', (req, res) => {
    console.log('Received prediction request:', req.body);

    const { context, model } = req.body;

    // Verify input
    if (!context || !Array.isArray(context)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid context. Expected an array of tokens.'
        });
    }

    // Build the path to the Python script
    const scriptPath = path.join(__dirname, 'python', 'model_predict.py');

    // Prepare input data
    const inputData = {
        context: context,
        model: model || '8051'
    };

    // Convert to JSON and DOUBLE QUOTE the entire string
    const jsonString = JSON.stringify(inputData);
    console.log('Input JSON:', jsonString);

    // Use double quotes for the command and the JSON parameter
    // Windows requires different escaping
    const isWindows = process.platform === 'win32';
    let command;

    if (isWindows) {
        // Windows approach - use double quotes for the path, escaped double quotes for the JSON
        const escapedJson = jsonString.replace(/"/g, '\\"');
        command = `python "${scriptPath}" "${escapedJson}"`;
    } else {
        // Unix approach - use single quotes for the command to preserve the JSON
        command = `python "${scriptPath}" '${jsonString}'`;
    }

    console.log('Executing command:', command);

    // Execute the command
    exec(command, (error, stdout, stderr) => {
        if (stderr) {
            console.error('Python stderr:', stderr);
        }

        if (error) {
            console.error('Python execution error:', error);
            return res.status(500).json({
                success: false,
                error: error.message,
                stderr: stderr,
                command: command // Include the command for debugging
            });
        }

        try {
            // Parse the JSON output
            console.log('Python stdout:', stdout);
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (e) {
            console.error('Failed to parse Python output:', e);
            console.log('Raw output:', stdout);
            res.status(500).json({
                success: false,
                error: 'Failed to parse Python output',
                rawOutput: stdout,
                parseError: e.message
            });
        }
    });
});

// API endpoint for suggestion feedback
app.post('/api/feedback', (req, res) => {
    try {
        const feedback = req.body;
        console.log(feedback)

        // Add server timestamp
        feedback.serverTimestamp = new Date().toISOString();

        // Create feedback directory if it doesn't exist
        const feedbackDir = path.join(__dirname, '../data/feedback');
        if (!fs.existsSync(feedbackDir)) {
            fs.mkdirSync(feedbackDir, { recursive: true });
        }

        // Create a filename based on date for easier organization
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const feedbackFile = path.join(feedbackDir, `feedback-${dateStr}.json`);

        // Read existing data for today or create new array
        let todayFeedback = [];
        if (fs.existsSync(feedbackFile)) {
            const fileContent = fs.readFileSync(feedbackFile, 'utf8');
            try {
                todayFeedback = JSON.parse(fileContent);
            } catch (e) {
                console.error('Error parsing existing feedback file:', e);
            }
        }

        // Add new feedback entry
        todayFeedback.push(feedback);

        // Write back to file
        fs.writeFileSync(feedbackFile, JSON.stringify(todayFeedback, null, 2));

        console.log(`Feedback stored in ${feedbackFile}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error handling feedback:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Current directory: ${__dirname}`);
}); 