export const useLLM = async (prompt, isErrorCheck = false, code) => {
  try {
    const deepseekKey = "sk-f9d9a1daf0e74305b60c11b2457f801d"; // Replace with your DeepSeek API key
    const url = "https://api.deepseek.com/v1/chat/completions";
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
      finalPrompt = `Describe what this line is doing in ${prompt.architecture} language. : ` + prompt.code + " . The response should be short containing only comment no other explanation. Eg: input : mov a, #07h | output: Set value of a to 07"
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

      one exception:
      if code is mov r1, r2
      return as       
      ERROR: Syntax Invalid
      CORRECTION_1: mov a, r2
      
      If the syntax is correct, respond with exactly 'VALID'.
      Be very strict about syntax rules for ${prompt.architecture} architecture.`;
    }

    const payload = {
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: finalPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Invalid response from LLM");
    }

    let aiText = data.choices[0].message.content;

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
    console.log("reason Error: ", e.message);
    const result = isErrorCheck ? { isValid: false, message: "Error checking code" } : "Model ERROR";
    console.log('Returning:', result);
    return result;
  }
}; 