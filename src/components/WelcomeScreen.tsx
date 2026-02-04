/**
 * @module components/WelcomeScreen
 *
 * Beautiful animated welcome screen with context awareness.
 * Uses Ralph's actual color palette.
 */

import React, { useState } from 'react';
import {
  Box,
  Newline,
  render,
  Spinner,
  Text,
  useApp,
  useInput,
} from '../../packages/deno-ink/src/mod.ts';

// ============================================================================
// Theme Colors (from ralph-cli src/ui/colors.ts)
// ============================================================================

// Using 256-color codes that match the project
const colors = {
  // Brand colors
  primary: '#00FFFF', // Bright Cyan (ANSI 96)
  orange: '#FFAF00', // 256-color 214 - Bright orange
  amber: '#FF8700', // 256-color 208 - Amber/gold

  // Status colors
  success: '#00FF00', // Bright Green
  warning: '#FFFF00', // Bright Yellow
  error: '#FF5F5F', // Bright Red

  // Text colors
  muted: '#808080', // Gray (ANSI 90)
  dim: '#4E4E4E', // Darker gray
  white: '#FFFFFF', // White
};

// ============================================================================
// Mascot / Logo Options
// ============================================================================

// Option 1: Simple stylized "R" robot
const _RALPH_ROBOT_SIMPLE = `
  ╔═══════╗
  ║ ◉   ◉ ║
  ║   R   ║
  ║  ───  ║
  ╚═══════╝
`.trim();

// Option 2: Cute robot with antenna
const RALPH_ROBOT_V2 = `
     ┃
  ╔══╩══╗
  ║ ◉ ◉ ║
  ║  ▽  ║
  ╠═════╣
  ║ ▓▓▓ ║
  ╚══╦══╝
    ═╩═
`.trim();

// Option 3: Minimal block R
const _RALPH_BLOCK = `
 ██████╗
 ██╔══██╗
 ██████╔╝
 ██╔══██╗
 ██║  ██║
 ╚═╝  ╚═╝
`.trim();

// Option 4: Simple face in double border
const _RALPH_FACE = `
╔═══════════╗
║           ║
║   ◉   ◉   ║
║     ▼     ║
║   ╰───╯   ║
║           ║
╚═══════════╝
`.trim();

// Option 5: Pixel art style robot (cleaner)
const _RALPH_PIXEL = `
   ▄▄▄▄▄▄▄
  █ ◉   ◉ █
  █   ▽   █
  █ ╔═══╗ █
  █ ║ R ║ █
  █ ╚═══╝ █
   ▀▀▀▀▀▀▀
`.trim();

// Choose the mascot
const RALPH_MASCOT = RALPH_ROBOT_V2;

// ============================================================================
// Types
// ============================================================================

interface ProjectStatus {
  isRalphProject: boolean;
  hasSpecs: boolean;
  hasPlan: boolean;
  projectName?: string;
  lastActivity?: string;
}

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
}

interface WelcomeScreenProps {
  version: string;
  userName?: string;
  projectStatus: ProjectStatus;
  updateInfo: UpdateInfo;
  recentCommands?: string[];
}

// ============================================================================
// Sub-Components
// ============================================================================

function Shortcut(
  { keys, description }: { keys: string; description: string },
): React.ReactElement {
  return (
    <Box flexDirection='row' gap={1}>
      <Box
        borderStyle='double'
        borderColor={colors.dim}
        paddingX={1}
      >
        <Text color={colors.orange} bold>{keys}</Text>
      </Box>
      <Text color={colors.muted}>{description}</Text>
    </Box>
  );
}

function StatusBadge({
  status,
  text,
}: {
  status: 'ready' | 'warning' | 'info';
  text: string;
}): React.ReactElement {
  const statusColors = {
    ready: colors.success,
    warning: colors.warning,
    info: colors.primary,
  };
  const icons = {
    ready: '✓',
    warning: '!',
    info: 'i',
  };

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={statusColors[status]} bold>[{icons[status]}]</Text>
      <Text color={statusColors[status]}>{text}</Text>
    </Box>
  );
}

