import { POST as processRoute } from '../app/api/process-recording/route';
import { GET as getTasksRoute, PATCH as patchTasksRoute } from '../app/api/tasks/route';
import { getSupabaseService } from '../lib/supabase';

// Helper to create a Mock Request with FormData
function createMockPostRequest(fileData: Buffer, mimeType: string, duration?: number) {
  const boundary = '----TestBoundary' + Math.random().toString(36).substring(2);
  
  // Build raw multipart form data payload manually since Next.js Request expects standard Web API format
  const parts: Buffer[] = [];
  
  parts.push(Buffer.from(`--${boundary}\r\n`));
  parts.push(Buffer.from(`Content-Disposition: form-data; name="audio"; filename="test.wav"\r\n`));
  parts.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`));
  parts.push(fileData);
  parts.push(Buffer.from('\r\n'));
  
  if (duration !== undefined) {
    parts.push(Buffer.from(`--${boundary}\r\n`));
    parts.push(Buffer.from(`Content-Disposition: form-data; name="duration"\r\n\r\n`));
    parts.push(Buffer.from(`${duration}\r\n`));
  }
  
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  
  const bodyBuffer = Buffer.concat(parts);
  
  return new Request('http://localhost:3000/api/process-recording', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuffer,
  });
}

async function testDatabaseDirectly() {
  console.log('--- Testing Database Directly ---');
  const supabase = getSupabaseService();
  
  // 1. Insert a mock recording
  console.log('Inserting mock recording...');
  const { data: rec, error: recErr } = await supabase
    .from('recordings')
    .insert({
      transcript: 'This is a test transcript for a messy brain dump. I need to buy groceries and call Sarah.',
      duration_seconds: 12,
    })
    .select()
    .single();
    
  if (recErr) {
    console.error('Recording insert failed:', recErr.message);
    return null;
  }
  console.log('Successfully inserted recording. ID:', rec.id);
  
  // 2. Insert mock tasks referencing the recording
  console.log('Inserting mock tasks...');
  const { data: tasks, error: tasksErr } = await supabase
    .from('tasks')
    .insert([
      {
        description: 'Buy groceries',
        status: 'pending',
        fuzzy_deadline: 'today',
        energy_level: 'low_focus',
        context: 'grocery store',
        raw_transcript: rec.transcript,
        recording_id: rec.id,
      },
      {
        description: 'Call Sarah',
        status: 'pending',
        fuzzy_deadline: 'this_week',
        energy_level: 'high_focus',
        context: 'Sarah',
        raw_transcript: rec.transcript,
        recording_id: rec.id,
      }
    ])
    .select();
    
  if (tasksErr) {
    console.error('Tasks insert failed:', tasksErr.message);
    return null;
  }
  console.log(`Successfully inserted ${tasks.length} tasks.`);
  return { recId: rec.id, tasks };
}

async function testFetchAndPatch(mockData: any) {
  if (!mockData) return;
  console.log('\n--- Testing Fetch (GET /api/tasks) ---');
  
  // Test GET route
  const getReq = new Request('http://localhost:3000/api/tasks');
  const getRes = await getTasksRoute(getReq);
  const getJson = await getRes.json();
  
  console.log('GET response success status:', getRes.ok);
  console.log('Today group task count:', getJson.tasks?.today?.length || 0);
  console.log('This Week group task count:', getJson.tasks?.this_week?.length || 0);
  
  // Test PATCH route
  console.log('\n--- Testing Complete (PATCH /api/tasks) ---');
  const targetTask = mockData.tasks[0];
  console.log(`Marking task "${targetTask.description}" (ID: ${targetTask.id}) as completed...`);
  
  const patchReq = new Request('http://localhost:3000/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: targetTask.id }),
  });
  
  const patchRes = await patchTasksRoute(patchReq);
  const patchJson = await patchRes.json();
  
  console.log('PATCH response success status:', patchRes.ok);
  if (patchJson.success) {
    console.log('Completed task:', patchJson.task.description);
    console.log('Completed at timestamp:', patchJson.task.completed_at);
  } else {
    console.error('PATCH failed:', patchJson.error);
  }
  
  // Cleanup database
  console.log('\nCleaning up database entries...');
  const supabase = getSupabaseService();
  const { error: delErr } = await supabase.from('recordings').delete().eq('id', mockData.recId);
  if (delErr) {
    console.error('Failed to clean up test recording:', delErr.message);
  } else {
    console.log('Database cleanup completed successfully.');
  }
}

async function run() {
  try {
    const mockData = await testDatabaseDirectly();
    if (mockData) {
      await testFetchAndPatch(mockData);
    }
  } catch (err: any) {
    console.error('Error during execution:', err.message || err);
  }
}

run();
