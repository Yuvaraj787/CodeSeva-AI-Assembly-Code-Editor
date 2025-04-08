// We use the Node.js child_process module
const { exec } = require('child_process');

/**
 * Runs a Python prediction based on the given context and model type
 * @param {Array<string>} context - Array of tokens for context
 * @param {string} modelType - The model type ('8051', '8085', etc.)
 * @returns {Promise<Array|null>} - Array of predictions or null on error
 */
export const runPythonPrediction = (context, modelType) => {
    return new Promise((resolve, reject) => {
        // Prepare input data as JSON
        const inputData = {
            context: context,
            model: modelType
        };

        // Escape single quotes to prevent command injection
        const safeInput = JSON.stringify(inputData).replace(/'/g, "\\'");

        // Build the command to execute the Python script
        const command = `python src/python/model_predict.py '${safeInput}'`;

        // Execute the command
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Python execution error: ${error.message}`);
                return resolve(null);
            }

            if (stderr) {
                console.error(`Python stderr: ${stderr}`);
                // Try to parse debug info if available
                try {
                    const debugInfo = JSON.parse(stderr);
                    console.log('Python debug info:', debugInfo);
                } catch (e) {
                    // Not JSON, just regular stderr
                }
            }

            try {
                // Parse the JSON output
                const result = JSON.parse(stdout);

                if (!result.success) {
                    console.error(`Python error: ${result.error}`);
                    return resolve(null);
                }

                // Return the predictions
                resolve(result.predictions);
            } catch (e) {
                console.error('Failed to parse Python output:', e);
                console.log('Raw output:', stdout);
                resolve(null);
            }
        });
    });
}; 