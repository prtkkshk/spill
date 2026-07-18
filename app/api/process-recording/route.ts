import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { parseAudioBrainDump } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const durationStr = formData.get('duration') as string | null;
    const clientTimeStr = formData.get('clientTime') as string | null;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Missing audio file in form data' }, { status: 400 });
    }

    const durationSeconds = durationStr ? Math.round(Number(durationStr)) : null;

    // Convert file to Base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = audioFile.type || 'audio/webm'; // fallback if type is empty

    // Call Gemini 3.5 Flash
    let parseResult;
    try {
      parseResult = await parseAudioBrainDump(base64Data, mimeType, clientTimeStr || undefined);
    } catch (geminiError: any) {
      console.error('Gemini processing failed:', geminiError.message || geminiError);
      return NextResponse.json({ error: `Gemini parsing failed: ${geminiError.message}` }, { status: 502 });
    }

    const supabase = getSupabaseService();

    // 1. Insert into recordings table
    const { data: recordingData, error: recordingError } = await supabase
      .from('recordings')
      .insert({
        transcript: parseResult.transcript || 'No transcript generated',
        duration_seconds: durationSeconds,
      })
      .select('id, transcript, duration_seconds, created_at')
      .single();

    if (recordingError) {
      console.error('Failed to save recording:', recordingError);
      return NextResponse.json({ error: `Database insert failed: ${recordingError.message}` }, { status: 500 });
    }

    const recordingId = recordingData.id;
    let insertedTasks = [];

    // 2. Insert into tasks table if there are tasks
    if (parseResult.tasks && parseResult.tasks.length > 0) {
      const tasksToInsert = parseResult.tasks.map((task) => ({
        description: task.description,
        status: 'pending',
        fuzzy_deadline: task.fuzzy_deadline,
        energy_level: task.energy_level,
        context: task.context || null,
        specific_deadline: task.specific_deadline || null,
        raw_transcript: parseResult.transcript,
        recording_id: recordingId,
      }));

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (tasksError) {
        console.error('Failed to save tasks:', tasksError);
        // We still return the recording and a warning about tasks failing to insert
        return NextResponse.json({
          warning: 'Recording saved, but tasks could not be inserted',
          error: tasksError.message,
          recording: recordingData,
          tasks: [],
        }, { status: 207 }); // Multi-status/Partial success
      }
      
      insertedTasks = tasksData || [];
    }

    return NextResponse.json({
      success: true,
      recording: recordingData,
      tasks: insertedTasks,
    });
  } catch (error: any) {
    console.error('Route error in process-recording API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
