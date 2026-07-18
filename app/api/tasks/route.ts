import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { Task } from '@/lib/types';

// GET: fetch all pending tasks grouped by Today, This Week, and Low-Energy/Anytime
export async function GET() {
  try {
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

    const typedTasks = (tasks || []) as Task[];

    // Grouping logic:
    // 1. Today: fuzzy_deadline === 'today'
    // 2. This Week: fuzzy_deadline === 'this_week'
    // 3. Low-Energy / Anytime: fuzzy_deadline is backlog/when_free OR energy_level is low_focus
    // (To keep groups mutually exclusive: if it's today, it goes to today. If it's this week, it goes to this week. Otherwise, it goes to anytime/low-energy).
    const grouped = {
      today: [] as Task[],
      this_week: [] as Task[],
      next_week: [] as Task[],
      anytime: [] as Task[],
    };

    typedTasks.forEach((task) => {
      if (task.fuzzy_deadline === 'today') {
        grouped.today.push(task);
      } else if (task.fuzzy_deadline === 'this_week') {
        grouped.this_week.push(task);
      } else if (task.fuzzy_deadline === 'next_week') {
        grouped.next_week.push(task);
      } else {
        grouped.anytime.push(task);
      }
    });

    return NextResponse.json({
      success: true,
      tasks: grouped,
      rawTasks: typedTasks, // Keep raw list in case frontend wants it
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

// PATCH: mark a task as completed and set completed_at
export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const supabase = getSupabaseService();

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to complete task:', error);
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
