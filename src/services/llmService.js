export const useLLM = async (prompt, isErrorCheck = false) => {
  try {
    const apiKey = "AIzaSyBi7INxXx7iKCL9RXNIC4tCPQCT5pgQ1ds";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let finalPrompt = prompt;
    if (isErrorCheck) {
      finalPrompt = `You are an assembly language syntax validator for ${prompt.architecture} architecture.
      Analyze this code: "${prompt.code}"
      Check for:
      1. Valid instruction format
      2. Correct operand syntax
      3. Valid register names
      4. Proper use of commas and other symbols
      5. Valid addressing modes
      
      If there are ANY syntax errors, respond in this format:
      ERROR: [short error message]
      CORRECT: [corrected version of the line with short comments]
      NEXT: [suggested next lines in proper assembly format with short comments]
      
      If the syntax is correct, respond with exactly 'VALID'.
      Be very strict about syntax rules.`;
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
    
    if (isErrorCheck) {
      const isValid = aiText.trim().toUpperCase() === 'VALID';
      if (isValid) {
        return {
          isValid: true,
          message: 'Valid syntax'
        };
      }

      // Parse error response
      const errorMatch = aiText.match(/ERROR: (.*?)(?:\n|$)/);
      const correctMatch = aiText.match(/CORRECT: (.*?)(?:\n|$)/);
      const nextMatch = aiText.match(/NEXT: (.*?)(?:\n|$)/s);

      return {
        isValid: false,
        message: errorMatch ? errorMatch[1].trim() : 'Syntax error',
        correction: correctMatch ? correctMatch[1].trim() : null,
        nextLines: nextMatch ? nextMatch[1].trim() : null
      };
    }
    
    return aiText;
  } catch (e) {
    console.log("Error:", e);
    return isErrorCheck ? { isValid: false, message: "Error checking code" } : "Model ERROR";
  }
}; 