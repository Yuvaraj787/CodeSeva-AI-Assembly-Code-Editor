async function queryMistral(data) {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/yuvarajv787/Mistral-7B-v0.1",
    {
      headers: {
        Authorization: "Bearer hf_AIzaiakkasasxINxXx7iKCL9RXCPQCT5pgQ1ds",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

async function querySantaCoder(data) {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/skdhanush/santacoder",
    {
      headers: {
        Authorization: "Bearer hf_zdIzkmmsdasxINxXx7immmRXCPQCT5pgQ1mns",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

async function queryTinyLlama(data) {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/skdhanush/TinyLlama-1.1B-Chat-v1.0",
    {
      headers: {
        Authorization: "Bearer hf_zdIzkmmsdasxINxXx7immmRXCPQCT5pgQ1mns",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  return response.json();
}

// Main function
export const useLLM = async (prompt, isErrorCheck = false, model = "mistral") => {
  try {
    let finalPrompt = prompt;
   
    let response;
    if (model === "mistral") {
      response = await queryMistral(payload);
    } else if (model === "santacoder") {
      response = await querySantaCoder(payload);
    } else if (model === "tinyllama") {
      response = await queryTinyLlama(payload);
    } else {
      throw new Error("Invalid model selection");
    }

    if (!response || !response.generated_text) {
      throw new Error("Invalid response from LLM");
    }

    let correctionMatch = response.generated_text;

    if (isErrorCheck) {
      const isValid = aiText.trim().toUpperCase() === "VALID";
      if (isValid) {
        return { isValid: true, message: "Valid syntax" };
      }

      return {
        isValid: false,
        message: errorMatch ? errorMatch[1].trim() : "Syntax error",
        corrections: [
          correctionMatch
        ].filter(Boolean),
        correction: correctionMatch ? correctionMatch[1].trim() : null,
      };
    }

    return correctionMatch;
  } catch (e) {
    console.log("Error:", e);
    return isErrorCheck ? { isValid: false, message: "Error checking code" } : "Model ERROR";
  }
};
