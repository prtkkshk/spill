import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseAudioBrainDump } from '@/lib/gemini';

describe('Gemini Logic Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' };
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('successfully parses valid JSON response and normalizes output', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcript: 'I need to call Sarah and write a project pitch today.',
                  tasks: [
                    {
                      description: 'Call Sarah',
                      fuzzy_deadline: 'today',
                      energy_level: 'low_focus',
                      context: 'Sarah',
                    },
                    {
                      description: 'Write project pitch',
                      fuzzy_deadline: 'today',
                      energy_level: 'high_focus',
                      context: 'pitch doc',
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeminiResponse,
    });

    const result = await parseAudioBrainDump('base64String', 'audio/webm');
    
    expect(result.transcript).toBe('I need to call Sarah and write a project pitch today.');
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].description).toBe('Call Sarah');
    expect(result.tasks[0].fuzzy_deadline).toBe('today');
    expect(result.tasks[0].energy_level).toBe('low_focus');
    expect(result.tasks[1].description).toBe('Write project pitch');
    expect(result.tasks[1].fuzzy_deadline).toBe('today');
    expect(result.tasks[1].energy_level).toBe('high_focus');
  });

  it('normalizes invalid deadlines and energy levels to fallback defaults', async () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcript: 'Call dentist next month.',
                  tasks: [
                    {
                      description: 'Call dentist',
                      fuzzy_deadline: 'invalid_deadline_string',
                      energy_level: 'invalid_energy_string',
                      context: '',
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeminiResponse,
    });

    const result = await parseAudioBrainDump('base64String', 'audio/webm');
    
    expect(result.tasks[0].fuzzy_deadline).toBe('this_week'); // Fallback default
    expect(result.tasks[0].energy_level).toBe('low_focus'); // Fallback default
  });

  it('throws an error and logs the raw content on invalid JSON parse failures', async () => {
    const rawFailingText = 'This is not valid JSON string at all';
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: rawFailingText,
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeminiResponse,
    });

    await expect(parseAudioBrainDump('base64String', 'audio/webm')).rejects.toThrow(
      /Failed to parse tasks JSON from LLM/
    );

    // Verify console.error was called to log the failing output
    expect(console.error).toHaveBeenCalled();
  });
});
