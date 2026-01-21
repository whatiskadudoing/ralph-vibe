#!/usr/bin/env -S deno run --allow-all
/**
 * Full UI Components Showcase
 *
 * Comprehensive demonstration of all UI components.
 * Run with: deno run --allow-all scripts/full_showcase.tsx
 */

import {
  // Core
  render,
  Box,
  Text,
  Newline,

  // Progress & Status
  ProgressBar,
  StatusIndicator,

  // Lists
  List,
  BulletList,

  // Stats
  StatsLine,

  // Badges
  Badge,
  ModelBadge,
  LabelBadge,

  // Divider
  Divider,
  Line,

  // Table
  Table,
  KeyValueTable,

  // Box variants
  TitleBox,

  // Alerts
  Alert,
  InfoAlert,
  WarningAlert,
  TipAlert,

  // Cards
  Card,
  FeatureCard,
  StatCard,
  InfoCard,

  // Keyboard
  Key,
  KeyCombo,
  Shortcut,
  ShortcutBar,

  // Header/Footer
  Header,
  AppHeader,
  Section,
  StatusBar,
  Breadcrumb,

  // Tree
  Tree,
  FileTree,

  // Code
  CodeBlock,
  Command,
  Diff,

  // Callouts
  Callout,
  Quote,
  Steps,

  // Gradient
  GradientText,
  BrandGradient,
  RainbowText,
  FireText,
  OceanText,

  // Icons
  STATUS_ICONS,
  ARROW_ICONS,
  UI_ICONS,
  TECH_ICONS,
  AI_ICONS,
  SPINNER_FRAMES,

  // Timer
  Duration,

  // Dashboard
  Panel,
  Metric,
  MetricsRow,
  Sparkline,
  MiniBarChart,
  ResourceGauge,

  // Input
  InputField,
  Checkbox,
  RadioGroup,
  Confirm,

  // Layout
  Columns,
  Column,
  Split,
  Stack,
  SidebarLayout,
  TwoColumnCard,
  TitledSection,
  GridLayout,
  GridCell,
} from "../src/components/mod.ts";

// Section title helper
function SectionTitle({ title, icon }: { title: string; icon?: string }): React.ReactElement {
  return (
    <Box marginY={1}>
      <Box borderStyle="round" borderColor="#FF9500" paddingX={2}>
        {icon && <Text color="#FF9500">{icon} </Text>}
        <Text bold color="#FF9500">{title}</Text>
      </Box>
    </Box>
  );
}

