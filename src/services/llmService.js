export const useLLM = async (prompt, type = 'syntaxCheck') => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let finalPrompt = '';
    switch (type) {
      case 'syntaxCheck':
        finalPrompt = `You are an assembly language syntax validator for ${prompt.architecture} architecture.\nAnalyze this code: "${prompt.code}"\nCheck for syntax errors and provide corrections.`;
        break;
      case 'codeSuggestion':
        finalPrompt = `Based on the following code, suggest the next lines in ${prompt.architecture} language: "${prompt.code}"`;
        break;
      case 'commentGeneration':
        finalPrompt = `Provide a comment for the following line in ${prompt.architecture} language: "${prompt.code}"`;
        break;
      default:
        throw new Error('Invalid request type');
    }

    const payload = {
      contents: [{
        parts: [{
          text: finalPrompt
        }]
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from LLM");
    }
    
    let aiText = data.candidates[0].content.parts[0].text;
    
    if (type === 'syntaxCheck') {
      const isValid = aiText.trim().toUpperCase() === 'VALID';
      if (isValid) {
        return { isValid: true, message: 'Valid syntax' };
      }

      const errorMatch = aiText.match(/ERROR: (.*?)(?:\n|$)/);
      const correctMatch = aiText.match(/CORRECT: (.*?)(?:\n|$)/);
      return {
        isValid: false,
        message: errorMatch ? errorMatch[1].trim() : 'Syntax error',
        correction: correctMatch ? correctMatch[1].trim() : null,
      };
    }

    return aiText;
  } catch (e) {
    console.log("Error:", e);
    return type === 'syntaxCheck' ? { isValid: false, message: "Error checking code" } : "Model ERROR";
  }
}; 