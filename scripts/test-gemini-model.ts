const apiKey = process.env.GEMINI_API_KEY!;

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    console.log("Available models:", data.models.map((m: any) => m.name.replace('models/', '')));
  } else {
    console.log("Error listing models:", data);
  }
}

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
  if (!res.ok) {
    const text = await res.text();
    console.log(`Model ${modelName} error:`, text.slice(0, 300));
  } else {
    const json = await res.json();
    console.log(`Model ${modelName} success!`);
  }
}

async function run() {
  const testList = [
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-2.0-flash"
  ];
  for (const m of testList) {
    await testGeminiModel(m);
  }
}

run();




