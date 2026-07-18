# FocusFlow Product Roadmap & Candid Audit

This document contains a candid UX, parsing, and architecture audit of FocusFlow, followed by a scoped roadmap for V1.1. It is designed to turn FocusFlow from a capture prototype into a highly robust, frictionless daily companion for ADHD brains.

---

## 1. Candid App Audit

### 1.1 UX Friction Gaps (Record → Transcribe → Parse → Task List)
1. **"Voice-Only" Capture Strain:**
   * **Location:** [app/page.tsx](file:///C:/Users/prtkk/Desktop/project/app/page.tsx), [components/Recorder.tsx](file:///C:/Users/prtkk/Desktop/project/components/Recorder.tsx)
   * **Problem:** ADHD users often experience sudden task memory sparks in quiet environments (e.g., library, public transit, shared office, late at night). Forcing voice-only recording creates an immediate friction barrier, causing the user to abort capture. There is no inline quick-add text field.
2. **Typos & Parse Mistakes are Permanent:**
   * **Location:** [components/TaskList.tsx](file:///C:/Users/prtkk/Desktop/project/components/TaskList.tsx)
   * **Problem:** If Gemini mishears a word (e.g., "Sarah" becomes "share") or parses a task poorly, the user has **no way to edit** the task. The only options are checking it off (creating false database history) or leaving it broken.
3. **Completed Tasks Disappear Instantly:**
   * **Location:** [app/api/tasks/route.ts](file:///C:/Users/prtkk/Desktop/project/app/api/tasks/route.ts), [components/TaskList.tsx](file:///C:/Users/prtkk/Desktop/project/components/TaskList.tsx)
   * **Problem:** When a user checks off a task, it vanishes from the UI after a 300ms transition. If a task was checked by accident (easy to do on mobile viewport swipes/taps), there is no way to undo it or view completed history.
4. **Capture Processing Delay:**
   * **Location:** [components/Recorder.tsx](file:///C:/Users/prtkk/Desktop/project/components/Recorder.tsx)
   * **Problem:** The upload and Gemini parsing phase takes 4–8 seconds. A loading screen with no distraction or secondary interaction is a high bounce risk for easily distracted minds.

### 1.2 Voice/AI Parsing & Reliability Gaps
1. **The Static Deadline Trap (Overdue Tasks):**
   * **Location:** [app/api/tasks/route.ts](file:///C:/Users/prtkk/Desktop/project/app/api/tasks/route.ts), [lib/gemini.ts](file:///C:/Users/prtkk/Desktop/project/lib/gemini.ts)
   * **Problem:** `fuzzy_deadline` is resolved once by Gemini and stored in the database as a static string (e.g. `'today'` or `'this_week'`). If a day or week passes, the task stays in that bucket forever. It does not automatically rollover or flag as "Overdue", resulting in cognitive clutter.
2. **Ambiguous Dumps & Over-Splitting:**
   * **Location:** [lib/gemini.ts](file:///C:/Users/prtkk/Desktop/project/lib/gemini.ts)
   * **Problem:** If a user rambles about a single thought (e.g., "I should really email Sarah... wait, no, I need to check her calendar first, then email"), Gemini often splits this into two or three separate cards ("Check Sarah's calendar", "Email Sarah"), cluttering the list.
3. **No Voice Confirmation/Clarify Step:**
   * **Problem:** Inserting parsed tasks directly into the database without a quick confirm/clarify screen means the user has to manually deal with clutter later.

### 1.3 Structural Limitations for Daily Utility
1. **No Rescheduling or Snoozing:**
   * **Problem:** Users cannot drag, swipe, or change task urgency categories (e.g., snoozing a Today task to Next Week) once captured.
2. **Lack of Progress Indicators:**
   * **Problem:** ADHD brains benefit heavily from visual rewards and progress momentum. The dashboard lacks a "completed today" counter or streak counter to provide immediate positive reinforcement.

### 1.4 Data Model & API Gaps
1. **GET API Hides Completed Tasks:**
   * **Location:** [app/api/tasks/route.ts](file:///C:/Users/prtkk/Desktop/project/app/api/tasks/route.ts)
   * **Problem:** The `GET` endpoint filters `status = 'pending'`. To show completed history, the API must be extended or accept query parameters.
2. **Static Deadline Storage:**
   * **Problem:** Storing deadlines as a VARCHAR text string makes chronological sorting impossible. Fortunately, the `created_at` timestamp is stored, which allows relative date math.

---

## 2. Scoped Ideation (Three Categories Only)

### Category A: Task & Productivity Features

#### 1. Dynamic Rollover & Overdue Section
* **Problem:** Pending tasks from yesterday clutter the "Today" list without context, and tasks from last week stay in "This Week" indefinitely.
* **How it works:** The `GET /api/tasks` endpoint calculates if a task with `fuzzy_deadline = 'today'` was created on a previous calendar day (based on query-time date comparison). If yes, it groups them into an **Overdue / Rollover** sub-group in the JSON response, rendered with a warning badge.
* **Effort:** Small/Medium
* **Scope Check:** V1 compliant (zero-cost, single-user, DB query logic only).

#### 2. Inline Card Edit & Delete
* **Problem:** Typographic errors or mis-parsed tasks are un-editable.
* **How it works:** Cards display a secondary tap icon (pencil/delete). Tapping edit expands the card into an inline edit input field. Tapping delete calls a `DELETE /api/tasks` endpoint.
* **Effort:** Medium
* **Scope Check:** V1 compliant. Requires extending `/api/tasks` to support `PUT` and `DELETE` requests.

#### 3. Text Quick-Add Input
* **Problem:** Users can't use voice capture in quiet, public, or late-night settings.
* **How it works:** Add a glassmorphic inline text input box below the mic section. Submitting a text task bypasses Gemini and inserts a task directly into "Today" + "Low Focus" with instant local UI injection.
* **Effort:** Small
* **Scope Check:** V1 compliant.

#### 4. Collapsible Completed Drawer (last 24 hours)
* **Problem:** Accidental completions cannot be undone; lack of visual completion satisfaction.
* **How it works:** Update `GET /api/tasks` to return tasks completed in the last 24 hours. Render them at the bottom of the list under a collapsible header, styled as semi-transparent cards with a strike-through. Checking one marks it pending again.
* **Effort:** Small/Medium
* **Scope Check:** V1 compliant.

---

### Category B: Voice/AI Parsing Improvements

#### 5. Confirm & Edit Preview Dialog
* **Problem:** Gemini parsing writes directly to the DB, creating clutter if the transcription or extraction goes wrong.
* **How it works:** The recording route `POST /api/process-recording` returns the parsed tasks *without* writing them to Supabase. The UI opens a premium, floating confirmation drawer listing the extracted tasks. The user can tweak, delete, or add items, then tap "Confirm Save" to bulk insert them.
* **Effort:** Medium/Large
* **Scope Check:** V1 compliant.

#### 6. Voice Re-Categorize Command
* **Problem:** Inability to adjust tasks by voice after they are created.
* **How it works:** User records a short voice clip starting with a command word (e.g. "Move Sarah's task to today"). Gemini parses the command and matches the target task description, returning an update instruction.
* **Effort:** Large `[REQUIRES: Complex LLM string matching]`
* **Scope Check:** V1 compliant but highly complex for V1.1.

---

### Category C: Integrations & Sharing

#### 7. Share via Web Share API
* **Problem:** Inability to copy/export FocusFlow lists to other apps or send them to family members.
* **How it works:** A small header button compiles all pending tasks into a clean markdown checklist (e.g., `- [ ] Draft project pitch`) and invokes `navigator.share()` (standard mobile share sheet fallback to navigator.clipboard).
* **Effort:** Small
* **Scope Check:** V1 compliant (client-only, zero-cost).

#### 8. Google Calendar iCal (.ics) Feed Export
* **Problem:** Tasks with specific deadlines do not show up in the user's primary calendar.
* **How it works:** Build a public endpoint `GET /api/tasks/export.ics` that returns iCalendar-formatted events for all pending tasks with `specific_deadline` values. The user subscribes to this URL in Google Calendar or iOS Calendar.
* **Effort:** Medium
* **Scope Check:** V1 compliant. No auth required (public read-only calendar feed).

---

## 3. Prioritized V1.1 Slate (Impact vs. Effort)

| Feature | Impact | Effort | Recommendation |
|---|---|---|---|
| **Text Quick-Add Input** | High | Small | **Approved V1.1** |
| **Inline Card Edit & Delete** | High | Medium | **Approved V1.1** |
| **Collapsible Completed Drawer** | Medium | Small | **Approved V1.1** |
| **Dynamic Rollover / Overdue** | High | Medium | **Approved V1.1** |
| **Share via Web Share API** | Medium | Small | **Approved V1.1** |
| **Confirm & Edit Preview Dialog**| High | Large | Deferred to V2 (Preview screen overhead) |
| **iCal Feed Export** | Medium | Medium | Deferred to V2 |
| **Voice Re-Categorize Command** | Low | Large | Deferred to V2 |

---

## 4. Proposed Implementation Plan (Phases 9 - 12)

### Phase 9: Text Quick-Add Input
* **Description:** Allow manual task addition via text input for silent, zero-friction capture.
* **UI Changes:** Add a glassmorphic text input field below the date panel. On submit, it inserts the task with a loading shimmer state.
* **API Changes:** Add a `POST` handler to `app/api/tasks/route.ts` accepting description, fuzzy_deadline, and energy_level.
* **Definition of Done:**
  1. Submitting text through the input field creates a task in the database.
  2. The task defaults to `fuzzy_deadline = 'today'` and `energy_level = 'low_focus'` if unspecified.
  3. The task list refreshes automatically and displays the new item.

### Phase 10: Inline Card Edit & Delete
* **Description:** Add controls to edit the description, change the deadline, or delete any task.
* **UI Changes:** Hovering or tapping a task card reveals minor edit (pencil) and delete (trash) buttons. Tapping edit replaces the card text with a form input.
* **API Changes:**
  - Extend `PATCH` in `app/api/tasks/route.ts` to accept optional description, fuzzy_deadline, and energy_level updates.
  - Add `DELETE` handler to `app/api/tasks/route.ts` accepting a task `id`.
* **Definition of Done:**
  1. Editing a task description updates the value in Supabase and re-renders the text instantly.
  2. Deleting a task animates the card scaling down/sliding away, deleting the row in Supabase.
  3. All operations run optimistically without layout jumps.

### Phase 11: Dynamic Rollover & Overdue Section
* **Description:** Tasks in the `today` section created on a past date are automatically grouped into an "Overdue Today" list category with urgent styling.
* **UI Changes:** Display an "Overdue" group above "Today" if any task fits the criteria.
* **API Changes:** Update the `GET /api/tasks` logic. Pass the client's current date as a query parameter (or header). If a task with `fuzzy_deadline = 'today'` has a `created_at` timestamp before today's date boundary, group it as `overdue`.
* **Definition of Done:**
  1. Creating a task in the database with `created_at = yesterday` and `fuzzy_deadline = 'today'` places it in the "Overdue" list section.
  2. The "Overdue" section renders with a distinct warning border-t styling.

### Phase 12: Collapsible Completed Tasks List & Undo
* **Description:** Render tasks completed in the last 24 hours in a collapsible tray, allowing completion undo.
* **UI Changes:** Add a collapsible drawer header "Completed Today" at the bottom.
* **API Changes:** Update the `GET /api/tasks` route to fetch tasks where `status = 'completed'` AND `completed_at >= NOW() - INTERVAL '24 hours'`.
* **Definition of Done:**
  1. Tasks completed by checking the box move to the Completed list.
  2. Unchecking a task inside the completed list updates its status to 'pending' in Supabase and restores it to its original group.

---

## 5. Flagged Decisions & Questions for User

Please approve or choose from the options for the following decisions:

1. **Daily Cron Reminders Integration:** Currently, Web Push is wired to `/api/cron/daily-reminder`. Do you want the cron reminders to only send if there are pending tasks, or should we also send encouraging clear states? *(Recommendation: Only send if pending count > 0 to prevent noise).*
2. **iCal Feed Export:** Should we prioritize iCal calendar feed synchronization (`.ics`) for V1.1, or defer it to V2?
3. **Rollover Grouping Boundary:** Should "Overdue" tasks be kept in their own section at the very top of the list (creates focus pressure), or should they stay in "Today" with an explicit warning tag? *(Recommendation: A dedicated section at the top ensures they are not missed).*
