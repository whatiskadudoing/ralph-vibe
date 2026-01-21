/**
 * @module components
 *
 * React-based UI components using deno-ink.
 *
 * These components provide reusable UI primitives for building
 * terminal user interfaces in ralph-cli.
 *
 * @example
 * ```tsx
 * import { render, Box, Text } from "@ink/mod.ts";
 * import { ProgressBar, StatusIndicator, List } from "@components/mod.ts";
 *
 * function App() {
 *   return (
 *     <Box flexDirection="column">
 *       <ProgressBar percent={42} color="cyan" />
 *       <StatusIndicator type="success" text="Build completed" />
 *       <List items={["Item 1", "Item 2"]} style="bullet" />
 *     </Box>
 *   );
 * }
 *
 * render(<App />);
 * ```
 */

// Re-export deno-ink primitives for convenience
export { render, Box, Text, Spinner, Newline, Spacer } from "@ink/mod.ts";
export type { BoxProps, TextProps, SpinnerProps, Styles } from "@ink/mod.ts";

// Progress Bar
export { ProgressBar, type ProgressBarProps } from "./ProgressBar.tsx";

// Status Indicator
export {
  StatusIndicator,
  StatusSuccess,
  StatusError,
  StatusWarning,
  StatusInfo,
  StatusPending,
  StatusRunning,
  type StatusIndicatorProps,
  type StatusType,
} from "./StatusIndicator.tsx";

// List
export {
  List,
  BulletList,
  NumberedList,
  ArrowList,
  TaskList,
  type ListProps,
  type ListItem,
  type ListStyle,
} from "./List.tsx";

// Stats Line
export {
  StatsLine,
  Stat,
  IconStat,
  type StatsLineProps,
  type StatItem,
} from "./StatsLine.tsx";

// Badge
export {
  Badge,
  ModelBadge,
  StatusBadge,
  LabelBadge,
  type BadgeProps,
} from "./Badge.tsx";

// Divider
export {
  Divider,
  Line,
  SectionHeader,
  type DividerProps,
  type DividerStyle,
} from "./Divider.tsx";

// Table
export {
  Table,
  KeyValueTable,
  type TableProps,
  type ColumnConfig,
  type ColumnAlign,
  type HeaderStyle,
} from "./Table.tsx";

// Title Box
export {
  TitleBox,
  BorderedBox,
  type TitleBoxProps,
  type BorderStyle,
} from "./TitleBox.tsx";

// Alert/Banner
export {
  Alert,
  InfoAlert,
  SuccessAlert,
  WarningAlert,
  ErrorAlert,
  TipAlert,
  Banner,
  type AlertProps,
  type AlertType,
  type BannerProps,
} from "./Alert.tsx";

// Card
export {
  Card,
  CompactCard,
  FeatureCard,
  StatCard,
  InfoCard,
  type CardProps,
  type FeatureCardProps,
  type StatCardProps,
  type InfoCardProps,
} from "./Card.tsx";

// Keyboard
export {
  Key,
  KeyCombo,
  Shortcut,
  ShortcutList,
  ShortcutBar,
  HelpFooter,
  type KeyProps,
  type KeyComboProps,
  type ShortcutProps,
  type ShortcutListProps,
  type ShortcutBarProps,
} from "./Keyboard.tsx";

// Header/Footer/Layout
export {
  Header,
  AppHeader,
  Section,
  Footer,
  StatusBar,
  Breadcrumb,
  type HeaderProps,
  type AppHeaderProps,
  type SectionProps,
  type FooterProps,
  type StatusBarProps,
  type BreadcrumbProps,
} from "./Header.tsx";

// Tree
export {
  Tree,
  FileTree,
  IndentedList,
  type TreeProps,
  type TreeNode,
  type FileNode,
} from "./Tree.tsx";

// CodeBlock
export {
  CodeBlock,
  InlineCode,
  Command,
  Diff,
  JsonDisplay,
  LogOutput,
  type CodeBlockProps,
  type CommandProps,
  type DiffLine,
  type DiffProps,
  type LogEntry,
} from "./CodeBlock.tsx";

// Callout
export {
  Callout,
  Quote,
  Highlight,
  Definition,
  Step,
  Steps,
  Aside,
  type CalloutProps,
  type CalloutType,
  type QuoteProps,
  type HighlightProps,
  type DefinitionProps,
  type StepProps,
  type StepsProps,
  type AsideProps,
} from "./Callout.tsx";

// Gradient
export {
  GradientText,
  BrandGradient,
  RainbowText,
  FireText,
  OceanText,
  NeonText,
  PulsingText,
  GradientArt,
  GRADIENTS,
  type GradientTextProps,
  type GradientPreset,
} from "./Gradient.tsx";

// Icons
export {
  STATUS_ICONS,
  PROGRESS_ICONS,
  ARROW_ICONS,
  UI_ICONS,
  TECH_ICONS,
  AI_ICONS,
  WEATHER_ICONS,
  SPINNER_FRAMES,
  BOX_CHARS,
  Icon,
  StatusIcon,
  getIcon,
  type IconProps,
} from "./Icons.tsx";

// Timer
export {
  Countdown,
  Elapsed,
  Duration,
  TimeRange,
  RelativeTime,
  ETA,
  type TimerProps,
} from "./Timer.tsx";

