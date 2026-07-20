import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/tasks/deconstruct/route';

describe('POST /api/tasks/deconstruct', () => {
  it('returns 400 when task description is missing', async () => {
    const req = new Request('http://localhost:3000/api/tasks/deconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing or invalid task description');
  });

  it('returns subSteps when Gemini API key is provided and mocked', async () => {
    process.env.GEMINI_API_KEY = 'mock_key';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    'Draft outline of project document',
                    'Implement key functional features',
                    'Review and publish release',
                  ]),
                },
              ],
            },
          },
        ],
      }),
    } as any);

    const req = new Request('http://localhost:3000/api/tasks/deconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Build landing page' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.subSteps).toHaveLength(3);
    expect(data.subSteps[0]).toBe('Draft outline of project document');

    fetchSpy.mockRestore();
  });
});
