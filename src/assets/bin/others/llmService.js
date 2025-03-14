export const useLLM = async (prompt, isErrorCheck = false) => {
  try {
    const hugginFaceKey = "AIzaSyBi7INxXx7iKCL9RXNIC4tCPQCT5pgQ1ds";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${hugginFaceKey}`;
    let finalPrompt = prompt;
    if (prompt.type == "next_line_prediction") {
      finalPrompt = `Given the following ${prompt.architecture} assembly code:
${prompt.code}

Provide 3 DIFFERENT possible next sets of TWO lines of assembly code with no comments.
Each suggestion should consist of exactly two lines of assembly code.
Format your response exactly like this, with exactly 3 suggestions:
SUGGESTION_1: 
[first line]
[second line]

SUGGESTION_2: 
[first line]
[second line]

SUGGESTION_3: 
[first line]
[second line]

Make each suggestion unique and valid for ${prompt.architecture} architecture.`
    } else if (prompt.type == "comment") {
      finalPrompt = `Provide a comment for the following line in ${prompt.architecture} language. : `+ lineContext + " . The response should be short containing only comment no other explanation"
    }
    else if (prompt.type == "error_detection") {
      finalPrompt = `You are an assembly language syntax validator for ${prompt.architecture} architecture.
      Analyze this code: "${prompt.code}"
      Check for:
      - Syntax errors
      - Overflow Errors
      - Underflow Errors
      - Incorrect data types
      - Incorrect memory usage
      - Incorrect register usage
      - Invalid opcodes or operands
      - Case sensitivity issues
      - Missing or incorrect syntax elements
      - Register usage errors
      - Invalid addressing modes
      - Invalid instruction format
      
      If there are ANY syntax errors, respond in this format:
      ERROR: [type of error (very short)]
      CORRECTION_1: [first corrected version of the line]
      CORRECTION_2: [second alternative corrected version of the line]
      
      If the syntax is correct, respond with exactly 'VALID'.
      Be very strict about syntax rules for ${prompt.architecture} architecture.`;
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
        const result = {
          isValid: true,
          message: 'Valid syntax'
        };
        console.log('Returning:', result);
        return result;
      }
      // Parse error response
      const errorMatch = aiText.match(/ERROR: (.*?)(?:\n|$)/);
      const correction1Match = aiText.match(/CORRECTION_1: (.*?)(?:\n|$)/);
      const correction2Match = aiText.match(/CORRECTION_2: (.*?)(?:\n|$)/);
      const explanationMatch = aiText.match(/EXPLANATION: (.*?)(?:\n|$)/);

      console.log('Error Match:', errorMatch);
      const result = {
        isValid: false,
        message: errorMatch ? errorMatch[1].trim() : 'Syntax error',
        corrections: [
          correction1Match ? correction1Match[1].trim() : null,
          correction2Match ? correction2Match[1].trim() : null
        ].filter(Boolean),
        explanation: explanationMatch ? explanationMatch[1].trim() : null,
        correction: correction1Match ? correction1Match[1].trim() : null, // For backward compatibility
      };
      console.log('Returning:', result);
      return result;
    }

    console.log('Returning:', aiText);
    return aiText;
  } catch (e) {
    console.log("Error:", e);
    const result = isErrorCheck ? { isValid: false, message: "Error checking code" } : "Model ERROR";
    console.log('Returning:', result);
    return result;
  }
}; 