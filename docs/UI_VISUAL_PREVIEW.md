# Visual UI Preview - Enhanced Spacing, Icons & Colors

## Improved Spacing

### Before (Cramped)
```
~Edit src/extension.ts  18.8s [23.4k▼ 78%] ✓
```

### After (Breathable)
```
~Edit src/extension.ts  18.8s  [ 23k ▼ 78% ]  ✓
                              ^^           ^^
                           Better spacing in badge
```

**Key Improvements:**
- Double space before badges for visual separation
- Internal spacing in badges: `[ 23k ▼ 78% ]` instead of `[23k▼78%]`
- Double space before status indicator
- Cleaner, easier to scan

---

## Enhanced Icons & Colors

### New Icon Set (More Distinctive)

**Input Operations (Blue Tones)**
- `◉ Read` - Filled circle (blue) - Reading files
- `⬇ WebFetch` - Down arrow (blue) - Fetching data

**Output Operations (Green Tones)**
- `◈ Write` - Diamond (green) - Creating files
- `☑ TodoWrite` - Checkmark (green) - Completing tasks
- `◎ WebSearch` - Target (green) - Finding info

**Modification Operations (Orange/Accent)**
- `◐ Edit` - Half circle (orange) - Modifying files
- `◆ Task` - Diamond (orange) - Running tasks

**Execution Operations (Magenta)**
- `▶ Bash` - Play button (magenta) - Running commands
- `◰ NotebookEdit` - Notebook (magenta) - Editing notebooks

**Search Operations (Cyan)**
- `◎ Glob` - Bullseye (cyan) - Pattern matching
- `◉ Grep` - Search (cyan) - Content search

### Color Semantics

**By Operation Type:**
- 🔵 **Blue** (info) - Reading, fetching (input)
- 🟢 **Green** (success) - Writing, completing (output)
- 🟠 **Orange** (accent) - Editing, modifying (change)
- 🟣 **Magenta** - Executing, running (action)
- 🔷 **Cyan** - Searching, finding (query)

**Status Colors:**
- ✅ Green `✓` - Success
- ❌ Red `✗` - Error
- 🟠 Orange `●` - Running (spinner)
- ⚪ Dim `○` - Pending

---

## Complete Example Output

### Standard View (Default)
```
◐ Edit    src/extension.ts         18.8s  [ 23.4k ▼ 78% ]  ✓
◐ Edit    src/extension.ts         4.6s   [ 127 ▼ 0% ]    ✓
☑ TodoWrite  4 tasks                3.3s   [ 1.2k ▼ 92% ]  ✓
▶ Bash    npm run typecheck         677ms  [ 89 ▼ 0% ]     ✓
▶ Bash    npm run lint              689ms  [ 91 ▼ 0% ]     ✓
▶ Bash    npm test                  1ms    [ 45 ▼ 0% ]     ●

42 operations · 3m 28s · 1.2M tokens (87% cached) · $2.34
```

### With Model Badges
```
◐ Edit    src/extension.ts         18.8s  [ 23.4k ▼ 78% ]  [ sonnet ]  ✓
◐ Edit    src/extension.ts         4.6s   [ 127 ▼ 0% ]     [ sonnet ]  ✓
☑ TodoWrite  4 tasks                3.3s   [ 1.2k ▼ 92% ]  [ sonnet ]  ✓
▶ Bash    npm run typecheck         677ms  [ 89 ▼ 0% ]     [ sonnet ]  ✓
```

### With Cache Dots
```
◐ Edit    src/extension.ts         18.8s  [ 23.4k ▼ ●●●●○ ]  ✓
◐ Edit    src/extension.ts         4.6s   [ 127 ▼ ○○○○○ ]   ✓
☑ TodoWrite  4 tasks                3.3s   [ 1.2k ▼ ●●●●● ]  ✓
```

### With Expandable Details
```
◐ Edit    src/extension.ts         18.8s  [ 23.4k ▼ 78% ]  ✓
  ├─ Input: 23,430 tokens (18,289 cached)
  ├─ Output: 3 tokens
  ├─ Cache write: 5,138 tokens
  └─ Cost: $0.0234 · claude-sonnet-4-5-20250929

◐ Edit    src/extension.ts         4.6s   [ 127 ▼ 0% ]    ✓
  ├─ Input: 124 tokens
  ├─ Output: 3 tokens
  └─ Cost: $0.0003 · claude-sonnet-4-5-20250929
```

### With Context Warning
```
◐ Edit    src/large-file.ts  ⚠     45.2s  [ 145k ▼ 2% ]   ✓
  ├─ Input: 145,000 tokens (2,900 cached)
  ├─ Output: 8 tokens
  ├─ ⚠  Context truncated: Input exceeded 200K limit
  └─ Cost: $0.1450 · claude-sonnet-4-5-20250929
```

---

## Icon Legend

### Quick Reference

