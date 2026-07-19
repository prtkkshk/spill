import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getTasksRoute, POST as postTasksRoute, PATCH as patchTasksRoute, DELETE as deleteTasksRoute } from '@/app/api/tasks/route';
import { POST as cronRoute } from '@/app/api/cron/daily-reminder/route';
import { POST as subscriptionRoute } from '@/app/api/push-subscription/route';

// Mock Supabase service
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
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
      delete: mockDelete,
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
      const mockReq = {
        url: 'http://localhost/api/tasks?clientTime=' + new Date().toISOString(),
      } as Request;

      const mockTasks = [
        { id: '1', description: 'Task 1', fuzzy_deadline: 'today', status: 'pending', created_at: new Date().toISOString() },
        { id: '2', description: 'Task 2', fuzzy_deadline: 'this_week', status: 'pending', created_at: new Date().toISOString() },
        { id: 'next', description: 'Task Next', fuzzy_deadline: 'next_week', status: 'pending', created_at: new Date().toISOString() },
        { id: '3', description: 'Task 3', fuzzy_deadline: 'backlog', status: 'pending', created_at: new Date().toISOString() },
      ];

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder.mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            then: (onfulfilled: any) => Promise.resolve({ data: mockTasks, error: null }).then(onfulfilled)
          }),
        }),
      });

      const response = await getTasksRoute(mockReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.tasks.overdue).toHaveLength(0);
      expect(json.tasks.today).toHaveLength(1);
      expect(json.tasks.this_week).toHaveLength(1);
      expect(json.tasks.next_week).toHaveLength(1);
      expect(json.tasks.anytime).toHaveLength(1);
      expect(json.tasks.today[0].id).toBe('1');
      expect(json.tasks.this_week[0].id).toBe('2');
      expect(json.tasks.next_week[0].id).toBe('next');
      expect(json.tasks.anytime[0].id).toBe('3');
    });

    it('correctly classifies old tasks as overdue', async () => {
      // Set today to Sunday July 19th, 2026
      const clientTimeStr = '2026-07-19T12:00:00Z';
      const mockReq = {
        url: 'http://localhost/api/tasks?clientTime=' + encodeURIComponent(clientTimeStr),
      } as Request;

      const mockTasks = [
        { id: '1', description: 'Task 1', fuzzy_deadline: 'today', status: 'pending', created_at: '2026-07-18T10:00:00Z' },
        { id: '2', description: 'Task 2', fuzzy_deadline: 'this_week', status: 'pending', created_at: '2026-07-10T10:00:00Z' },
        { id: '3', description: 'Task 3', fuzzy_deadline: 'today', status: 'pending', created_at: '2026-07-19T08:00:00Z' },
      ];

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder.mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            then: (onfulfilled: any) => Promise.resolve({ data: mockTasks, error: null }).then(onfulfilled)
          }),
        }),
      });

      const response = await getTasksRoute(mockReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.tasks.overdue).toHaveLength(2); // Task 1 (today but yesterday) and Task 2 (this_week but last week)
      expect(json.tasks.today).toHaveLength(1); // Task 3 (today and today)
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

  describe('POST /api/tasks', () => {
    it('creates a manual task and returns the created task details', async () => {
      const mockReq = {
        json: async () => ({
          description: 'New manual task',
          fuzzy_deadline: 'today',
          energy_level: 'low_focus',
        }),
      } as Request;

      const mockCreatedTask = {
        id: 'new-task-123',
        description: 'New manual task',
        status: 'pending',
        fuzzy_deadline: 'today',
        energy_level: 'low_focus',
        created_at: new Date().toISOString(),
      };

      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockCreatedTask, error: null }),
        }),
      });

      const response = await postTasksRoute(mockReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.task.id).toBe('new-task-123');
      expect(json.task.description).toBe('New manual task');
      expect(json.task.fuzzy_deadline).toBe('today');
    });

    it('returns 400 bad request if description is empty or missing', async () => {
      const mockReq = {
        json: async () => ({
          description: '',
        }),
      } as Request;

      const response = await postTasksRoute(mockReq);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toContain('Missing or invalid description');
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

  describe('DELETE /api/tasks', () => {
    it('deletes a single task by id', async () => {
      const mockReq = {
        json: async () => ({ id: 'task-1' }),
      } as Request;

      mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null }),
      });

      const response = await deleteTasksRoute(mockReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.id).toBe('task-1');
    });

    it('clears all completed tasks when scope=completed', async () => {
      const mockReq = {
        json: async () => ({ scope: 'completed' }),
      } as Request;

      mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValue({ error: null }),
      });

      const response = await deleteTasksRoute(mockReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe('Cleared all completed tasks');
    });
  });
});
