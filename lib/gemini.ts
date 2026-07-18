import { ParseResult } from './types';

const getSystemInstruction = (dateContext: string) => `You are FocusFlow's parser. You receive a raw audio recording of a personal, unstructured brain-dump. Do two things: (1) transcribe the audio faithfully, (2) extract clear, actionable tasks from it.

Current Date Context: Today is ${dateContext}. Use this reference date to resolve relative date expressions (like 'tomorrow', 'Friday', 'next week') to determine the correct 'fuzzy_deadline'.

Rules:
1. Each task description must start with a verb (e.g. 'Draft project pitch', not 'thinking about the pitch').
2. Infer fuzzy_deadline as one of: today, this_week, next_week, backlog, when_free.
   - 'today': due today or tomorrow.
   - 'this_week': due by the end of the current calendar week (Sunday).
   - 'next_week': due in the following calendar week (starting next Monday through Sunday). For example, if today is Sunday, a task for "Tuesday" belongs to 'next_week'.
   - 'backlog' / 'when_free': for future or non-urgent items.
3. Infer energy_level as one of: high_focus (deep work, writing, coding), low_focus (quick errands, replies, calls).
4. Extract any mentioned people, tools, or links into a 'context' field.
5. Ignore filler words, false starts, and rambling asides that aren't tasks.
6. Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{
  "transcript": string,
  "tasks": [
    {
      "description": string,
      "fuzzy_deadline": string,
      "energy_level": string,
      "context": string
    }
  ]
}`;

export async function parseAudioBrainDump(
  base64Data: string,
  mimeType: string,
  clientTime?: string
): Promise<ParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // Resolve reference date context
  let dateContext = '';
  if (clientTime) {
    try {
      const parsedDate = new Date(clientTime);
      if (!isNaN(parsedDate.getTime())) {
        dateContext = parsedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) + ' at ' + parsedDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch (e) {
      console.warn('Failed to parse clientTime:', clientTime, e);
    }
  }

  // Fallback to server time if clientTime was missing or invalid
  if (!dateContext) {
    const now = new Date();
    dateContext = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' at ' + now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  // Use Gemini 3.5 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [
        {
          text: getSystemInstruction(dateContext),
        },
      ],
    },
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error status: ${response.status}`, errorText);
    throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`);
  }

  const resultJson = await response.json();
  const rawText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    console.error('Invalid Gemini response structure:', JSON.stringify(resultJson));
    throw new Error('Gemini API returned an empty response or invalid content structure');
  }

  try {
    const parsed: ParseResult = JSON.parse(rawText.trim());
    
    // Normalize properties to ensure they fit database/type restrictions
    if (typeof parsed.transcript !== 'string') {
      parsed.transcript = '';
    }
    
    if (!Array.isArray(parsed.tasks)) {
      parsed.tasks = [];
    }

    parsed.tasks = parsed.tasks.map((task) => {
      // Validate deadline
      let deadline = task.fuzzy_deadline;
      if (!['today', 'this_week', 'next_week', 'backlog', 'when_free'].includes(deadline)) {
        deadline = 'this_week';
      }
      
      // Validate energy level
      let energy = task.energy_level;
      if (!['high_focus', 'low_focus'].includes(energy)) {
        energy = 'low_focus';
      }

      return {
        description: task.description || 'Unnamed Task',
        fuzzy_deadline: deadline,
        energy_level: energy,
        context: task.context || '',
      };
    });

    return parsed;
  } catch (parseError: any) {
    // CRITICAL REQUIREMENT: Wrap JSON parse, log raw failing text, and do not throw uncaught
    console.error('FAILED TO PARSE GEMINI JSON. Raw text was:');
    console.error(rawText);
    throw new Error(`Failed to parse tasks JSON from LLM: ${parseError.message}`);
  }
}
