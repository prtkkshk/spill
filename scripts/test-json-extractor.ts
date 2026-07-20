function extractJsonObject(text: string): string {
  const firstCurly = text.indexOf('{');
  if (firstCurly === -1) return text;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstCurly; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          return text.substring(firstCurly, i + 1);
        }
      }
    }
  }
  return text;
}

const messyOutput = `{"transcript": "Buy milk today", "tasks": [{"description": "Buy milk", "fuzzy_deadline": "today", "energy_level": "low_focus"}]}\n\nSome trailing LLM commentary here that breaks standard JSON.parse`;

const extracted = extractJsonObject(messyOutput);
console.log('Extracted:', extracted);
console.log('Parsed successfully:', JSON.parse(extracted));
