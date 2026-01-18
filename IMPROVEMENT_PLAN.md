# Ralph CLI Improvement Plan

Based on analysis of the Ralph Playbook, Geoff Huntley's teachings, and current implementation gaps.

---

## Phase 1: Quick Wins (High Value, Low Effort)

### 1.1 Add specs/README.md Lookup Table
**Source**: Geoff's video - "lookup tables that give hints to search tools"

- [ ] Auto-generate `specs/README.md` during `ralph start`
- [ ] Format: Table of specs with descriptions and key topics
- [ ] Update it when `ralph spec` adds new features
- [ ] Reference it in PROMPT_build.md for better search hits

**Example output:**
```markdown
# Specifications Index

| Spec | Description | Key Topics |
|------|-------------|------------|
| todo-app.md | Core todo functionality | state, input, completion |
| auth.md | User authentication | login, sessions, tokens |
```

### 1.2 Git Tagging on Success
**Source**: Ralph Playbook - "create a git tag as soon as there are no build or test errors"

- [ ] Add auto-tagging after successful `ralph work` completion
- [ ] Use semver based on task type (feat → minor, fix → patch)
- [ ] Config option: `work.autoTag: true/false`

### 1.3 Simplify PROMPT_build.md
**Source**: Geoff's video - his prompt is ~10 lines, ours is verbose

Current: ~100+ lines with detailed phases
Target: ~20-30 lines focused on essentials

- [ ] Study specs/README.md
- [ ] Study implementation plan
- [ ] Pick most important unchecked task
- [ ] Use existing codebase patterns
- [ ] Implement with tests
- [ ] Run validation (build, test, lint)
- [ ] When passing, commit and push
- [ ] Update plan, mark task complete

---

## Phase 2: Core Methodology Improvements

### 2.1 Linkage in Implementation Plans
**Source**: Geoff's video - "cite the specification or source code that needs to be adjusted"

- [ ] Update PROMPT_plan.md to require linkage
- [ ] Each task should reference: `[spec: auth.md]` or `[file: src/auth.ts]`
- [ ] Helps Claude find relevant context faster

**Example:**
```markdown
- [ ] Add login endpoint [spec: auth.md] [file: src/api/routes.ts]
- [ ] Create session middleware [spec: auth.md] [file: src/middleware/]
```

### 2.2 Subagent Budget Control
**Source**: Ralph Playbook - "500 Sonnet for reads, only 1 for build/tests"

- [ ] Add explicit subagent limits to prompts
- [ ] Planning: "Use up to 250 parallel subagents for spec study"
- [ ] Building: "Use only 1 subagent for build and tests" (backpressure)

### 2.3 Context Utilization Guidance
**Source**: Ralph Playbook - "40-60% smart zone"

- [ ] Add guidance in prompts about context efficiency
- [ ] "Complete task and exit - don't fill context window"
- [ ] "One task per iteration, fresh context each time"

---

## Phase 3: User Experience Improvements

### 3.1 Attended Mode (New Command)
**Source**: Geoff's video - "watch it, call out weird things, cancel, adjust"

- [ ] Add `ralph work --attended` or `ralph watch`
- [ ] Runs single iteration, pauses for review
- [ ] User can: continue, retry, adjust prompt, abort
- [ ] Teaches users the feedback loop before going autonomous

### 3.2 Interview Improvements for Spec Generation
**Source**: Geoff's video - "generate specs through conversation, then review"

- [ ] Make `ralph start` more conversational
- [ ] Add follow-up questions based on answers
- [ ] Generate draft spec, show to user, allow edits
- [ ] "Clay on pottery wheel" - iterative refinement

### 3.3 Better Feedback During Work Loop
- [ ] Show which task is being worked on
- [ ] Show iteration count and context usage estimate
- [ ] Show time elapsed per iteration
- [ ] Clear success/failure indicators

---

## Phase 4: Advanced Features

### 4.1 Acceptance-Driven Tests
**Source**: Ralph Playbook - "derive tests from acceptance criteria during planning"

- [ ] During `ralph plan`, extract acceptance criteria from specs
- [ ] Generate test stubs or requirements
- [ ] Tasks can't complete without passing derived tests

### 4.2 Work-Scoped Planning
**Source**: Ralph Playbook - "focused plans per branch"

- [ ] `ralph plan --scope "user authentication"`
- [ ] Creates branch-specific IMPLEMENTATION_PLAN.md
- [ ] Narrower scope = better outcomes

### 4.3 Plan Regeneration Command
**Source**: Ralph Playbook - "plan is disposable, regenerate when drift occurs"

- [ ] `ralph plan --regenerate` or `ralph replan`
- [ ] Wipes current plan, creates fresh from specs
- [ ] Useful when plan becomes stale or wrong

### 4.4 LLM-as-Judge for Subjective Criteria
**Source**: Ralph Playbook - "for UX, tone, aesthetics"

- [ ] Optional review step after implementation
- [ ] Uses LLM to evaluate against subjective criteria
- [ ] Binary pass/fail for things like "is the UI clean?"

---

## Phase 5: Documentation & Education

### 5.1 "Screwdriver First" Guide
**Source**: Geoff's video - "learn screwdriver before jackhammer"

- [ ] Add docs explaining manual Ralph technique
- [ ] Show how to do it with just bash + claude
- [ ] Explain why automation works the way it does

### 5.2 Attended Mode Tutorial
- [ ] Guide for first-time users
- [ ] "Watch your first 3 iterations"
- [ ] "Learn to spot when to intervene"

### 5.3 Troubleshooting Guide
- [ ] "Ralph going in circles? Add guardrails"
- [ ] "Wrong patterns? Add utility functions"
- [ ] "Plan stale? Regenerate it"

---

## Implementation Priority

### Immediate (v0.2.0)
1. specs/README.md lookup table
2. Simplify PROMPT_build.md
3. Add linkage requirement to plans
4. Git tagging on success

### Short-term (v0.3.0)
5. Subagent budget in prompts
6. Context utilization guidance
7. Attended mode command
8. Better work loop feedback

### Medium-term (v0.4.0)
9. Acceptance-driven tests
10. Work-scoped planning
11. Plan regeneration command

### Long-term (v0.5.0+)
12. LLM-as-Judge
13. Interview improvements
14. Educational documentation

---

## Success Metrics

- Fewer iterations to complete tasks
- Better code quality (fewer fix loops)
- Users understand methodology faster
- Lower token usage per task (context efficiency)

---

## References

- [Ralph Playbook](https://claytonfarr.github.io/ralph-playbook/)
- [Geoff Huntley's Ralph](https://ghuntley.com/ralph)
- Geoff's Loom livestream (Jan 2026)
