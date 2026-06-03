---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git restore:*), Bash(git commit:*), Bash(git log:*)
description: Split staged changes into multiple categorized commits
---

## Context

- Current git status: !`git status`
- All staged changes: !`git diff --staged`
- Recent commits (for style reference): !`git log --oneline -10`
- Current branch: !`git branch --show-current`

## Your task

You are the commit-split skill. Split the staged changes into multiple focused, well-categorized commits.

### Step 1 — Understand the changes

Review the staged diff above and the conversation history to understand:
- What each change does and why it was made
- Which changes are logically related to each other
- The intent behind the work (bug fix, feature, refactor, style, config, etc.)

### Step 2 — Propose commit groups

Think through the staged changes and group them into the smallest number of commits that each tell a coherent story. Good groupings:
- A bug fix in one area + unrelated CSS polish → two commits
- A new hook + the component that uses it → one commit (they're coupled)
- Config change + the feature it enables → one commit

For each proposed commit, determine:
1. A conventional commit message (`fix:`, `feat:`, `refactor:`, `style:`, `chore:`, etc.)
2. Which files belong to it
3. Whether any file contains mixed changes that need to be partially staged (flag these)

Present the full plan to the user as a numbered list before doing anything:

```
Proposed commits:
1. fix: <message> → file1.jsx, file2.js
2. feat: <message> → file3.jsx
3. style: <message> → index.css
```

Ask: "Proceed with this plan, or would you like to adjust the groupings?"

### Step 3 — Execute (only after user confirms)

For each commit group, in order:

1. Unstage everything: `git restore --staged .`
2. Stage only the files for this group: `git add <file1> <file2> ...`
   - If a file has mixed changes, note it explicitly and ask whether to skip the mixed portions or commit the whole file
3. Verify what's staged looks right: `git diff --staged --stat`
4. Commit with this exact format:
   ```
   git commit -m "$(cat <<'EOF'
   <type>: <message>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

After all commits are done, run `git log --oneline -5` and show the user the final result.

### Rules

- NEVER commit `.env`, credentials, or secret files — warn the user if staged
- NEVER use `--no-verify`
- NEVER amend existing commits
- NEVER use `git add .` or `git add -A` — always add files by name
- Commit messages explain WHY, not just WHAT — draw on the conversation history for context
- If the staged diff is already a single coherent unit, say so and create one commit directly rather than forcing splits