// Dashboard
export {
  Grid,
  Panel,
  Metric,
  MetricsRow,
  Sparkline,
  MiniBarChart,
  ActivityMap,
  ResourceGauge,
  Dashboard,
  type GridProps,
  type PanelProps,
  type MetricProps,
  type BarChartItem,
  type ResourceGaugeProps,
  type DashboardProps,
} from "./Dashboard.tsx";

// Input displays
export {
  InputField,
  Checkbox,
  Radio,
  RadioGroup,
  SelectDisplay,
  FormGroup,
  FormActions,
  Prompt,
  Confirm,
  type InputFieldProps,
  type CheckboxProps,
  type RadioProps,
  type RadioGroupProps,
  type SelectDisplayProps,
  type FormGroupProps,
  type FormActionsProps,
  type PromptProps,
  type ConfirmProps,
} from "./Input.tsx";

// Layout
export {
  Columns,
  Column,
  Rows,
  Row,
  Split,
  GridLayout,
  GridCell,
  Stack,
  Center,
  Spacer as LayoutSpacer,
  Absolute,
  SidebarLayout,
  FullScreen,
  HolyGrailLayout,
  ResponsiveColumns,
  AspectBox,
  Masonry,
  Overlay,
  Inline,
  TitledSection,
  TwoColumnCard,
  type ColumnsProps,
  type ColumnProps,
  type RowsProps,
  type RowProps,
  type SplitProps,
  type GridLayoutProps,
  type GridCellProps,
  type StackProps,
  type CenterProps,
  type SpacerProps,
  type AbsoluteProps,
  type SidebarLayoutProps,
  type FullScreenProps,
  type HolyGrailLayoutProps,
  type ResponsiveColumnsProps,
  type AspectBoxProps,
  type MasonryProps,
  type OverlayProps,
  type InlineProps,
  type TitledSectionProps,
  type TwoColumnCardProps,
} from "./Layout.tsx";

// Modal/Dialog
export {
  Modal,
  Dialog,
  ConfirmDialog,
  AlertDialog,
  InputDialog,
  ActionSheet,
  Popover,
  Tooltip,
  type ModalProps,
  type DialogProps,
  type ConfirmDialogProps,
  type AlertDialogProps,
  type InputDialogProps,
  type ActionSheetProps,
  type ActionSheetAction,
  type PopoverProps,
  type TooltipProps,
} from "./Modal.tsx";

// Toast/Notification
export {
  Toast,
  ToastContainer,
  Notification,
  InlineNotification,
  BannerNotification,
  Snackbar,
  ProgressToast,
  ActivityLog,
  type ToastProps,
  type ToastType,
  type ToastItem,
  type ToastContainerProps,
  type NotificationProps,
  type InlineNotificationProps,
  type BannerNotificationProps,
  type SnackbarProps,
  type ProgressToastProps,
  type ActivityItem,
  type ActivityLogProps,
} from "./Toast.tsx";

// Tabs
export {
  Tabs,
  TabBar,
  Tab,
  VerticalTabs,
  SegmentedControl,
  StepTabs,
  BottomTabs,
  type TabsProps,
  type TabBarProps,
  type TabProps,
  type TabItem,
  type VerticalTabsProps,
  type SegmentedControlProps,
  type StepTabsProps,
  type BottomTabsProps,
} from "./Tabs.tsx";

// Animation
export {
  Typewriter,
  Pulse,
  Blink,
  FadeIn,
  Wave,
  Rainbow,
  Shimmer,
  Bounce,
  Glitch,
  Marquee,
  Counter,
  LoadingDots,
  Skeleton,
  type TypewriterProps,
  type PulseProps,
  type BlinkProps,
  type FadeInProps,
  type WaveProps,
  type RainbowProps,
  type ShimmerProps,
  type BounceProps,
  type GlitchProps,
  type MarqueeProps,
  type CounterProps,
  type LoadingDotsProps,
  type SkeletonProps,
} from "./Animation.tsx";

// Version Display & Mascot
export {
  VersionDisplay,
  renderVersion,
  Mascot,
  RALPH_MASCOT,
  type VersionDisplayProps,
  type MascotProps,
} from "./VersionDisplay.tsx";

// Help Screen
export {
  HelpScreen,
  renderHelp,
  type HelpScreenProps,
} from "./HelpScreen.tsx";

// Menu/CommandPalette
export {
  MenuItem,
  Menu,
  DropdownMenu,
  ContextMenu,
  CommandPalette,
  Autocomplete,
  BreadcrumbMenu,
  ActionBar,
  type MenuItemProps,
  type MenuItemData,
  type MenuProps,
  type DropdownMenuProps,
  type ContextMenuProps,
  type CommandPaletteProps,
  type CommandItem,
  type AutocompleteProps,
  type SuggestionItem,
  type BreadcrumbMenuProps,
  type ActionBarProps,
  type ActionBarItem,
} from "./Menu.tsx";

// Loading
export {
  LoadingPhrase,
  LoadingState,
  ProgressIndicator,
  StepLoader,
  SkeletonLoader,
  LoadingOverlay,
  OperationStatus,
  BatchOperations,
  DEFAULT_LOADING_PHRASES,
  WITTY_PHRASES,
  TECHNICAL_PHRASES,
  type LoadingPhraseProps,
  type LoadingStateProps,
  type ProgressIndicatorProps,
  type StepLoaderStep,
  type StepLoaderProps,
  type SkeletonLoaderProps,
  type LoadingOverlayProps,
  type OperationStatusProps,
  type BatchOperation,
  type BatchOperationsProps,
} from "./Loading.tsx";
