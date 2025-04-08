/**
 * Gets predictions from the Python backend
 * @param {Array<string>} context - Array of tokens for context
 * @param {string} modelType - The model type ('8051', '8085', etc.)
 * @returns {Promise<Array|null>} - Array of predictions or null on error
 */
export const getPredictions = async (context, modelType) => {
    console.log('📥 getPredictions called with:', { context, modelType });

    try {
        console.log('🔄 Sending request to Python backend API...');

        const startTime = performance.now();

        const response = await fetch('http://localhost:3001/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                context: context,
                model: modelType
            }),
        });

        const endTime = performance.now();
        console.log(`⏱️ API request completed in ${(endTime - startTime).toFixed(2)}ms`);

        if (!response.ok) {
            console.error('❌ API response not OK:', {
                status: response.status,
                statusText: response.statusText
            });
            return null;
        }

        console.log('✅ API response OK, parsing JSON...');
        const data = await response.json();
        console.log('📊 Received data:', data);

        if (!data.success) {
            console.error('❌ Prediction error from Python:', data.error);
            return null;
        }

        console.log('🎯 Successfully got predictions:', data.predictions);
        return data.predictions;
    } catch (error) {
        console.error('💥 Error fetching predictions:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return null;
    }
}; 