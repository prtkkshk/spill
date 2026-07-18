export interface Recording {
  id: string;
  transcript: string;
  duration_seconds: number | null;
  created_at: string;
}

export type TaskStatus = 'pending' | 'completed' | 'snoozed';
export type FuzzyDeadline = 'today' | 'this_week' | 'next_week' | 'backlog' | 'when_free';
export type EnergyLevel = 'high_focus' | 'low_focus';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  fuzzy_deadline: FuzzyDeadline;
  energy_level: EnergyLevel;
  context: string | null;
  specific_deadline: string | null;
  raw_transcript: string | null;
  recording_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ParseResult {
  transcript: string;
  tasks: Array<{
    description: string;
    fuzzy_deadline: FuzzyDeadline;
    energy_level: EnergyLevel;
    context?: string;
    specific_deadline?: string;
  }>;
}

export interface PushSubscriptionData {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at?: string;
}
