# 7anime — Codex Engineering Rules

## Project Goal

7anime is a premium anime discovery and streaming web application.

The project prioritizes:

- premium Liquid Glass UI
- responsive web experience
- maintainable architecture
- secure authentication
- watch progress
- library
- profile progression
- excellent performance

---

## General Rules

Before changing code:

1. Inspect the repository.
2. Read relevant documentation.
3. Read docs/CHECKPOINT.md.
4. Inspect git status.
5. Understand existing architecture.

Never assume the repository structure.

Never rewrite working functionality unnecessarily.

---

## Implementation Rules

Prefer:

- TypeScript
- reusable components
- strong typing
- modular architecture
- existing utilities
- existing design tokens

Avoid:

- duplicated code
- unnecessary dependencies
- unrelated refactoring
- hardcoded secrets
- client-side secrets
- giant components

---

## Security

Never expose:

- database credentials
- API secrets
- SMTP credentials
- private signing keys
- session secrets

Never store passwords in plaintext.

Never put secrets in frontend code.

---

## Loop Engineering

Every meaningful task must follow:

PLAN
→ IMPLEMENT
→ RUN
→ INSPECT
→ VERIFY
→ FIX
→ RE-VERIFY
→ CHECKPOINT

Never mark a task complete without verification.

---

## Self Review

After implementation:

1. Review functionality.
2. Review architecture.
3. Review responsive behavior.
4. Review accessibility.
5. Review performance.
6. Review regressions.

Fix critical and high-priority problems before completion.

Maximum 3 review iterations.

---

## Git

Before work:

git status

After work:

git diff

Never overwrite unrelated changes.

Create focused commits at stable milestones.

---

## Checkpoint

At the end of every meaningful task update:

docs/CHECKPOINT.md
docs/DEVELOPMENT_STATUS.md

Include:

- current phase
- completed work
- incomplete work
- files changed
- tests
- results
- known issues
- next exact task

---

## Recovery

If the session is interrupted:

1. Read CHECKPOINT.md.
2. Read DEVELOPMENT_STATUS.md.
3. Inspect git status.
4. Inspect current implementation.
5. Continue from the first incomplete task.

Do not restart completed work.

---

## Phase Control

Never automatically start the next phase.

Complete the assigned phase.
Verify it.
Checkpoint it.
Stop.

# 7ANIME — CODEX CHECKPOINT PROTOCOL

You are working on the 7anime project.

This protocol is mandatory for EVERY meaningful checkpoint, phase completion, or stable milestone.

The purpose of checkpoints is to make the project fully recoverable if:

- Codex reaches a usage limit
- the session ends
- the computer restarts
- the task is interrupted
- another agent continues the work
- a future session needs to understand the current project state

============================================================
1. CHECKPOINT TRIGGER
============================================================

Create/update a checkpoint whenever:

- a major feature is completed
- a development phase is completed
- a stable milestone is reached
- a large architectural change is completed
- a meaningful group of UI components is completed
- a task is intentionally paused
- the user asks for a checkpoint

Do NOT create noisy checkpoints for every tiny CSS change.

============================================================
2. BEFORE CHECKPOINTING
============================================================

Before creating a checkpoint:

1. Inspect git status.
2. Inspect the relevant git diff.
3. Review the files changed during the task.
4. Run relevant tests/checks.
5. Verify the acceptance criteria.
6. Identify incomplete work.
7. Identify known issues.
8. Confirm that the repository is in a recoverable state.

Do not checkpoint work that you know is broken without clearly marking it.

============================================================
3. REQUIRED CHECKPOINT FILES
============================================================

Maintain:

docs/CHECKPOINT.md

and:

docs/DEVELOPMENT_STATUS.md

If these files do not exist, create them.

============================================================
4. CHECKPOINT.md
============================================================

docs/CHECKPOINT.md is the detailed recovery document.

It must always describe the CURRENT repository state.

Use this structure:

# 7anime — Current Checkpoint

## Current Phase

<phase name>

## Current Task

<task name>

## Status

COMPLETE
PARTIALLY COMPLETE
BLOCKED

## Completed Work

- ...
- ...
- ...

## Files Created

- ...
- ...

## Files Modified

- ...
- ...

## Files Deleted

- ...
- ...

## Architecture Decisions

- ...
- ...

## Tests / Checks

- TypeScript: PASS/FAIL/NOT RUN
- Lint: PASS/FAIL/NOT RUN
- Build: PASS/FAIL/NOT RUN
- Tests: PASS/FAIL/NOT RUN
- Browser/UI verification: PASS/FAIL/NOT AVAILABLE

## Verification Results

<what was actually verified>

## Known Issues

- ...
- ...

## Incomplete Work

- ...
- ...

## Follow-Up

- ...
- ...

## Git State

Branch:
<current branch>

Working tree:
CLEAN / MODIFIED

Latest relevant commit:
<commit hash/message if available>

## Recovery Instructions

If work resumes in a new session:

1. Read this file.
2. Read docs/DEVELOPMENT_STATUS.md.
3. Inspect git status.
4. Inspect the current implementation.
5. Continue from the first incomplete item.
6. Do not redo completed work unless verification proves it is incorrect.

## Exact Next Task

<one precise next task>

============================================================
5. DEVELOPMENT_STATUS.md
============================================================

This file is the high-level project progress tracker.

Use this structure:

# 7anime — Development Status