| Icon | Tool | Color | Meaning |
|------|------|-------|---------|
| ◉ | Read | Blue | Reading file |
| ◈ | Write | Green | Creating file |
| ◐ | Edit | Orange | Modifying file |
| ▶ | Bash | Magenta | Running command |
| ◎ | Glob | Cyan | Finding files |
| ◉ | Grep | Cyan | Searching content |
| ◆ | Task | Orange | Running task |
| ⬇ | WebFetch | Blue | Fetching URL |
| ◎ | WebSearch | Green | Searching web |
| ◰ | NotebookEdit | Magenta | Editing notebook |
| ☐ | TodoRead | Dim | Reading todos |
| ☑ | TodoWrite | Green | Writing todos |

---

## Color Palette

### Primary Colors

**Tool Icons:**
- `colors.info` (Blue) - Input operations
- `colors.success` (Green) - Output/completion
- `colors.accent` (Orange) - Modification
- `colors.magenta` (Purple) - Execution
- `colors.cyan` (Teal) - Search/query

**Text:**
- `colors.text` - Primary text (high contrast)
- `colors.muted` - Secondary text (medium contrast)
- `colors.dim` - Tertiary text/borders (low contrast)

**Status:**
- `colors.success` (Green) - Success ✓
- `colors.error` (Red) - Error ✗
- `colors.accent` (Orange) - Running ●
- `colors.dim` (Gray) - Pending ○

**Cache Efficiency:**
- Green (>70%) - Excellent cache hit
- Orange (40-70%) - Moderate cache
- Dim (<40%) - Poor cache

---

## Spacing Breakdown

### Row Structure
```
[2sp] [icon] [sp] [name (10ch)] [sp] [detail (flex)] [sp] [time (7ch)] [2sp] [badge] [sp] [model] [2sp] [status]
```

**Padding:**
- Before line: 2 spaces (visual indent)
- Between major sections: 2 spaces
- Within badges: spaces around content
- Between badge elements: single space

### Badge Internal Spacing
```
Old: [23k▼78%]
New: [ 23k ▼ 78% ]
     ^    ^    ^
     Space around content
```

### Detail Row Spacing
```
  ├─ Input: 23,430 tokens (18,289 cached)
  ^  ^      ^               ^
  4sp│      │               └─ Optional info in parens
     └─ Tree│                  with spacing
        connector
            └─ Label: value format
```

---

## Visual Hierarchy

### 1. Primary Information (Brightest)
- Tool name (muted color, readable)
- Status indicator (colored: ✓ ✗ ●)
- Error messages (red)

### 2. Secondary Information (Medium)
- File paths/details (dim)
- Duration (dim)
- Token counts (muted in badges)

### 3. Tertiary Information (Dimmest)
- Icons (colored but subtle)
- Badge brackets (dim)
- Tree connectors (dim)
- Model names (dim)

---

## Dark vs Light Terminal Support

### Adaptive Colors

The color scheme works on both dark and light terminals:

**Dark Terminal:**
- Blue: Bright enough to see
- Green: Vibrant success color
- Orange: Warm accent
- Magenta: Distinct execution color

**Light Terminal:**
- Colors are muted enough to not overwhelm
- Sufficient contrast with white background
- Status indicators remain clear

---

## Accessibility

### Colorblind-Friendly

**Icons as Primary Indicators:**
- Different shapes for different operations
- Not relying solely on color
- Text labels always present

**Color Redundancy:**
- Status has both color AND symbol (✓ ✗ ●)
- Cache efficiency has both color AND dots/percentage
- Model badges have both color AND text

### Screen Reader Support

All information is text-based:
- Numbers are real numbers (not graphics)
- Symbols are unicode characters (read aloud)
- Structured format (easy to parse)

---

## Responsive Behavior

### Narrow Terminals (< 80 cols)
- Badges auto-truncate
- Detail column shrinks
- Essential info preserved

### Wide Terminals (> 120 cols)
- Detail column expands
- More context visible
- Badges remain compact

### Terminal Width Adaptation
- Auto-calculated column widths
- Maintains readability at all sizes
- Graceful degradation

---

## Performance

### Render Time
- No measurable impact from improved spacing
- Box components are efficient
- Color codes are constant-time

### Memory
- Negligible increase (~50 bytes per tool)
- Badge components are lightweight
- No additional state required

---

## User Feedback Points

### What to Watch For

1. **Icon Distinctiveness**
   - Can you quickly identify tool types?
   - Are the shapes different enough?

2. **Color Meaning**
   - Do colors feel intuitive?
   - Is the status color-coding clear?

3. **Spacing Comfort**
   - Is it easy to scan?
   - Does it feel too spread out or too tight?

4. **Badge Readability**
   - Are badges easy to read at a glance?
   - Is the internal spacing helpful?

5. **Detail Row Clarity**
   - Is the tree structure clear?
   - Are numbers easy to parse?

---

## Comparison Summary

### Before
```
~Edit  src/extension.ts            18.8s [23k▼78%] ✓
```

- ❌ Cramped spacing
- ❌ Generic icons (○ ~ repeated)
- ❌ Tight badge format
- ❌ Harder to scan

### After
```
◐ Edit    src/extension.ts         18.8s  [ 23k ▼ 78% ]  ✓
```

- ✅ Breathable spacing
- ✅ Distinctive icons (◐ unique shape)
- ✅ Spaced badge format
- ✅ Easy to scan

**Result:** More professional, easier to read, better visual hierarchy
