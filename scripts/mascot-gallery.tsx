#!/usr/bin/env -S deno run -A
/**
 * Animated Mascot Gallery - Coding-themed mascots for Ralph CLI
 * Run with: deno run -A scripts/mascot-gallery.tsx
 */

import React, { useState, useEffect } from "react";
import { render, Box, Text, Newline, useInput, useApp } from "../packages/deno-ink/src/mod.ts";

// ============================================================================
// Colors
// ============================================================================

const colors = {
  orange: "#FFAF00",
  cyan: "#00FFFF",
  muted: "#808080",
  dim: "#4E4E4E",
  green: "#00FF00",
  yellow: "#FFFF00",
  magenta: "#FF00FF",
};

// ============================================================================
// ANIMATED MASCOT COLLECTION
// ============================================================================

interface AnimatedMascot {
  name: string;
  description: string;
  frames: string[];      // Animation frames
  frameDelay: number;    // ms between frames
  states?: {             // Optional expression states
    thinking?: string[];
    success?: string[];
    error?: string[];
  };
}

const mascots: AnimatedMascot[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CODING THEMED
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Cursor Bot",
    description: "A friendly bot with a blinking cursor eye",
    frameDelay: 500,
    frames: [
      `
  ┌───────┐
  │ █   o │
  │  ───  │
  │ ╭───╮ │
  └─┤   ├─┘
    └───┘
`.trim(),
      `
  ┌───────┐
  │ _   o │
  │  ───  │
  │ ╭───╮ │
  └─┤   ├─┘
    └───┘
`.trim(),
    ],
    states: {
      thinking: [
        `
  ┌───────┐
  │ ◐   ◐ │
  │  ~~~  │
  │ ╭───╮ │
  └─┤   ├─┘
    └───┘
`.trim(),
      ],
      success: [
        `
  ┌───────┐
  │ ^   ^ │
  │  ◡◡◡  │
  │ ╭───╮ │
  └─┤   ├─┘
    └───┘
`.trim(),
      ],
      error: [
        `
  ┌───────┐
  │ x   x │
  │  ───  │
  │ ╭───╮ │
  └─┤   ├─┘
    └───┘
`.trim(),
      ],
    },
  },

  {
    name: "Bracket Buddy",
    description: "Made entirely of code brackets",
    frameDelay: 300,
    frames: [
      `
   {   }
  {{ o o }}
  {  ___  }
   {     }
    {   }
     { }
`.trim(),
      `
   {   }
  {{ - - }}
  {  ___  }
   {     }
    {   }
     { }
`.trim(),
      `
   {   }
  {{ o o }}
  {  ___  }
   {     }
    {   }
     { }
`.trim(),
      `
   {   }
  {{ . . }}
  {  ___  }
   {     }
    {   }
     { }
`.trim(),
    ],
    states: {
      thinking: [
        `
   { ? }
  {{ o o }}
  {  ~~~  }
   {     }
    {   }
     { }
`.trim(),
      ],
      success: [
        `
   { ✓ }
  {{ ^ ^ }}
  {  ◡◡◡  }
   {     }
    {   }
     { }
`.trim(),
      ],
    },
  },

  {
    name: "Terminal Spirit",
    description: "The ghost in your shell",
    frameDelay: 400,
    frames: [
      `
    ▄███▄
   █ $ $ █
   █  >  █
   █ === █
    █████
   ░░ ░░
`.trim(),
      `
    ▄███▄
   █ $ $ █
   █  >  █
   █ === █
    █████
    ░░░░
`.trim(),
      `
    ▄███▄
   █ $ $ █
   █  >  █
   █ === █
    █████
   ░░  ░░
`.trim(),
    ],
    states: {
      thinking: [
        `
    ▄███▄
   █ ? ? █
   █  ~  █
   █ ... █
    █████
   ░░ ░░
`.trim(),
      ],
      success: [
        `
    ▄███▄
   █ ✓ ✓ █
   █  ◡  █
   █ === █
    █████
   ░░ ░░
`.trim(),
      ],
    },
  },

  {
    name: "Pixel Helper",
    description: "8-bit coding companion",
    frameDelay: 600,
    frames: [
      `
  ▄▄▄▄▄▄▄
  █ ◉ ◉ █
  █  ▽  █
  █▄▄▄▄▄█
   █ █ █
   ▀   ▀
`.trim(),
      `
  ▄▄▄▄▄▄▄
  █ ◉ ◉ █
  █  ▽  █
  █▄▄▄▄▄█
   █ █ █
    ▀ ▀
`.trim(),
    ],
    states: {
      thinking: [
        `
  ▄▄▄▄▄▄▄
  █ ◑ ◑ █
  █  ~  █
  █▄▄▄▄▄█
   █ █ █
   ▀   ▀
`.trim(),
      ],
      success: [
        `
  ▄▄▄▄▄▄▄
  █ ★ ★ █
  █  ◡  █
  █▄▄▄▄▄█
   █ █ █
   ▀   ▀
`.trim(),
      ],
      error: [
        `
  ▄▄▄▄▄▄▄
  █ ✕ ✕ █
  █  ▵  █
  █▄▄▄▄▄█
   █ █ █
   ▀   ▀
`.trim(),
      ],
    },
  },

  {
    name: "Code Ninja",
    description: "Stealthy coding warrior",
    frameDelay: 400,
    frames: [
      `
    ╱▔▔▔╲
   ╱ ●  ● ╲
   ▏▔▔▔▔▔▔▕
    ╲____╱
   ╱│    │╲
     │  │
`.trim(),
      `
    ╱▔▔▔╲
   ╱ ─  ─ ╲
   ▏▔▔▔▔▔▔▕
    ╲____╱
   ╱│    │╲
     │  │
`.trim(),
    ],
    states: {
      thinking: [
        `
    ╱▔▔▔╲
   ╱ ◐  ◐ ╲
   ▏▔▔▔▔▔▔▕
    ╲~~~~╱
  ╱ │    │ ╲
     │  │
`.trim(),
      ],
      success: [
        `
    ╱▔▔▔╲
   ╱ ^  ^ ╲
   ▏▔▔▔▔▔▔▕
    ╲◡◡◡◡╱
   ╱│    │╲
     │  │
`.trim(),
      ],
    },
  },

  {
    name: "Lambda",
    description: "Functional programming spirit",
    frameDelay: 350,
    frames: [
      `
    ╱╲
   ╱  ╲
  ╱ ◉◉ ╲
 ╱  ▽▽  ╲
 ╲      ╱
  λ    λ
`.trim(),
      `
    ╱╲
   ╱  ╲
  ╱ ◉◉ ╲
 ╱  ▽▽  ╲
 ╲      ╱
   λ  λ
`.trim(),
      `
    ╱╲
   ╱  ╲
  ╱ ◉◉ ╲
 ╱  ▽▽  ╲
 ╲      ╱
  λ    λ
`.trim(),
      `
    ╱╲
   ╱  ╲
  ╱ ── ╲
 ╱  ▽▽  ╲
 ╲      ╱
   λλλλ
`.trim(),
    ],
    states: {
      thinking: [
        `
    ╱╲ ?
   ╱  ╲
  ╱ ◑◑ ╲
 ╱  ~~  ╲
 ╲      ╱
  λ    λ
`.trim(),
      ],
    },
  },

  {
    name: "Git Ghost",
    description: "Version control specter",
    frameDelay: 500,
    frames: [
      `
   ╭━━━╮
   ┃ ◉◉ ┃
   ┃ ╭╮ ┃
   ┃╰──╯┃
   ╰┬┬┬┬╯
`.trim(),
      `
   ╭━━━╮
   ┃ ◉◉ ┃
   ┃ ╭╮ ┃
   ┃╰──╯┃
   ╰─┬┬─╯
`.trim(),
      `
   ╭━━━╮
   ┃ ── ┃
   ┃ ╭╮ ┃
   ┃╰──╯┃
   ╰┬──┬╯
`.trim(),
    ],
    states: {
      thinking: [
        `
   ╭━━━╮
   ┃ ◐◐ ┃
   ┃ ~~ ┃
   ┃╰──╯┃
   ╰┬┬┬┬╯
`.trim(),
      ],
      success: [
        `
   ╭━━━╮
   ┃ ✓✓ ┃
   ┃ ◡◡ ┃
   ┃╰──╯┃
   ╰┬┬┬┬╯
`.trim(),
      ],
      error: [
        `
   ╭━━━╮
   ┃ ✕✕ ┃
   ┃ >< ┃
   ┃╰──╯┃
   ╰┬┬┬┬╯
`.trim(),
      ],
    },
  },

  {
    name: "Byte Bot",
    description: "Tiny but mighty",
    frameDelay: 250,
    frames: [
      `
  ┌─────┐
  │01010│
  │ ◉ ◉ │
  │  ◡  │
  └──┬──┘
     █
`.trim(),
      `
  ┌─────┐
  │10101│
  │ ◉ ◉ │
  │  ◡  │
  └──┬──┘
     █
`.trim(),
      `
  ┌─────┐
  │01010│
  │ ◉ ◉ │
  │  ◡  │
  └──┬──┘
     █
`.trim(),
      `
  ┌─────┐
  │11001│
  │ ─ ─ │
  │  ◡  │
  └──┬──┘
     █
`.trim(),
    ],
    states: {
      thinking: [
        `
  ┌─────┐
  │?????│
  │ ◐ ◐ │
  │  ~  │
  └──┬──┘
     █
`.trim(),
      ],
      success: [
        `
  ┌─────┐
  │11111│
  │ ★ ★ │
  │  ◡  │
  └──┬──┘
     █
`.trim(),
      ],
    },
  },

  {
    name: "API Alien",
    description: "From the cloud dimension",
    frameDelay: 400,
    frames: [
      `
   ╭──∿──╮
  ╱ ◉    ◉ ╲
 │    <>    │
  ╲  ════  ╱
   ╰┬┬──┬┬╯
`.trim(),
      `
   ╭──∿──╮
  ╱ ◉    ◉ ╲
 │    ><    │
  ╲  ════  ╱
   ╰┬┬──┬┬╯
`.trim(),
      `
   ╭──~──╮
  ╱ ◉    ◉ ╲
 │    <>    │
  ╲  ════  ╱
   ╰┬┬──┬┬╯
`.trim(),
    ],
    states: {
      thinking: [
        `
   ╭──?──╮
  ╱ ◑    ◑ ╲
 │    ~~    │
  ╲  ....  ╱
   ╰┬┬──┬┬╯
`.trim(),
      ],
      success: [
        `
   ╭──✓──╮
  ╱ ★    ★ ╲
 │   ◡◡◡   │
  ╲  ════  ╱
   ╰┬┬──┬┬╯
`.trim(),
      ],
    },
  },

  {
    name: "Debug Duck",
    description: "Rubber duck debugging companion",
    frameDelay: 600,
    frames: [
      `
     __
   >(o )___
    ( ._>  /
     \`---'
`.trim(),
      `
     __
   >(- )___
    ( ._>  /
     \`---'
`.trim(),
    ],
    states: {
      thinking: [
        `
    ?__
   >(o )___
    ( ._>  /
     \`---'
`.trim(),
      ],
      success: [
        `
    !__
   >(^ )___
    ( ◡>  /
     \`---'
`.trim(),
      ],
    },
  },

  {
    name: "Stack Overflow",
    description: "Layers of knowledge",
    frameDelay: 300,
    frames: [
      `
  ╔═══════╗
  ║ ◉   ◉ ║
  ╠═══════╣
  ║  ▽▽▽  ║
  ╠═══════╣
  ║ ═══   ║
  ╚═══════╝
`.trim(),
      `
  ╔═══════╗
  ║ ◉   ◉ ║
  ╠═══════╣
  ║  ▽▽▽  ║
  ╠═══════╣
  ║  ═══  ║
  ╚═══════╝
`.trim(),
      `
  ╔═══════╗
  ║ ◉   ◉ ║
  ╠═══════╣
  ║  ▽▽▽  ║
  ╠═══════╣
  ║   ═══ ║
  ╚═══════╝
`.trim(),
      `
  ╔═══════╗
  ║ ─   ─ ║
  ╠═══════╣
  ║  ▽▽▽  ║
  ╠═══════╣
  ║  ═══  ║
  ╚═══════╝
`.trim(),
    ],
    states: {
      thinking: [
        `
  ╔═══════╗
  ║ ?   ? ║
  ╠═══════╣
  ║  ~~~  ║
  ╠═══════╣
  ║ ..... ║
  ╚═══════╝
`.trim(),
      ],
    },
  },

  {
    name: "Regex Rex",
    description: "Pattern matching dinosaur",
    frameDelay: 500,
    frames: [
      `
      /.*?/
     / ◉ ◉ \\
    |  ▽▽▽  |
     \\  ══ /
      ╲   ╱
   [a-z]+
`.trim(),
      `
      /.*?/
     / ─ ─ \\
    |  ▽▽▽  |
     \\  ══ /
      ╲   ╱
   [A-Z]+
`.trim(),
      `
      /.*?/
     / ◉ ◉ \\
    |  ▽▽▽  |
     \\  ══ /
      ╲   ╱
   \\d{2,}
`.trim(),
    ],
    states: {
      thinking: [
        `
      /?+/
     / ◐ ◐ \\
    |  ~~~  |
     \\  .. /
      ╲   ╱
   [???]
`.trim(),
      ],
      success: [
        `
      /✓/
     / ^ ^ \\
    |  ◡◡◡  |
     \\  ✓✓ /
      ╲   ╱
   match!
`.trim(),
      ],
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

// Preserve whitespace for ASCII art
const preserveWhitespace = (line: string): string => {
  return line.replace(/ /g, '\u00A0');
};

// Smart trim that preserves first line indentation
const trimArt = (art: string): string => {
  const lines = art.split('\n');
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start++;
  let end = lines.length - 1;
  while (end >= 0 && lines[end].trim() === '') end--;
  return lines.slice(start, end + 1).join('\n');
};

// ============================================================================
// Gallery Component
// ============================================================================

function MascotGallery() {
  const { exit } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [showState, setShowState] = useState<"normal" | "thinking" | "success" | "error">("normal");

  const currentMascot = mascots[currentIndex]!;

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (showState === "normal") {
        setFrameIndex((i) => (i + 1) % currentMascot.frames.length);
      }
    }, currentMascot.frameDelay);
    return () => clearInterval(interval);
  }, [currentIndex, currentMascot.frameDelay, currentMascot.frames.length, showState]);

  // Reset frame when changing mascot
  useEffect(() => {
    setFrameIndex(0);
    setShowState("normal");
  }, [currentIndex]);

  useInput((input, key) => {
    if (input === "q" || key.escape) exit();

    // Navigate mascots
    if (key.leftArrow || input === "h") {
      setCurrentIndex((i) => (i > 0 ? i - 1 : mascots.length - 1));
    }
    if (key.rightArrow || input === "l") {
      setCurrentIndex((i) => (i < mascots.length - 1 ? i + 1 : 0));
    }

    // Show states
    if (input === "t" && currentMascot.states?.thinking) {
      setShowState(showState === "thinking" ? "normal" : "thinking");
    }
    if (input === "s" && currentMascot.states?.success) {
      setShowState(showState === "success" ? "normal" : "success");
    }
    if (input === "e" && currentMascot.states?.error) {
      setShowState(showState === "error" ? "normal" : "error");
    }
    if (input === "n") {
      setShowState("normal");
    }
  });

  // Get current frame to display
  const getCurrentArt = (): string => {
    if (showState === "thinking" && currentMascot.states?.thinking) {
      return currentMascot.states.thinking[0]!;
    }
    if (showState === "success" && currentMascot.states?.success) {
      return currentMascot.states.success[0]!;
    }
    if (showState === "error" && currentMascot.states?.error) {
      return currentMascot.states.error[0]!;
    }
    return currentMascot.frames[frameIndex]!;
  };

  const currentArt = trimArt(getCurrentArt());

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        borderStyle="double"
        borderColor={colors.orange}
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text bold color={colors.orange}>
          Ralph Animated Mascots
        </Text>
        <Text color={colors.muted}>
          {" "}- Coding-themed characters with animation
        </Text>
      </Box>

      {/* Main Content */}
      <Box flexDirection="row" gap={2}>
        {/* Mascot List */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={colors.dim}
          paddingX={2}
          paddingY={1}
          minWidth={22}
        >
          <Text bold color={colors.cyan}>
            Mascots ({mascots.length})
          </Text>
          <Newline />
          {mascots.map((mascot, i) => (
            <Box key={mascot.name} flexDirection="row" gap={1}>
              <Text color={currentIndex === i ? colors.orange : colors.dim}>
                {currentIndex === i ? "▶" : " "}
              </Text>
              <Text color={currentIndex === i ? colors.orange : colors.muted}>
                {mascot.name}
              </Text>
            </Box>
          ))}
        </Box>

        {/* Preview */}
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor={colors.cyan}
          paddingX={4}
          paddingY={2}
          minWidth={30}
        >
          <Box justifyContent="center">
            <Text bold color={colors.orange}>
              {currentMascot.name}
            </Text>
          </Box>
          <Box justifyContent="center">
            <Text color={colors.dim} italic>{currentMascot.description}</Text>
          </Box>
          <Newline />
          <Box flexDirection="column">
            {currentArt.split('\n').map((line, i) => (
              <Text key={i} color={
                showState === "success" ? colors.green :
                showState === "error" ? "#FF5F5F" :
                showState === "thinking" ? colors.yellow :
                colors.orange
              }>{preserveWhitespace(line) || ' '}</Text>
            ))}
          </Box>
          <Newline />
          <Box justifyContent="center">
            <Text color={colors.muted}>
              {currentIndex + 1} / {mascots.length}
            </Text>
            {showState !== "normal" && (
              <Text color={colors.yellow}> [{showState}]</Text>
            )}
          </Box>
        </Box>

        {/* States Panel */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={colors.dim}
          paddingX={2}
          paddingY={1}
          minWidth={20}
        >
          <Text bold color={colors.cyan}>
            States
          </Text>
          <Newline />
          <Text color={showState === "normal" ? colors.green : colors.muted}>
            [n] Normal {showState === "normal" ? "●" : "○"}
          </Text>
          <Text color={currentMascot.states?.thinking
            ? (showState === "thinking" ? colors.yellow : colors.muted)
            : colors.dim}>
            [t] Thinking {currentMascot.states?.thinking ? (showState === "thinking" ? "●" : "○") : "—"}
          </Text>
          <Text color={currentMascot.states?.success
            ? (showState === "success" ? colors.green : colors.muted)
            : colors.dim}>
            [s] Success {currentMascot.states?.success ? (showState === "success" ? "●" : "○") : "—"}
          </Text>
          <Text color={currentMascot.states?.error
            ? (showState === "error" ? "#FF5F5F" : colors.muted)
            : colors.dim}>
            [e] Error {currentMascot.states?.error ? (showState === "error" ? "●" : "○") : "—"}
          </Text>
          <Newline />
          <Text bold color={colors.cyan}>
            Info
          </Text>
          <Newline />
          <Text color={colors.muted}>
            Frames: {currentMascot.frames.length}
          </Text>
          <Text color={colors.muted}>
            Speed: {currentMascot.frameDelay}ms
          </Text>
        </Box>
      </Box>

      {/* Controls */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color={colors.muted}>
          Controls
        </Text>
        <Box flexDirection="row" gap={4} marginTop={1}>
          <Text color={colors.muted}>
            <Text color={colors.orange}>←/→</Text> Browse
          </Text>
          <Text color={colors.muted}>
            <Text color={colors.orange}>t/s/e</Text> Toggle states
          </Text>
          <Text color={colors.muted}>
            <Text color={colors.orange}>n</Text> Normal
          </Text>
          <Text color={colors.muted}>
            <Text color={colors.orange}>q</Text> Quit
          </Text>
        </Box>
      </Box>

      {/* Code Preview */}
      <Box
        marginTop={1}
        borderStyle="single"
        borderColor={colors.dim}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="column">
          <Text bold color={colors.cyan}>
            Animation frames: {currentMascot.frames.length}
          </Text>
          <Text color={colors.muted}>
            This mascot animates by cycling through {currentMascot.frames.length} frames every {currentMascot.frameDelay}ms
          </Text>
          {currentMascot.states && (
            <Text color={colors.muted}>
              + Has {Object.keys(currentMascot.states).length} expression state(s): {Object.keys(currentMascot.states).join(", ")}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ============================================================================
// Main
// ============================================================================

const { waitUntilExit } = await render(<MascotGallery />, { fullScreen: true });
await waitUntilExit();
