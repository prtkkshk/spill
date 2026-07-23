const fs = require('fs');
const path = require('path');
const testModel = async (model) => {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY');
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
    });
    const json = await res.json();
    console.log(`${model} status:`, res.status, json.error ? json.error.message : 'Success');
  } catch(e) {
    console.log(`${model} error:`, e.message);
  }
};
const run = async () => {
  await testModel('gemini-3.5-flash');
  await testModel('gemini-2.5-flash');
  await testModel('gemini-2.0-flash');
  await testModel('gemini-1.5-flash');
};
run();
