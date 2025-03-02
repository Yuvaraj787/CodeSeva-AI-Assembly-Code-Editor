export const useLLM = async (prompt) => {
  try {
    const apiKey = "AIzaSyBi7INxXx7iKCL9RXNIC4tCPQCT5pgQ1ds";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    let aiText = data.candidates[0].content.parts[0].text;
    return aiText;
  } catch (e) {
    console.log("Error:", e);
    return "Model ERROR";
  }
}; 