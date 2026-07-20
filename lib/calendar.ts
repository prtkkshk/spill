// Calendar & Productivity Integration (iCal / Google Calendar)

import { Task } from './types';

// Generate standard .ics file content for a task
export function generateICSForTask(task: Task): string {
  const title = task.description.replace(/\n/g, ' ');
  const description = `Task from Spill (Energy: ${task.energy_level}, Fuzzy Deadline: ${task.fuzzy_deadline})\n${task.context || ''}`;
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Set event date (default to today/tomorrow or specific deadline)
  const eventDate = new Date();
  eventDate.setHours(10, 0, 0, 0); // Default 10:00 AM
  const startDateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  eventDate.setHours(11, 0, 0, 0);
  const endDateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Spill//Voice Task Parser//EN
BEGIN:VEVENT
UID:spill-${task.id}@spill.app
DTSTAMP:${timestamp}
DTSTART:${startDateStr}
DTEND:${endDateStr}
SUMMARY:${title}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;
}

// Download .ics file in browser
export function downloadICS(task: Task) {
  const content = generateICSForTask(task);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `task-${task.id.slice(0, 8)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate Google Calendar Add URL
export function getGoogleCalendarUrl(task: Task): string {
  const text = encodeURIComponent(task.description);
  const details = encodeURIComponent(
    `Extracted by Spill. Energy Level: ${task.energy_level}. ${task.context ? 'Context: ' + task.context : ''}`
  );

  const now = new Date();
  const start = now.toISOString().replace(/-|:|\.\d+/g, '');
  now.setHours(now.getHours() + 1);
  const end = now.toISOString().replace(/-|:|\.\d+/g, '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${start}/${end}`;
}
