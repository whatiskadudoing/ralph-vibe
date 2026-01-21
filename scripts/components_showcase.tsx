#!/usr/bin/env -S deno run --allow-all
/**
 * Components Showcase
 *
 * Visual demonstration of all UI components using deno-ink.
 * Run with: deno run --allow-all scripts/components_showcase.tsx
 */

import {
  render,
  Box,
  Text,
  Newline,
  ProgressBar,
  StatusIndicator,
  List,
  StatsLine,
  Badge,
  ModelBadge,
  LabelBadge,
  Divider,
  Line,
  SectionHeader,
  Table,
  KeyValueTable,
  TitleBox,
  BorderedBox,
} from "../src/components/mod.ts";

function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <Box marginY={1}>
      <Box
        borderStyle="round"
        borderColor="#FF9500"
        paddingX={2}
      >
        <Text bold color="#FF9500">{title}</Text>
      </Box>
    </Box>
  );
}

function App(): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor="#FF9500"
        paddingX={4}
        paddingY={1}
        justifyContent="center"
      >
        <Box flexDirection="column" alignItems="center">
          <Text bold color="#FF9500">RALPH CLI</Text>
          <Text dimColor>React UI Components Showcase</Text>
        </Box>
      </Box>

      {/* Progress Bar Section */}
      <SectionTitle title="PROGRESS BAR" />
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text dimColor>Basic:      </Text>
          <ProgressBar percent={42} width={30} color="cyan" />
        </Box>
        <Box>
          <Text dimColor>Thresholds: </Text>
          <ProgressBar percent={75} width={30} thresholds={{ warning: 70, danger: 90 }} />
        </Box>
        <Box>
          <Text dimColor>Danger:     </Text>
          <ProgressBar percent={95} width={30} thresholds={{ warning: 70, danger: 90 }} />
        </Box>
        <Box>
          <Text dimColor>With label: </Text>
          <ProgressBar percent={67} width={30} color="#FF9500" label="5h window" />
        </Box>
      </Box>

      {/* Status Indicator Section */}
      <SectionTitle title="STATUS INDICATOR" />
      <Box flexDirection="column">
        <StatusIndicator type="success" text="Build completed successfully" />
        <StatusIndicator type="error" text="Build failed with errors" />
        <StatusIndicator type="warning" text="Low disk space warning" />
        <StatusIndicator type="info" text="Information message" />
        <StatusIndicator type="pending" text="Waiting to start" />
        <StatusIndicator type="running" text="Installing dependencies..." />
        <StatusIndicator type="skipped" text="Skipped optional step" />
      </Box>

      {/* List Section */}
      <SectionTitle title="LIST" />
      <Box gap={4}>
        <Box flexDirection="column">
          <Text bold>Bullet List:</Text>
          <List
            items={["First item", "Second item", "Third item"]}
            style="bullet"
          />
        </Box>
        <Box flexDirection="column">
          <Text bold>Numbered:</Text>
          <List
            items={["Step one", "Step two", "Step three"]}
            style="numbered"
          />
        </Box>
        <Box flexDirection="column">
          <Text bold>Task List:</Text>
          <List
            items={[
              { text: "Build project", status: "completed" },
              { text: "Run tests", status: "running" },
              { text: "Deploy", status: "pending" },
            ]}
          />
        </Box>
      </Box>

      {/* Stats Line Section */}
      <SectionTitle title="STATS LINE" />
      <Box flexDirection="column" gap={1}>
        <Box>
          <Text dimColor>With labels: </Text>
          <StatsLine
            items={[
              { label: "model", value: "opus", color: "#FF9500" },
              { label: "ops", value: 12 },
              { label: "time", value: "45s" },
              { label: "tokens", value: "12.4K" },
            ]}
          />
        </Box>
        <Box>
          <Text dimColor>With icons:  </Text>
          <StatsLine
            items={[
              { icon: "⏱", value: "2m 34s" },
              { icon: "🔄", value: "3" },
              { icon: "⚡", value: "47" },
            ]}
            compact
          />
        </Box>
      </Box>

      {/* Badge Section */}
      <SectionTitle title="BADGES" />
      <Box gap={2}>
        <Badge text="NEW" color="green" />
        <Badge text="BETA" color="cyan" />
        <ModelBadge model="opus" />
        <ModelBadge model="sonnet" />
        <ModelBadge model="haiku" />
        <LabelBadge label="v2.0.0" color="cyan" />
      </Box>

      {/* Divider Section */}
      <SectionTitle title="DIVIDERS" />
      <Box flexDirection="column" gap={1}>
        <Line width={50} />
        <Divider width={50} style="dashed" />
        <Divider width={50} style="line" label="Section" labelAlign="center" />
        <SectionHeader title="Configuration" width={50} />
      </Box>

      {/* Table Section */}
      <SectionTitle title="TABLE" />
      <Box flexDirection="column" gap={1}>
        <Table
          columns={[
            { header: "Model", width: 10 },
            { header: "Ops", width: 8, align: "right" },
            { header: "Time", width: 10, align: "right" },
          ]}
          rows={[
            ["opus", 24, "1m 23s"],
            ["sonnet", 12, "45s"],
            ["haiku", 8, "12s"],
          ]}
          headerStyle="bold"
        />
      </Box>

      {/* TitleBox Section */}
      <SectionTitle title="TITLE BOX" />
      <Box flexDirection="column" gap={1}>
        <TitleBox
          title="Session Info"
          titleIcon="▶"
          titleColor="#FF9500"
          borderStyle="round"
          borderColor="#FF9500"
          padding={1}
        >
          <Text>Working on implementing the login feature...</Text>
          <Newline />
          <StatsLine
            items={[
              { label: "model", value: "opus", color: "#FF9500" },
              { label: "ops", value: 23 },
            ]}
          />
        </TitleBox>

        <TitleBox
          title="Completed"
          titleIcon="✓"
          titleColor="green"
          borderStyle="round"
          borderColor="green"
          padding={1}
          footer="Session saved"
          footerColor="gray"
        >
          <List
            items={[
              { text: "Setup project", status: "completed" },
              { text: "Implement auth", status: "completed" },
              { text: "Write tests", status: "completed" },
            ]}
          />
        </TitleBox>
      </Box>

      {/* Footer */}
      <Newline />
      <Box
        borderStyle="round"
        borderColor="#FF9500"
        paddingX={2}
        paddingY={1}
        justifyContent="center"
      >
        <Text dimColor>All components use deno-ink as the rendering library</Text>
      </Box>
    </Box>
  );
}

// Render the app
const instance = await render(<App />);

// Exit after rendering (since this is a static showcase)
setTimeout(() => {
  instance.unmount();
  Deno.exit(0);
}, 2000);
