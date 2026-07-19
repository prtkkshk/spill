import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { Task } from '@/lib/types';

// GET: fetch all pending tasks grouped by Overdue, Today, This Week, and Anytime
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientTime = searchParams.get('clientTime');

    // Resolve date boundary context
    let todayBoundary = new Date();
    if (clientTime) {
      const parsed = new Date(clientTime);
      if (!isNaN(parsed.getTime())) {
        todayBoundary = parsed;
      }
    }
    
    // Start of client local day
    const todayStart = new Date(todayBoundary);
    todayStart.setHours(0, 0, 0, 0);

    // Monday week boundary for this week tasks
    const currentWeekStart = new Date(todayStart);
    const day = todayStart.getDay(); // 0 Sunday, 1 Monday, etc.
    const diff = todayStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    const supabase = getSupabaseService();

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: completedTasks, error: completedError } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    if (completedError) {
      console.error('Failed to fetch completed tasks:', completedError);
      return NextResponse.json({ error: completedError.message }, { status: 500 });
    }

    const typedTasks = (tasks || []) as Task[];

    const grouped = {
      overdue: [] as Task[],
      today: [] as Task[],
      this_week: [] as Task[],
      next_week: [] as Task[],
      anytime: [] as Task[],
      completed: (completedTasks || []) as Task[],
    };

    typedTasks.forEach((task) => {
      const taskDate = new Date(task.created_at);

      if (task.fuzzy_deadline === 'today') {
        if (taskDate < todayStart) {
          grouped.overdue.push(task);
        } else {
          grouped.today.push(task);
        }
      } else if (task.fuzzy_deadline === 'this_week') {
        if (taskDate < currentWeekStart) {
          grouped.overdue.push(task);
        } else {
          grouped.this_week.push(task);
        }
      } else if (task.fuzzy_deadline === 'next_week') {
        grouped.next_week.push(task);
      } else {
        grouped.anytime.push(task);
      }
    });

    return NextResponse.json({
      success: true,
      tasks: grouped,
      rawTasks: typedTasks,
    });
  } catch (error: any) {
    console.error('Route error in GET /api/tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: create a task manually
export async function POST(req: Request) {
  try {
    const { description, fuzzy_deadline, energy_level, context } = await req.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid description' }, { status: 400 });
    }

    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        description: description.trim(),
        status: 'pending',
        fuzzy_deadline: fuzzy_deadline || 'today',
        energy_level: energy_level || 'low_focus',
        context: context || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create task manually:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: data,
    });
  } catch (error: any) {
    console.error('Route error in POST /api/tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: update a task (complete, edit description, deadline, or energy level)
export async function PATCH(req: Request) {
  try {
    const { id, description, fuzzy_deadline, energy_level, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const updatePayload: any = {};

    if (description !== undefined) updatePayload.description = description.trim();
    if (fuzzy_deadline !== undefined) {
      updatePayload.fuzzy_deadline = fuzzy_deadline;
      updatePayload.created_at = new Date().toISOString();
    }
    if (energy_level !== undefined) updatePayload.energy_level = energy_level;
    if (status !== undefined) {
      updatePayload.status = status;
      if (status === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      } else if (status === 'pending') {
        updatePayload.completed_at = null;
      }
    }

    // Default if only id is passed: mark as completed (legacy complete trigger compat)
    if (Object.keys(updatePayload).length === 0) {
      updatePayload.status = 'completed';
      updatePayload.completed_at = new Date().toISOString();
    }

    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: data,
    });
  } catch (error: any) {
    console.error('Route error in PATCH /api/tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: remove a task permanently or bulk clear completed tasks
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, scope } = body;

    const supabase = getSupabaseService();

    if (scope === 'completed') {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('status', 'completed');

      if (error) {
        console.error('Failed to clear completed tasks:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Cleared all completed tasks' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing task id or scope' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (error: any) {
    console.error('Route error in DELETE /api/tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