function App(): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1}>
      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <AppHeader
        name="RALPH CLI"
        version="0.5.0"
        tagline="Complete UI Components Library"
        color="#FF9500"
      />

      {/* ============================================================ */}
      {/* ICONS SHOWCASE */}
      {/* ============================================================ */}
      <SectionTitle title="ICONS" icon="🎨" />

      <Box flexDirection="column" gap={1}>
        <Box>
          <Text bold>Status: </Text>
          {Object.entries(STATUS_ICONS).map(([name, icon], i) => (
            <Text key={name}>{i > 0 ? "  " : ""}{icon} {name}</Text>
          ))}
        </Box>

        <Box>
          <Text bold>Arrows: </Text>
          {Object.entries(ARROW_ICONS).slice(0, 8).map(([name, icon], i) => (
            <Text key={name}>{i > 0 ? "  " : ""}{icon}</Text>
          ))}
        </Box>

        <Box>
          <Text bold>Tech: </Text>
          {Object.entries(TECH_ICONS).slice(0, 10).map(([name, icon], i) => (
            <Text key={name}>{i > 0 ? "  " : ""}{icon}</Text>
          ))}
        </Box>

        <Box>
          <Text bold>AI: </Text>
          {Object.entries(AI_ICONS).map(([name, icon], i) => (
            <Text key={name}>{i > 0 ? "  " : ""}{icon}</Text>
          ))}
        </Box>

        <Box>
          <Text bold>Spinners: </Text>
          {Object.entries(SPINNER_FRAMES).map(([name, frames]) => (
            <Text key={name}>  {frames[0]} {name}</Text>
          ))}
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* GRADIENT TEXT */}
      {/* ============================================================ */}
      <SectionTitle title="GRADIENT TEXT" icon="🌈" />

      <Box flexDirection="column" gap={1}>
        <Box><Text dimColor>Brand:   </Text><BrandGradient bold>RALPH CLI GRADIENT</BrandGradient></Box>
        <Box><Text dimColor>Rainbow: </Text><RainbowText>RAINBOW COLORS</RainbowText></Box>
        <Box><Text dimColor>Fire:    </Text><FireText bold>FIRE EFFECT</FireText></Box>
        <Box><Text dimColor>Ocean:   </Text><OceanText>OCEAN WAVES</OceanText></Box>
        <Box><Text dimColor>Custom:  </Text><GradientText colors={["#FF00FF", "#00FFFF", "#FFFF00"]}>NEON CUSTOM</GradientText></Box>
      </Box>

      {/* ============================================================ */}
      {/* PROGRESS & STATUS */}
      {/* ============================================================ */}
      <SectionTitle title="PROGRESS & STATUS" icon="📊" />

      <Box gap={4}>
        <Box flexDirection="column" gap={1}>
          <Text bold>Progress Bars:</Text>
          <Box><Text dimColor>Normal:  </Text><ProgressBar percent={42} width={25} color="cyan" /></Box>
          <Box><Text dimColor>Warning: </Text><ProgressBar percent={75} width={25} thresholds={{ warning: 70, danger: 90 }} /></Box>
          <Box><Text dimColor>Danger:  </Text><ProgressBar percent={95} width={25} thresholds={{ warning: 70, danger: 90 }} /></Box>
        </Box>

        <Box flexDirection="column">
          <Text bold>Status Indicators:</Text>
          <StatusIndicator type="success" text="Completed" />
          <StatusIndicator type="error" text="Failed" />
          <StatusIndicator type="warning" text="Warning" />
          <StatusIndicator type="running" text="Running..." />
          <StatusIndicator type="pending" text="Pending" />
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* ALERTS */}
      {/* ============================================================ */}
      <SectionTitle title="ALERTS & BANNERS" icon="🔔" />

      <Box flexDirection="column" gap={1}>
        <InfoAlert title="Information" message="This is an informational alert with helpful details." />
        <WarningAlert title="Warning" message="Something needs your attention." />
        <TipAlert title="Pro Tip" message="Use keyboard shortcuts for faster navigation!" />
      </Box>

      {/* ============================================================ */}
      {/* CARDS */}
      {/* ============================================================ */}
      <SectionTitle title="CARDS" icon="🃏" />

      <Box gap={2}>
        <StatCard label="Operations" value={127} icon="⚡" color="cyan" trend="up" trendValue="12%" />
        <StatCard label="Duration" value="4m 32s" icon="⏱" color="#FF9500" />
        <StatCard label="Tokens" value="89.4K" icon="📊" color="green" trend="down" trendValue="5%" />
      </Box>

      <Box marginTop={1}>
        <InfoCard
          title="Session Info"
          titleColor="#FF9500"
          borderColor="#FF9500"
          data={{
            "Model": "claude-opus-4",
            "Session ID": "abc-123-def",
            "Started": "2 minutes ago",
            "Status": "Active",
          }}
        />
      </Box>

      {/* ============================================================ */}
      {/* LISTS */}
      {/* ============================================================ */}
      <SectionTitle title="LISTS" icon="📝" />

      <Box gap={4}>
        <Box flexDirection="column">
          <Text bold>Bullet List:</Text>
          <BulletList items={["First item", "Second item", "Third item"]} />
        </Box>

        <Box flexDirection="column">
          <Text bold>Task List:</Text>
          <List items={[
            { text: "Setup project", status: "completed" },
            { text: "Write tests", status: "completed" },
            { text: "Deploy", status: "running" },
            { text: "Monitor", status: "pending" },
          ]} />
        </Box>

        <Box flexDirection="column">
          <Text bold>Arrow List:</Text>
          <List
            items={["Option A", "Option B", "Option C"]}
            style="arrow"
            bulletColor="#FF9500"
          />
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* TREE VIEW */}
      {/* ============================================================ */}
      <SectionTitle title="TREE VIEW" icon="🌳" />

      <Box gap={4}>
        <Box flexDirection="column">
          <Text bold>File Tree:</Text>
          <FileTree files={[
            {
              name: "src",
              type: "folder",
              children: [
                { name: "components", type: "folder", children: [
                  { name: "mod.ts", type: "file" },
                  { name: "Button.tsx", type: "file" },
                ]},
                { name: "utils.ts", type: "file" },
              ],
            },
            { name: "package.json", type: "file" },
            { name: "README.md", type: "file" },
          ]} />
        </Box>

        <Box flexDirection="column">
          <Text bold>Custom Tree:</Text>
          <Tree nodes={[
            {
              label: "Authentication",
              icon: "🔐",
              color: "green",
              children: [
                { label: "Login", icon: "✓", color: "green" },
                { label: "Logout", icon: "✓", color: "green" },
              ],
            },
            {
              label: "API Routes",
              icon: "🌐",
              color: "cyan",
              children: [
                { label: "GET /users", icon: "●" },
                { label: "POST /users", icon: "●" },
              ],
            },
          ]} />
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* CODE BLOCKS */}
      {/* ============================================================ */}
      <SectionTitle title="CODE BLOCKS" icon="💻" />

      <Box flexDirection="column" gap={1}>
        <Command command="deno run --allow-all src/mod.ts" prompt="$" />

        <CodeBlock
          title="example.ts"
          language="typescript"
          lineNumbers
          code={`function greet(name: string) {
  console.log(\`Hello, \${name}!\`);
}

greet("World");`}
        />

        <Diff
          title="changes.diff"
          lines={[
            { type: "context", content: "function hello() {" },
            { type: "remove", content: '  return "Hello";' },
            { type: "add", content: '  return "Hello, World!";' },
            { type: "context", content: "}" },
          ]}
        />
      </Box>

      {/* ============================================================ */}
      {/* CALLOUTS & QUOTES */}
      {/* ============================================================ */}
      <SectionTitle title="CALLOUTS & QUOTES" icon="💬" />

      <Box flexDirection="column" gap={1}>
        <Callout type="tip">
          <Text>Use the Tab key to autocomplete commands!</Text>
        </Callout>

        <Quote author="Donald Knuth">
          Premature optimization is the root of all evil.
        </Quote>

        <Steps
          steps={[
            { title: "Install dependencies", completed: true },
            { title: "Configure settings", completed: true },
            { title: "Run the application", description: "Use deno run to start" },
            { title: "Deploy to production" },
          ]}
          currentStep={2}
        />
      </Box>

      {/* ============================================================ */}
      {/* KEYBOARD SHORTCUTS */}
      {/* ============================================================ */}
      <SectionTitle title="KEYBOARD SHORTCUTS" icon="⌨️" />

      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <Key>Enter</Key>
          <Key>Esc</Key>
          <Key variant="primary">Tab</Key>
          <KeyCombo keys={["Ctrl", "C"]} />
          <KeyCombo keys={["Cmd", "Shift", "P"]} />
        </Box>

        <Shortcut keys={["Ctrl", "S"]} description="Save file" />
        <Shortcut keys="?" description="Show help" />

        <ShortcutBar shortcuts={[
          { key: "?", label: "Help" },
          { key: "q", label: "Quit" },
          { key: "↑↓", label: "Navigate" },
          { key: "Enter", label: "Select" },
        ]} />
      </Box>

      {/* ============================================================ */}
      {/* TABLES */}
      {/* ============================================================ */}
      <SectionTitle title="TABLES" icon="📋" />

      <Table
        columns={[
          { header: "Model", width: 12 },
          { header: "Operations", width: 12, align: "right" },
          { header: "Duration", width: 12, align: "right" },
          { header: "Tokens", width: 12, align: "right" },
        ]}
        rows={[
          ["opus", 47, "2m 15s", "45.2K"],
          ["sonnet", 23, "1m 02s", "12.1K"],
          ["haiku", 12, "28s", "3.4K"],
        ]}
        headerStyle="bold"
      />

      {/* ============================================================ */}
      {/* DASHBOARD WIDGETS */}
      {/* ============================================================ */}
      <SectionTitle title="DASHBOARD WIDGETS" icon="📈" />

      <Box gap={2}>
        <Panel title="System" icon="🖥" borderColor="cyan" width={30}>
          <ResourceGauge label="CPU" value={45} width={15} />
          <ResourceGauge label="Memory" value={72} width={15} warningThreshold={70} />
          <ResourceGauge label="Disk" value={23} width={15} />
        </Panel>

        <Panel title="Activity" icon="📊" borderColor="green" width={35}>
          <Box><Text dimColor>Last 10 requests: </Text></Box>
          <Sparkline data={[5, 8, 12, 7, 15, 10, 18, 14, 22, 19]} width={25} color="green" />
          <Newline />
          <MiniBarChart
            items={[
              { label: "GET", value: 145, color: "green" },
              { label: "POST", value: 67, color: "cyan" },
              { label: "PUT", value: 23, color: "yellow" },
            ]}
            maxWidth={20}
          />
        </Panel>
      </Box>

      {/* ============================================================ */}
      {/* NAVIGATION */}
      {/* ============================================================ */}
      <SectionTitle title="NAVIGATION" icon="🧭" />

      <Box flexDirection="column" gap={1}>
        <Breadcrumb items={["Home", "Projects", "ralph-cli", "src"]} />

        <StatusBar items={[
          { icon: "●", value: "main", color: "green" },
          { label: "line", value: "42" },
          { label: "col", value: "8" },
          { value: "UTF-8" },
          { value: "TypeScript", color: "cyan" },
        ]} />
      </Box>

      {/* ============================================================ */}
      {/* FORMS */}
      {/* ============================================================ */}
      <SectionTitle title="FORM ELEMENTS" icon="📝" />

      <Box gap={4}>
        <Box flexDirection="column" gap={1}>
          <InputField label="Username" value="john_doe" focused />
          <InputField label="Password" value="secret" type="password" />
          <InputField label="Email" placeholder="Enter email..." error="Invalid email format" />
        </Box>

        <Box flexDirection="column" gap={1}>
          <Checkbox label="Enable notifications" checked />
          <Checkbox label="Dark mode" />
          <Checkbox label="Auto-save" checked disabled />

          <RadioGroup
            label="Theme"
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: "System", value: "system" },
            ]}
            value="dark"
            focusedIndex={1}
          />
        </Box>

        <Box flexDirection="column">
          <Confirm question="Save changes?" yesSelected />
        </Box>
      </Box>

      {/* ============================================================ */}
      {/* BADGES */}
      {/* ============================================================ */}
      <SectionTitle title="BADGES" icon="🏷" />

      <Box gap={2} flexWrap="wrap">
        <Badge text="NEW" color="green" />
        <Badge text="BETA" color="cyan" />
        <Badge text="DEPRECATED" color="red" />
        <ModelBadge model="opus" />
        <ModelBadge model="sonnet" />
        <ModelBadge model="haiku" />
        <LabelBadge label="v2.0.0" color="cyan" />
        <LabelBadge label="TypeScript" color="blue" />
      </Box>

      {/* ============================================================ */}
      {/* DIVIDERS */}
      {/* ============================================================ */}
      <SectionTitle title="DIVIDERS" icon="➖" />

      <Box flexDirection="column" gap={1}>
        <Line width={60} />
        <Divider width={60} style="dashed" />
        <Divider width={60} style="double" />
        <Divider width={60} label="Section" labelAlign="center" />
        <Divider width={60} label="Options" labelAlign="left" />
      </Box>

      {/* ============================================================ */}
      {/* METRICS */}
      {/* ============================================================ */}
      <SectionTitle title="METRICS ROW" icon="📊" />

      <MetricsRow metrics={[
        { value: "4m 32s", label: "Duration", icon: "⏱", color: "cyan" },
        { value: 5, label: "Iterations", icon: "🔄", color: "#FF9500" },
        { value: 127, label: "Operations", icon: "⚡", color: "green" },
        { value: "89.4K", label: "Tokens", icon: "📊", color: "magenta" },
      ]} />

      {/* ============================================================ */}
      {/* STATS LINE */}
      {/* ============================================================ */}
      <SectionTitle title="STATS LINE" icon="📈" />

      <Box flexDirection="column" gap={1}>
        <StatsLine items={[
          { label: "model", value: "opus", color: "#FF9500" },
          { label: "ops", value: 47 },
          { label: "time", value: "2m 15s" },
          { label: "tokens", value: "45.2K" },
        ]} />

        <StatsLine items={[
          { icon: "⏱", value: "4m 32s" },
          { icon: "🔄", value: "5 iterations" },
          { icon: "⚡", value: "127 ops" },
          { icon: "📊", value: "89.4K tokens" },
        ]} compact />
      </Box>

      {/* ============================================================ */}
      {/* DURATION */}
      {/* ============================================================ */}
      <SectionTitle title="TIME DISPLAY" icon="⏰" />

      <Box gap={4}>
        <Duration seconds={125} format="human" label="Elapsed" showIcon />
        <Duration seconds={3725} format="hh:mm:ss" label="Total" color="cyan" />
        <Duration seconds={45} format="mm:ss" color="green" />
      </Box>

      {/* ============================================================ */}
      {/* LAYOUT COMPONENTS */}
      {/* ============================================================ */}
      <SectionTitle title="LAYOUT COMPONENTS" icon="📐" />

      {/* Split Layout */}
      <Text bold dimColor>Split Layout (50/50 with divider):</Text>
      <Split
        left={
          <Box flexDirection="column" paddingX={1}>
            <Text bold color="cyan">Left Panel</Text>
            <Text>First column content</Text>
            <Text dimColor>- Item A</Text>
            <Text dimColor>- Item B</Text>
          </Box>
        }
        right={
          <Box flexDirection="column" paddingX={1}>
            <Text bold color="green">Right Panel</Text>
            <Text>Second column content</Text>
            <Text dimColor>- Item X</Text>
            <Text dimColor>- Item Y</Text>
          </Box>
        }
        ratio={0.5}
        dividerColor="gray"
      />

      <Newline />

      {/* Two Column Card */}
      <Text bold dimColor>Two Column Card:</Text>
      <TwoColumnCard
        title="Session Details"
        titleColor="#FF9500"
        borderColor="#FF9500"
        left={
          <Box flexDirection="column">
            <Text dimColor>Model</Text>
            <Text dimColor>Duration</Text>
            <Text dimColor>Tokens</Text>
          </Box>
        }
        right={
          <Box flexDirection="column">
            <Text color="#FF9500">Claude Opus</Text>
            <Text>2h 15m</Text>
            <Text>45.2K</Text>
          </Box>
        }
        leftWidth={15}
      />

      <Newline />

      {/* Sidebar Layout */}
      <Text bold dimColor>Sidebar Layout:</Text>
      <SidebarLayout
        sidebarWidth={20}
        sidebarBorder="single"
        sidebarBorderColor="gray"
        showDivider={false}
        sidebar={
          <Box flexDirection="column" padding={1}>
            <Text bold>Menu</Text>
            <Text color="cyan">→ Dashboard</Text>
            <Text dimColor>  Settings</Text>
            <Text dimColor>  Help</Text>
          </Box>
        }
        main={
          <Box flexDirection="column" padding={1}>
            <Text bold>Dashboard</Text>
            <Text>Main content area with flexible width</Text>
            <Text dimColor>This panel expands to fill available space</Text>
          </Box>
        }
      />

      <Newline />

      {/* Columns */}
      <Text bold dimColor>Flexible Columns:</Text>
      <Columns gap={2}>
        <Column borderStyle="round" borderColor="blue" padding={1}>
          <Text bold color="blue">Column 1</Text>
          <Text>Flex grow: 1</Text>
        </Column>
        <Column borderStyle="round" borderColor="green" padding={1} grow={2}>
          <Text bold color="green">Column 2</Text>
          <Text>Flex grow: 2 (wider)</Text>
        </Column>
        <Column borderStyle="round" borderColor="magenta" padding={1}>
          <Text bold color="magenta">Column 3</Text>
          <Text>Flex grow: 1</Text>
        </Column>
      </Columns>

      <Newline />

      {/* Grid Layout */}
      <Text bold dimColor>Grid Layout:</Text>
      <GridLayout columns={3} gap={1}>
        <GridCell borderStyle="single" borderColor="gray" padding={1}>
          <Text>Cell 1</Text>
        </GridCell>
        <GridCell borderStyle="single" borderColor="gray" padding={1}>
          <Text>Cell 2</Text>
        </GridCell>
        <GridCell borderStyle="single" borderColor="gray" padding={1}>
          <Text>Cell 3</Text>
        </GridCell>
        <GridCell borderStyle="single" borderColor="cyan" padding={1}>
          <Text color="cyan">Cell 4</Text>
        </GridCell>
        <GridCell borderStyle="single" borderColor="green" padding={1}>
          <Text color="green">Cell 5</Text>
        </GridCell>
        <GridCell borderStyle="single" borderColor="yellow" padding={1}>
          <Text color="yellow">Cell 6</Text>
        </GridCell>
      </GridLayout>

      <Newline />

      {/* Titled Section */}
      <Text bold dimColor>Titled Sections:</Text>
      <Columns gap={2}>
        <TitledSection
          title="Overview"
          icon="📊"
          titleColor="cyan"
          borderColor="cyan"
          padding={1}
        >
          <Text>Section with title and icon</Text>
          <Text dimColor>Built-in border styling</Text>
        </TitledSection>
        <TitledSection
          title="Actions"
          icon="⚡"
          titleColor="#FF9500"
          borderColor="#FF9500"
          padding={1}
        >
          <Text>Quick actions panel</Text>
          <Text dimColor>Customizable colors</Text>
        </TitledSection>
      </Columns>

      <Newline />

      {/* Stack */}
      <Text bold dimColor>Stack Layout:</Text>
      <Stack gap={1} align="flex-start">
        <Box borderStyle="round" borderColor="gray" paddingX={2}>
          <Text>Stacked Item 1</Text>
        </Box>
        <Box borderStyle="round" borderColor="gray" paddingX={2}>
          <Text>Stacked Item 2</Text>
        </Box>
        <Box borderStyle="round" borderColor="gray" paddingX={2}>
          <Text>Stacked Item 3</Text>
        </Box>
      </Stack>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <Newline />
      <Box
        borderStyle="round"
        borderColor="#FF9500"
        paddingX={4}
        paddingY={1}
        justifyContent="center"
      >
        <Box flexDirection="column" alignItems="center">
          <BrandGradient bold>END OF SHOWCASE</BrandGradient>
          <Text dimColor>All components built with deno-ink</Text>
        </Box>
      </Box>
    </Box>
  );
}

// Render
const instance = await render(<App />);

// Auto-exit after display
setTimeout(() => {
  instance.unmount();
  Deno.exit(0);
}, 3000);
