import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getTasksRoute, PATCH as patchTasksRoute } from '@/app/api/tasks/route';
import { POST as cronRoute } from '@/app/api/cron/daily-reminder/route';
import { POST as subscriptionRoute } from '@/app/api/push-subscription/route';

// Mock Supabase service
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase', () => {
  const mockClient = {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      order: mockOrder,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    })),
  };
  return {
    getSupabaseService: () => mockClient,
    supabase: mockClient,
  };
});

describe('API Route Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('correctly fetches pending tasks and groups them by deadline', async () => {
      const mockTasks = [
        { id: '1', description: 'Task 1', fuzzy_deadline: 'today', status: 'pending' },
        { id: '2', description: 'Task 2', fuzzy_deadline: 'this_week', status: 'pending' },
        { id: '3', description: 'Task 3', fuzzy_deadline: 'backlog', status: 'pending' },
      ];

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder.mockResolvedValue({ data: mockTasks, error: null }),
        }),
      });

      const response = await getTasksRoute();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.tasks.today).toHaveLength(1);
      expect(json.tasks.this_week).toHaveLength(1);
      expect(json.tasks.anytime).toHaveLength(1);
      expect(json.tasks.today[0].id).toBe('1');
      expect(json.tasks.this_week[0].id).toBe('2');
      expect(json.tasks.anytime[0].id).toBe('3');
    });
  });

  describe('PATCH /api/tasks', () => {
    it('marks a task completed and sets completed_at timestamp', async () => {
      const mockReq = {
        json: async () => ({ id: 'task-123' }),
      } as Request;

      const mockCompletedTask = {
        id: 'task-123',
        description: 'Completed Task',
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle.mockResolvedValue({ data: mockCompletedTask, error: null }),
          }),
        }),
      });

      const response = await patchTasksRoute(mockReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.task.id).toBe('task-123');
      expect(json.task.status).toBe('completed');
      expect(json.task.completed_at).toBeDefined();
    });
  });

  describe('POST /api/cron/daily-reminder', () => {
    it('blocks request with 401 Unauthorized if CRON_SECRET is missing or wrong', async () => {
      process.env.CRON_SECRET = 'correct-secret';

      const mockReq = {
        headers: {
          get: (name: string) => {
            if (name === 'authorization') return 'Bearer wrong-secret';
            return null;
          },
        },
      } as unknown as Request;

      const response = await cronRoute(mockReq);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/push-subscription', () => {
    it('saves a new subscription to database if not already exists', async () => {
      const mockReq = {
        json: async () => ({
          endpoint: 'https://test-endpoint.com',
          keys: { p256dh: 'p256dh', auth: 'auth' },
        }),
      } as Request;

      // Mock subscription existence check (returns null)
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValue({ data: null, error: null }),
        }),
      });

      // Mock database insertion
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: { id: 'sub-1', endpoint: 'https://test-endpoint.com' },
            error: null,
          }),
        }),
      });

      const response = await subscriptionRoute(mockReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.subscription.id).toBe('sub-1');
    });
  });
});
