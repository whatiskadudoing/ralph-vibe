#!/usr/bin/env -S deno run -A
/**
 * Demo script to showcase the new UI screens.
 * Run with: deno run -A scripts/demo-screens.tsx [welcome|help|version|compact]
 */

import React from "react";
import { render, Box, Text, Newline, useInput, useApp } from "../packages/deno-ink/src/mod.ts";
import { HelpScreen } from "../src/components/HelpScreen.tsx";
import { VersionScreen, CompactVersion } from "../src/components/VersionScreen.tsx";
import {
  WelcomeScreen,
  detectProjectStatus,
  checkForUpdates,
} from "../src/components/WelcomeScreen.tsx";

const VERSION = "0.5.0-beta.20";

// ============================================================================
// Colors
// ============================================================================

const colors = {
  brand: "#00D9FF",
  accent: "#FFAA00",
  muted: "#6C7086",
  dim: "#45475A",
};

// ============================================================================
// Interactive Demo Menu
// ============================================================================

function DemoSelector() {
  const [selected, setSelected] = React.useState<
    "menu" | "welcome" | "help" | "version" | "compact"
  >("menu");
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape || input === "q") {
      if (selected === "menu") {
        exit();
      } else {
        setSelected("menu");
      }
    }
    if (selected === "menu") {
      if (input === "1" || input === "w") setSelected("welcome");
      if (input === "2" || input === "h") setSelected("help");
      if (input === "3" || input === "v") setSelected("version");
      if (input === "4" || input === "c") setSelected("compact");
    }
  });

  if (selected === "welcome") {
    return (
      <Box flexDirection="column">
        <WelcomeScreenWrapper />
        <Box marginTop={1} paddingX={1}>
          <Text dimColor>Press ESC to go back to menu</Text>
        </Box>
      </Box>
    );
  }

  if (selected === "help") {
    return (
      <Box flexDirection="column">
        <HelpScreen version={VERSION} />
        <Box marginTop={1} paddingX={1}>
          <Text dimColor>Press ESC to go back to menu</Text>
        </Box>
      </Box>
    );
  }

  if (selected === "version") {
    return (
      <Box flexDirection="column">
        <VersionScreen version={VERSION} />
        <Box marginTop={1} paddingX={1}>
          <Text dimColor>Press ESC to go back to menu</Text>
        </Box>
      </Box>
    );
  }

  if (selected === "compact") {
    return (
      <Box flexDirection="column">
        <CompactVersion version={VERSION} />
        <Box marginTop={1} paddingX={1}>
          <Text dimColor>Press ESC to go back to menu</Text>
        </Box>
      </Box>
    );
  }

  // Menu
  return (
    <Box flexDirection="column" padding={2}>
      <Box
        borderStyle="round"
        borderColor={colors.brand}
        paddingX={3}
        paddingY={1}
        flexDirection="column"
      >
        <Text bold color={colors.brand}>
          Ralph UI Components Demo
        </Text>
        <Newline />
        <Text color={colors.muted}>Select a screen to preview:</Text>
        <Newline />
        <Box flexDirection="column" gap={1} marginTop={1}>
          <Box flexDirection="row" gap={2}>
            <Text color={colors.accent} bold>
              [1]
            </Text>
            <Text>Welcome Screen</Text>
            <Text dimColor>(default view)</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Text color={colors.accent} bold>
              [2]
            </Text>
            <Text>Help Screen</Text>
            <Text dimColor>(--help)</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Text color={colors.accent} bold>
              [3]
            </Text>
            <Text>Version Screen</Text>
            <Text dimColor>(--version full)</Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Text color={colors.accent} bold>
              [4]
            </Text>
            <Text>Compact Version</Text>
            <Text dimColor>(--version)</Text>
          </Box>
        </Box>
        <Newline />
        <Text dimColor>Press 'q' or ESC to quit</Text>
      </Box>
    </Box>
  );
}

// Wrapper to handle async project detection
function WelcomeScreenWrapper() {
  const [projectStatus, setProjectStatus] = React.useState({
    isRalphProject: false,
    hasSpecs: false,
    hasPlan: false,
    projectName: "ralph-cli",
  });
  const [updateInfo, setUpdateInfo] = React.useState({
    hasUpdate: true,
    currentVersion: VERSION,
    latestVersion: "0.6.0",
  });
  const [userName, setUserName] = React.useState<string | undefined>();

  React.useEffect(() => {
    // Detect project status
    detectProjectStatus().then(setProjectStatus);

    // Get username
    const getUser = async () => {
      try {
        const process = new Deno.Command("git", {
          args: ["config", "user.name"],
          stdout: "piped",
        });
        const output = await process.output();
        setUserName(new TextDecoder().decode(output.stdout).trim());
      } catch {
        setUserName(Deno.env.get("USER"));
      }
    };
    getUser();
  }, []);

  return (
    <WelcomeScreen
      version={VERSION}
      userName={userName}
      projectStatus={projectStatus}
      updateInfo={updateInfo}
      recentCommands={[
        "ralph work - 2 hours ago",
        "ralph plan - yesterday",
        "ralph init - 3 days ago",
      ]}
    />
  );
}

// ============================================================================
// Direct Mode (for command line args)
// ============================================================================

const arg = Deno.args[0];

if (arg === "welcome") {
  const projectStatus = await detectProjectStatus();
  const updateInfo = await checkForUpdates(VERSION);

  let userName: string | undefined;
  try {
    const process = new Deno.Command("git", {
      args: ["config", "user.name"],
      stdout: "piped",
    });
    const output = await process.output();
    userName = new TextDecoder().decode(output.stdout).trim();
  } catch {
    userName = Deno.env.get("USER");
  }

  const { waitUntilExit } = await render(
    <WelcomeScreen
      version={VERSION}
      userName={userName}
      projectStatus={projectStatus}
      updateInfo={{ ...updateInfo, hasUpdate: true, latestVersion: "0.6.0" }}
      recentCommands={[
        "ralph work - 2 hours ago",
        "ralph plan - yesterday",
      ]}
    />
  );
  await waitUntilExit();
} else if (arg === "help") {
  const { waitUntilExit } = await render(<HelpScreen version={VERSION} />);
  await waitUntilExit();
} else if (arg === "version") {
  const { waitUntilExit } = await render(<VersionScreen version={VERSION} />);
  await waitUntilExit();
} else if (arg === "compact") {
  const { waitUntilExit } = await render(<CompactVersion version={VERSION} />);
  await waitUntilExit();
} else {
  // Interactive demo
  const { waitUntilExit } = await render(<DemoSelector />);
  await waitUntilExit();
}