function WorkflowStep({
  name,
  done,
  current = false,
}: {
  name: string;
  done: boolean;
  current?: boolean;
}): React.ReactElement {
  const icon = done ? '●' : current ? '◐' : '○';
  const color = done ? colors.success : current ? colors.orange : colors.dim;

  return (
    <Box flexDirection='row' gap={1}>
      <Text color={color}>{icon}</Text>
      <Text color={done ? colors.muted : color}>{name}</Text>
    </Box>
  );
}

// ============================================================================
// Main Welcome Screen
// ============================================================================

export function WelcomeScreen({
  version,
  userName,
  projectStatus,
  updateInfo,
  recentCommands = [],
}: WelcomeScreenProps): React.ReactElement {
  const { exit } = useApp();
  const [showTips, setShowTips] = useState(true);

  // Keyboard shortcuts
  useInput((input, key) => {
    if (input === 'q' || key.escape) exit();
    if (input === 'i') {
      console.log('\nRunning: ralph init\n');
      exit();
    }
    if (input === 'w') {
      console.log('\nRunning: ralph work\n');
      exit();
    }
    if (input === '?') {
      setShowTips(!showTips);
    }
  });

  // Generate welcome message
  const greeting = userName ? `Welcome back, ${userName}!` : 'Welcome to Ralph!';

  // Context-aware tip
  const contextTip = !projectStatus.isRalphProject
    ? "Run 'ralph init' to set up this project"
    : !projectStatus.hasSpecs
    ? "Run 'ralph start' to create your first specs"
    : !projectStatus.hasPlan
    ? "Run 'ralph plan' to generate a plan"
    : "Ready! Run 'ralph work' to start building";

  return (
    <Box flexDirection='column' padding={1}>
      {/* Main Container with Double Border */}
      <Box
        borderStyle='double'
        borderColor={colors.orange}
        paddingX={2}
        paddingY={1}
        flexDirection='column'
      >
        {/* Header Row */}
        <Box flexDirection='row' justifyContent='space-between' marginBottom={1}>
          <Box flexDirection='row' gap={1}>
            <Text color={colors.orange} bold>Ralph</Text>
            <Text color={colors.muted}>v{version}</Text>
          </Box>
          {updateInfo.hasUpdate && (
            <Box flexDirection='row' gap={1}>
              <Text color={colors.warning}>⬆</Text>
              <Text color={colors.warning}>
                New version: v{updateInfo.latestVersion}
              </Text>
            </Box>
          )}
        </Box>

        {/* Content Row */}
        <Box flexDirection='row' gap={4}>
          {/* Left: Mascot & Status */}
          <Box flexDirection='column' alignItems='center' minWidth={20}>
            <Text color={colors.primary} bold>{greeting}</Text>
            <Newline />
            <Text color={colors.orange}>{RALPH_MASCOT}</Text>
            <Newline />

            {/* Project Status */}
            {projectStatus.isRalphProject
              ? <StatusBadge status='ready' text='Ralph Project' />
              : <StatusBadge status='warning' text='Not initialized' />}

            {projectStatus.projectName && (
              <Box marginTop={1}>
                <Text color={colors.muted}>
                  {projectStatus.projectName}
                </Text>
              </Box>
            )}
          </Box>

          {/* Right: Info Panels */}
          <Box flexDirection='column' flexGrow={1}>
            {/* Tip Box */}
            <Box
              borderStyle='single'
              borderColor={colors.primary}
              paddingX={2}
              paddingY={1}
              marginBottom={1}
            >
              <Box flexDirection='column'>
                <Text bold color={colors.primary}>💡 Tip</Text>
                <Text color={colors.white}>{contextTip}</Text>
              </Box>
            </Box>

            {/* Workflow Progress */}
            <Box
              borderStyle='single'
              borderColor={colors.dim}
              paddingX={2}
              paddingY={1}
              marginBottom={1}
            >
              <Box flexDirection='column'>
                <Text bold color={colors.orange}>Workflow</Text>
                <Box marginTop={1} flexDirection='row' gap={2}>
                  <WorkflowStep name='init' done={projectStatus.isRalphProject} />
                  <Text color={colors.dim}>→</Text>
                  <WorkflowStep name='specs' done={projectStatus.hasSpecs} />
                  <Text color={colors.dim}>→</Text>
                  <WorkflowStep name='plan' done={projectStatus.hasPlan} />
                  <Text color={colors.dim}>→</Text>
                  <WorkflowStep name='work' done={false} />
                </Box>
              </Box>
            </Box>

            {/* Recent Activity */}
            <Box
              borderStyle='single'
              borderColor={colors.dim}
              paddingX={2}
              paddingY={1}
            >
              <Box flexDirection='column'>
                <Text bold color={colors.orange}>Recent Activity</Text>
                <Box marginTop={1} flexDirection='column'>
                  {recentCommands.length > 0
                    ? (
                      recentCommands.slice(0, 3).map((cmd, i) => (
                        <Text key={i} color={colors.muted}>• {cmd}</Text>
                      ))
                    )
                    : <Text color={colors.dim}>No recent activity</Text>}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Keyboard Shortcuts */}
      {showTips && (
        <Box marginTop={1} flexDirection='column'>
          <Text bold color={colors.muted}>Shortcuts</Text>
          <Box flexDirection='row' gap={3} marginTop={1}>
            <Shortcut keys='i' description='init' />
            <Shortcut keys='s' description='start' />
            <Shortcut keys='p' description='plan' />
            <Shortcut keys='w' description='work' />
            <Shortcut keys='?' description='tips' />
            <Shortcut keys='q' description='quit' />
          </Box>
        </Box>
      )}

      {/* Command Prompt */}
      <Box marginTop={1} flexDirection='row' gap={1}>
        <Text color={colors.muted}>~/</Text>
        <Text color={colors.orange} bold>ralph</Text>
        <Text color={colors.muted}>›</Text>
        <Spinner type='dots' />
        <Text color={colors.dim}>Ready...</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// Utility: Detect Project Status
// ============================================================================

export async function detectProjectStatus(): Promise<ProjectStatus> {
  const status: ProjectStatus = {
    isRalphProject: false,
    hasSpecs: false,
    hasPlan: false,
  };

  try {
    // Check for .ralph directory or ralph.config.ts
    try {
      await Deno.stat('.ralph');
      status.isRalphProject = true;
    } catch {
      try {
        await Deno.stat('ralph.config.ts');
        status.isRalphProject = true;
      } catch {
        // Not a ralph project
      }
    }

    // Check for specs
    if (status.isRalphProject) {
      try {
        const specs = await Deno.readDir('.ralph/specs');
        for await (const _ of specs) {
          status.hasSpecs = true;
          break;
        }
      } catch {
        // No specs directory
      }

      // Check for plan
      try {
        await Deno.stat('.ralph/plan.md');
        status.hasPlan = true;
      } catch {
        // No plan
      }
    }

    // Get project name from package.json or deno.json
    try {
      const denoJson = JSON.parse(await Deno.readTextFile('deno.json'));
      status.projectName = denoJson.name;
    } catch {
      try {
        const packageJson = JSON.parse(await Deno.readTextFile('package.json'));
        status.projectName = packageJson.name;
      } catch {
        // No project name found
      }
    }
  } catch {
    // Error detecting status
  }

  return status;
}

// ============================================================================
// Utility: Check for Updates
// ============================================================================

export function checkForUpdates(currentVersion: string): UpdateInfo {
  const info: UpdateInfo = {
    hasUpdate: false,
    currentVersion,
  };

  // In a real implementation, this would fetch from a registry
  info.latestVersion = currentVersion;
  info.hasUpdate = false;

  return info;
}

// ============================================================================
// Render Function
// ============================================================================

export async function showWelcome(version: string): Promise<void> {
  const projectStatus = await detectProjectStatus();
  const updateInfo = await checkForUpdates(version);

  let userName: string | undefined;
  try {
    const process = new Deno.Command('git', {
      args: ['config', 'user.name'],
      stdout: 'piped',
    });
    const output = await process.output();
    userName = new TextDecoder().decode(output.stdout).trim();
  } catch {
    userName = Deno.env.get('USER');
  }

  const { waitUntilExit } = await render(
    <WelcomeScreen
      version={version}
      userName={userName}
      projectStatus={projectStatus}
      updateInfo={updateInfo}
      recentCommands={[]}
    />,
  );

  await waitUntilExit();
}
