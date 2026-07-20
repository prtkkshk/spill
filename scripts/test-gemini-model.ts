const apiKey = process.env.GEMINI_API_KEY!;

async function testGeminiModel(modelName: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: "Hello, return JSON: {\"status\": \"ok\"}" }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  console.log(`Model ${modelName} status:`, res.status);
  const text = await res.text();
  console.log(`Model ${modelName} response:`, text.slice(0, 300));
}

async function run() {
  await testGeminiModel("gemini-3.5-flash");
  await testGeminiModel("gemini-2.5-flash");
  await testGeminiModel("gemini-1.5-flash");
  await testGeminiModel("gemini-2.0-flash");
}

run();