## Current Phase

<phase>

## Overall Status

<short status>

## Completed Phases

- [x] Phase 1 — ...
- [x] Phase 2 — ...

## Current Phase

- [ ] Task
- [ ] Task
- [x] Task

## Upcoming Phases

- [ ] Phase ...
- [ ] Phase ...

## Current Blockers

- ...

## Known Technical Debt

- ...

## Last Updated

<date>

## Next Exact Action

<single next action>

============================================================
6. ACCEPTANCE CRITERIA
============================================================

Before marking a checkpoint COMPLETE:

Check every acceptance criterion individually.

Use:

PASS
FAIL
NOT VERIFIED

Never mark something PASS unless it was actually verified.

If a requirement cannot be verified:

mark it:

NOT VERIFIED

Do not pretend that it passed.

============================================================
7. SELF-REVIEW BEFORE CHECKPOINT
============================================================

Before checkpointing, perform a self-review.

Review:

FUNCTIONALITY
- Does the implementation work?

ARCHITECTURE
- Does it fit the existing architecture?
- Is there unnecessary duplication?

UI
- Does it match the 7anime design system?
- Is the Liquid Glass system consistent?

RESPONSIVENESS
- Desktop
- Tablet
- Mobile
- 320px where relevant

ACCESSIBILITY
- Keyboard
- Focus
- Labels
- Contrast
- Touch targets

PERFORMANCE
- Unnecessary renders
- Excessive animations
- Unnecessary requests
- Oversized assets

REGRESSION
- Did existing functionality break?

============================================================
8. FIX BEFORE CHECKPOINT
============================================================

If self-review discovers:

CRITICAL issue:
→ MUST FIX before completion.

HIGH issue:
→ MUST FIX before completion unless explicitly blocked.

MEDIUM issue:
→ Fix if within current scope; otherwise document.

LOW issue:
→ Document under Follow-Up.

Never hide known problems.

============================================================
9. GIT CHECKPOINT
============================================================

When the phase is stable:

1. Run git status.
2. Review git diff.
3. Ensure unrelated user changes are untouched.
4. Run relevant checks.
5. Create a focused commit when appropriate.

Commit format:

feat: ...
fix: ...
refactor: ...
ui: ...
docs: ...
chore: ...

Examples:

ui: complete 7anime web foundation
ui: complete home page
feat: add anime discovery UI
feat: add authentication
feat: add watch progress
fix: responsive anime card layout

Do NOT create meaningless commits such as:

"changes"
"update"
"stuff"
"done"

============================================================
10. INTERRUPTION RECOVERY
============================================================

If Codex is interrupted before completing a task:

DO NOT restart the entire task.

On the next session:

1. Read docs/CHECKPOINT.md.
2. Read docs/DEVELOPMENT_STATUS.md.
3. Inspect git status.
4. Inspect git diff.
5. Determine what was actually completed.
6. Compare repository state against the checkpoint.
7. Reconcile the checkpoint if necessary.
8. Continue from the first incomplete task.

The actual repository state takes priority over an outdated checkpoint.

============================================================
11. USAGE-LIMIT RECOVERY
============================================================

If the task is interrupted because of a usage limit:

The project MUST remain understandable to another agent.

Before stopping, make sure:

- checkpoint files are updated when possible
- incomplete work is clearly documented
- exact next action is documented
- partially implemented files are identified
- known errors are documented
- tests already run are documented

Never write:

"Continue later."

Instead write something precise, such as:

"Next: finish responsive mobile navigation in
src/components/navigation/MobileNav.tsx,
then run npm run lint and npm run build."

============================================================
12. DO NOT LOSE CONTEXT
============================================================

Never rely on conversation history alone.

Important project state must exist inside the repository.

The repository should remain understandable even if a completely new Codex session opens it.

============================================================
13. PHASE BOUNDARIES
============================================================

At the end of a phase:

1. Verify the phase.
2. Update CHECKPOINT.md.
3. Update DEVELOPMENT_STATUS.md.
4. Review git diff.
5. Commit if appropriate.
6. Report the exact next phase.
7. STOP.

Do NOT automatically begin the next phase.

============================================================
14. CURRENT PROJECT SCOPE
============================================================

7anime is currently being developed as a WEB-FIRST project.

Do not introduce:

- Android development
- iOS development
- native mobile architecture

unless explicitly requested in a future phase.

============================================================
15. UI PHASE RULE
============================================================

During UI-only phases:

Do NOT implement:

- backend
- database
- authentication
- SMTP
- OTP
- real AniList integration
- real streaming provider integration
- real playback APIs

Use mock data.

Real functionality belongs to later phases.

============================================================
16. FINAL CHECKPOINT REPORT
============================================================

After creating/updating a checkpoint, report:

CHECKPOINT CREATED

Phase:
<phase>

Status:
<status>

Completed:
<short list>

Checks:
<results>

Known Issues:
<short list>

Next Exact Task:
<one task>

Checkpoint:
docs/CHECKPOINT.md

Development Status:
docs/DEVELOPMENT_STATUS.md

Then STOP.

============================================================
17. GOLDEN RULE
============================================================

The checkpoint must answer five questions without requiring conversation history:

1. Where are we?
2. What has been completed?
3. What is currently incomplete?
4. What is broken or unverified?
5. What EXACTLY should the next agent do?

If those five questions cannot be answered from the repository,
the checkpoint is incomplete.