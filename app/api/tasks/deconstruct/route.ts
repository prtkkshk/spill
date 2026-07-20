import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { description } = await req.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid task description' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Deconstruct this task into exactly 3 clear, small, sequential sub-steps:
Task: "${description}"

Rules:
1. Each sub-step must start with an active verb.
2. Keep each sub-step brief (under 12 words).
3. Return ONLY a valid JSON array of 3 strings. Example: ["Step 1", "Step 2", "Step 3"]`;

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini deconstruction API error:', errText);
      return NextResponse.json({ error: `Gemini API failed with status ${response.status}` }, { status: 502 });
    }

    const resultJson = await response.json();
    const rawText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ error: 'Gemini returned empty response' }, { status: 502 });
    }

    let subSteps: string[] = [];
    try {
      const parsed = JSON.parse(rawText.trim());
      if (Array.isArray(parsed)) {
        subSteps = parsed.slice(0, 3).map((s) => String(s));
      }
    } catch (parseErr) {
      console.error('Failed to parse sub-steps JSON:', rawText);
      subSteps = [
        'Research and gather preliminary requirements',
        'Execute core implementation steps',
        'Review and finalize output',
      ];
    }

    if (subSteps.length === 0) {
      subSteps = [
        'Prepare initial outline',
        'Draft main deliverables',
        'Conduct quick sanity check',
      ];
    }

    return NextResponse.json({
      success: true,
      subSteps,
    });
  } catch (error: any) {
    console.error('Route error in POST /api/tasks/deconstruct:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
