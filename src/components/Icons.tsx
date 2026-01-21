/**
 * @module components/Icons
 *
 * Icon constants and components for terminal UI.
 * These icons render well in most terminal emulators.
 */

import { Box, Text } from "@ink/mod.ts";

// ============================================================================
// Status Icons
// ============================================================================
export const STATUS_ICONS = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
  question: "?",
  pending: "○",
  running: "◐",
  completed: "●",
  skipped: "⊘",
  paused: "⏸",
  stopped: "⏹",
  play: "▶",
  record: "⏺",
} as const;

// ============================================================================
// Progress Icons
// ============================================================================
export const PROGRESS_ICONS = {
  // Circles
  circleEmpty: "○",
  circleFilled: "●",
  circleHalf: "◐",
  circleDot: "⊙",
  circleDouble: "◎",

  // Blocks
  blockFull: "█",
  blockLight: "░",
  blockMedium: "▒",
  blockDark: "▓",
  blockLower: "▄",
  blockUpper: "▀",

  // Bars
  barEmpty: "─",
  barFilled: "━",

  // Braille (for smooth progress)
  braille: ["⠀", "⠁", "⠂", "⠃", "⠄", "⠅", "⠆", "⠇", "⡀", "⡁", "⡂", "⡃", "⡄", "⡅", "⡆", "⡇"],
} as const;

// ============================================================================
// Arrow Icons
// ============================================================================
export const ARROW_ICONS = {
  right: "→",
  left: "←",
  up: "↑",
  down: "↓",
  rightDouble: "»",
  leftDouble: "«",
  upDown: "↕",
  leftRight: "↔",
  triangleRight: "▶",
  triangleLeft: "◀",
  triangleUp: "▲",
  triangleDown: "▼",
  pointerRight: "›",
  pointerLeft: "‹",
  chevronRight: "❯",
  chevronLeft: "❮",
} as const;

// ============================================================================
// UI Icons
// ============================================================================
export const UI_ICONS = {
  // Bullets
  bullet: "•",
  bulletHollow: "◦",
  dash: "─",
  star: "★",
  starHollow: "☆",

  // Actions
  edit: "✎",
  delete: "🗑",
  save: "💾",
  copy: "📋",
  paste: "📄",
  search: "🔍",
  settings: "⚙",
  refresh: "🔄",
  sync: "⟳",
  link: "🔗",
  unlink: "⛓",

  // Communication
  mail: "✉",
  chat: "💬",
  bell: "🔔",
  bellOff: "🔕",

  // Files
  file: "📄",
  folder: "📁",
  folderOpen: "📂",
  archive: "📦",

  // Navigation
  home: "🏠",
  menu: "☰",
  close: "✕",
  expand: "+",
  collapse: "-",

  // Security
  lock: "🔒",
  unlock: "🔓",
  key: "🔑",
  shield: "🛡",

  // Misc
  heart: "❤",
  heartHollow: "♡",
  fire: "🔥",
  lightning: "⚡",
  sparkle: "✨",
  sun: "☀",
  moon: "🌙",
  cloud: "☁",
  rocket: "🚀",
  flag: "🚩",
  pin: "📌",
  bookmark: "🔖",
  tag: "🏷",
  clock: "🕐",
  calendar: "📅",
  chart: "📊",
  graph: "📈",
  target: "🎯",
  trophy: "🏆",
  gift: "🎁",
  tools: "🔧",
  wrench: "🔩",
  hammer: "🔨",
  paintbrush: "🖌",
  palette: "🎨",
} as const;

// ============================================================================
// Tech/Developer Icons
// ============================================================================
export const TECH_ICONS = {
  terminal: "💻",
  code: "⟨⟩",
  bug: "🐛",
  debug: "🔬",
  database: "🗄",
  server: "🖥",
  api: "⚙",
  git: "📦",
  branch: "⑂",
  merge: "⎇",
  commit: "◉",
  pull: "⬇",
  push: "⬆",
  docker: "🐳",
  npm: "📦",
  python: "🐍",
  rust: "🦀",
  go: "🐹",
  node: "⬢",
  react: "⚛",
  typescript: "📘",
  javascript: "📒",
} as const;

// ============================================================================
// Model/AI Icons
// ============================================================================
export const AI_ICONS = {
  brain: "🧠",
  robot: "🤖",
  magic: "✨",
  wand: "🪄",
  crystal: "🔮",
  thought: "💭",
  idea: "💡",
  spark: "⚡",
} as const;

// ============================================================================
// Weather Icons
// ============================================================================
export const WEATHER_ICONS = {
  sun: "☀",
  sunCloud: "⛅",
  cloud: "☁",
  rain: "🌧",
  snow: "❄",
  thunder: "⛈",
  wind: "💨",
  fog: "🌫",
  rainbow: "🌈",
  temperature: "🌡",
} as const;

// ============================================================================
// Spinner Frames
// ============================================================================
export const SPINNER_FRAMES = {
  dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  line: ["-", "\\", "|", "/"],
  circle: ["◐", "◓", "◑", "◒"],
  square: ["◰", "◳", "◲", "◱"],
  triangle: ["◢", "◣", "◤", "◥"],
  arrow: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
  bounce: ["⠁", "⠂", "⠄", "⠂"],
  pulse: ["█", "▓", "▒", "░", "▒", "▓"],
  clock: ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"],
  moon: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  earth: ["🌍", "🌎", "🌏"],
  dots2: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
} as const;

// ============================================================================
// Box Drawing
// ============================================================================
export const BOX_CHARS = {
  single: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    cross: "┼",
    teeRight: "├",
    teeLeft: "┤",
    teeDown: "┬",
    teeUp: "┴",
  },
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
  },
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
  },
  bold: {
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",
  },
} as const;

// ============================================================================
// Icon Component
// ============================================================================
export interface IconProps {
  name: string;
  color?: string;
  label?: string;
}

// Get icon by name from any category
export function getIcon(name: string): string {
  const allIcons: Record<string, string> = {
    ...STATUS_ICONS,
    ...ARROW_ICONS,
    ...UI_ICONS,
    ...TECH_ICONS,
    ...AI_ICONS,
  };
  return allIcons[name] ?? "?";
}

export function Icon({ name, color, label }: IconProps): React.ReactElement {
  const icon = getIcon(name);
  return (
    <Box>
      <Text color={color}>{icon}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
}

// Icon with status coloring
export function StatusIcon({
  status,
  label,
}: {
  status: keyof typeof STATUS_ICONS;
  label?: string;
}): React.ReactElement {
  const colors: Record<string, string> = {
    success: "green",
    error: "red",
    warning: "yellow",
    info: "blue",
    pending: "gray",
    running: "cyan",
    completed: "green",
    skipped: "gray",
  };

  return (
    <Box>
      <Text color={colors[status]}>{STATUS_ICONS[status]}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
}
