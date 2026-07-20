# Spill — Design System & Visual Specification

Status: active / implemented
Direction: Bold Minimal Dark (high contrast, crisp dark mode default, refined indigo accent, clear typography)

---

## 1. Brand & Product Identity

- **Name:** Spill
- **Tagline:** "Spill your thoughts, we'll sort them out."
- **Core Value Proposition:** Single-tap voice brain-dump parser for capturing tasks on the go, extracting actionable, categorized task lists with minimal input friction.

---

## 2. Visual Direction — "Bold Minimal Dark"

- **Dark Mode Default:** Near-black background (`#0A0A0C`), deep elevated surfaces (`#121318`), crisp off-white typography (`#F3F4F6`).
- **Accent Color:** Confident electric indigo (`#6366F1`), with strong hover (`#818CF8`) and subtle soft fills (`rgba(99, 102, 241, 0.18)`).
- **Light Mode Option:** High-contrast crisp light theme (`#F9FAFB` base, `#FFFFFF` elevated, `#111827` primary text).
- **Restrained Glass & Surfaces:** Clean, precise card borders (`border-glass-border/40`) rather than uniform heavy frosted blur. Reserved blur applied selectively to top nav and main recorder card.
- **Typography:** General Sans + Geist stack with clear hierarchy, bold numbers in stat cards, and readable context badges without arbitrary uppercase stacking.
- **Motion:** Purposeful Framer Motion transitions reserved for state changes (recording, task completion, collapsible drawers, list sorting) without constant visual pulsing.

---

## 3. Design Tokens

### 3.1 Dark Mode (Default)
- `--bg-base`: `#0A0A0C`
- `--bg-elevated`: `#121318`
- `--glass-surface`: `rgba(18, 19, 24, 0.75)`
- `--glass-border`: `rgba(255, 255, 255, 0.1)`
- `--accent`: `#6366F1`
- `--accent-strong`: `#818CF8`
- `--text-primary`: `#F3F4F6`
- `--text-secondary`: `#9CA3AF`
- `--success`: `#10B981`
- `--focus-high`: `#8B5CF6`
- `--danger`: `#EF4444`

### 3.2 Light Mode
- `--bg-base`: `#F9FAFB`
- `--bg-elevated`: `#FFFFFF`
- `--glass-surface`: `rgba(255, 255, 255, 0.8)`
- `--glass-border`: `rgba(0, 0, 0, 0.08)`
- `--accent`: `#4F46E5`
- `--text-primary`: `#111827`
- `--text-secondary`: `#4B5563`

---

## 4. Key Components & Features

1. **Top Navigation Bar:** Spill brand mark, total pending badge, Markdown Share button (`ShareButton.tsx`), and Theme Toggle button (`ThemeToggle.tsx`).
2. **Hero Voice Recorder:** Concentric ripple mic button, persistent visible timer during recording, secure audio processing states without AI-vendor mentions (`Recorder.tsx`).
3. **Quick-Add Text Input:** Zero-friction manual task entry field.
4. **Grouped Task Dashboard:** Categorized lists (Overdue Today, Today, This Week, Next Week, Low-Energy / Anytime).
5. **Inline Edit & Delete:** In-place task description, deadline, and focus level editor with optimistic updates and scale-down deletion.
6. **Collapsible Completed Feed & Bulk Clear:** Bottom drawer displaying recently completed tasks with single-click undo and a 2-step bulk "Clear all" action.
7. **Web Share Export:** Native mobile share sheet integration or clipboard copy fallback.
