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
export { Box, Newline, render, Spacer, Spinner, Text } from '@ink/mod.ts';
export type { BoxProps, SpinnerProps, Styles, TextProps } from '@ink/mod.ts';

// Progress Bar
export { ProgressBar, type ProgressBarProps } from './ProgressBar.tsx';

// Status Indicator
export {
  StatusError,
  StatusIndicator,
  type StatusIndicatorProps,
  StatusInfo,
  StatusPending,
  StatusRunning,
  StatusSuccess,
  type StatusType,
  StatusWarning,
} from './StatusIndicator.tsx';

// List
export {
  ArrowList,
  BulletList,
  List,
  type ListItem,
  type ListProps,
  type ListStyle,
  NumberedList,
  TaskList,
} from './List.tsx';

// Stats Line
export { IconStat, Stat, type StatItem, StatsLine, type StatsLineProps } from './StatsLine.tsx';

// Badge
export { Badge, type BadgeProps, LabelBadge, ModelBadge, StatusBadge } from './Badge.tsx';

// Divider
export { Divider, type DividerProps, type DividerStyle, Line, SectionHeader } from './Divider.tsx';

// Table
export {
  type ColumnAlign,
  type ColumnConfig,
  type HeaderStyle,
  KeyValueTable,
  Table,
  type TableProps,
} from './Table.tsx';

// Title Box
export { BorderedBox, type BorderStyle, TitleBox, type TitleBoxProps } from './TitleBox.tsx';

// Alert/Banner
export {
  Alert,
  type AlertProps,
  type AlertType,
  Banner,
  type BannerProps,
  ErrorAlert,
  InfoAlert,
  SuccessAlert,
  TipAlert,
  WarningAlert,
} from './Alert.tsx';

// Card
export {
  Card,
  type CardProps,
  CompactCard,
  FeatureCard,
  type FeatureCardProps,
  InfoCard,
  type InfoCardProps,
  StatCard,
  type StatCardProps,
} from './Card.tsx';

// Keyboard
export {
  HelpFooter,
  Key,
  KeyCombo,
  type KeyComboProps,
  type KeyProps,
  Shortcut,
  ShortcutBar,
  type ShortcutBarProps,
  ShortcutList,
  type ShortcutListProps,
  type ShortcutProps,
} from './Keyboard.tsx';

// Header/Footer/Layout
export {
  AppHeader,
  type AppHeaderProps,
  Breadcrumb,
  type BreadcrumbProps,
  Footer,
  type FooterProps,
  Header,
  type HeaderProps,
  Section,
  type SectionProps,
  StatusBar,
  type StatusBarProps,
} from './Header.tsx';

// Tree
export {
  type FileNode,
  FileTree,
  IndentedList,
  Tree,
  type TreeNode,
  type TreeProps,
} from './Tree.tsx';

// CodeBlock
export {
  CodeBlock,
  type CodeBlockProps,
  Command,
  type CommandProps,
  Diff,
  type DiffLine,
  type DiffProps,
  InlineCode,
  JsonDisplay,
  type LogEntry,
  LogOutput,
} from './CodeBlock.tsx';

// Callout
export {
  Aside,
  type AsideProps,
  Callout,
  type CalloutProps,
  type CalloutType,
  Definition,
  type DefinitionProps,
  Highlight,
  type HighlightProps,
  Quote,
  type QuoteProps,
  Step,
  type StepProps,
  Steps,
  type StepsProps,
} from './Callout.tsx';

// Gradient
export {
  BrandGradient,
  FireText,
  GradientArt,
  type GradientPreset,
  GRADIENTS,
  GradientText,
  type GradientTextProps,
  NeonText,
  OceanText,
  PulsingText,
  RainbowText,
} from './Gradient.tsx';

// Icons
export {
  AI_ICONS,
  ARROW_ICONS,
  BOX_CHARS,
  getIcon,
  Icon,
  type IconProps,
  PROGRESS_ICONS,
  SPINNER_FRAMES,
  STATUS_ICONS,
  StatusIcon,
  TECH_ICONS,
  UI_ICONS,
  WEATHER_ICONS,
} from './Icons.tsx';

// Timer
export {
  Countdown,
  Duration,
  Elapsed,
  ETA,
  RelativeTime,
  TimeRange,
  type TimerProps,
} from './Timer.tsx';

// Dashboard
export {
  ActivityMap,
  type BarChartItem,
  Dashboard,
  type DashboardProps,
  Grid,
  type GridProps,
  Metric,
  type MetricProps,
  MetricsRow,
  MiniBarChart,
  Panel,
  type PanelProps,
  ResourceGauge,
  type ResourceGaugeProps,
  Sparkline,
} from './Dashboard.tsx';

// Input displays
export {
  Checkbox,
  type CheckboxProps,
  Confirm,
  type ConfirmProps,
  FormActions,
  type FormActionsProps,
  FormGroup,
  type FormGroupProps,
  InputField,
  type InputFieldProps,
  Prompt,
  type PromptProps,
  Radio,
  RadioGroup,
  type RadioGroupProps,
  type RadioProps,
  SelectDisplay,
  type SelectDisplayProps,
} from './Input.tsx';

// Layout
export {
  Absolute,
  type AbsoluteProps,
  AspectBox,
  type AspectBoxProps,
  Center,
  type CenterProps,
  Column,
  type ColumnProps,
  Columns,
  type ColumnsProps,
  FullScreen,
  type FullScreenProps,
  GridCell,
  type GridCellProps,
  GridLayout,
  type GridLayoutProps,
  HolyGrailLayout,
  type HolyGrailLayoutProps,
  Inline,
  type InlineProps,
  Masonry,
  type MasonryProps,
  Overlay,
  type OverlayProps,
  ResponsiveColumns,
  type ResponsiveColumnsProps,
  Row,
  type RowProps,
  Rows,
  type RowsProps,
  SidebarLayout,
  type SidebarLayoutProps,
  Spacer as LayoutSpacer,
  type SpacerProps,
  Split,
  type SplitProps,
  Stack,
  type StackProps,
  TitledSection,
  type TitledSectionProps,
  TwoColumnCard,
  type TwoColumnCardProps,
} from './Layout.tsx';

// Modal/Dialog
export {
  ActionSheet,
  type ActionSheetAction,
  type ActionSheetProps,
  AlertDialog,
  type AlertDialogProps,
  ConfirmDialog,
  type ConfirmDialogProps,
  Dialog,
  type DialogProps,
  InputDialog,
  type InputDialogProps,
  Modal,
  type ModalProps,
  Popover,
  type PopoverProps,
  Tooltip,
  type TooltipProps,
} from './Modal.tsx';

// Toast/Notification
export {
  type ActivityItem,
  ActivityLog,
  type ActivityLogProps,
  BannerNotification,
  type BannerNotificationProps,
  InlineNotification,
  type InlineNotificationProps,
  Notification,
  type NotificationProps,
  ProgressToast,
  type ProgressToastProps,
  Snackbar,
  type SnackbarProps,
  Toast,
  ToastContainer,
  type ToastContainerProps,
  type ToastItem,
  type ToastProps,
  type ToastType,
} from './Toast.tsx';

// Tabs
export {
  BottomTabs,
  type BottomTabsProps,
  SegmentedControl,
  type SegmentedControlProps,
  StepTabs,
  type StepTabsProps,
  Tab,
  TabBar,
  type TabBarProps,
  type TabItem,
  type TabProps,
  Tabs,
  type TabsProps,
  VerticalTabs,
  type VerticalTabsProps,
} from './Tabs.tsx';

// Animation
export {
  Blink,
  type BlinkProps,
  Bounce,
  type BounceProps,
  Counter,
  type CounterProps,
  FadeIn,
  type FadeInProps,
  Glitch,
  type GlitchProps,
  LoadingDots,
  type LoadingDotsProps,
  Marquee,
  type MarqueeProps,
  Pulse,
  type PulseProps,
  Rainbow,
  type RainbowProps,
  Shimmer,
  type ShimmerProps,
  Skeleton,
  type SkeletonProps,
  Typewriter,
  type TypewriterProps,
  Wave,
  type WaveProps,
} from './Animation.tsx';

// Version Display & Mascot
export {
  Mascot,
  type MascotProps,
  RALPH_MASCOT,
  renderVersion,
  VersionDisplay,
  type VersionDisplayProps,
} from './VersionDisplay.tsx';

// Help Screen
export { HelpScreen, type HelpScreenProps, renderHelp } from './HelpScreen.tsx';

// Menu/CommandPalette
export {
  ActionBar,
  type ActionBarItem,
  type ActionBarProps,
  Autocomplete,
  type AutocompleteProps,
  BreadcrumbMenu,
  type BreadcrumbMenuProps,
  type CommandItem,
  CommandPalette,
  type CommandPaletteProps,
  ContextMenu,
  type ContextMenuProps,
  DropdownMenu,
  type DropdownMenuProps,
  Menu,
  MenuItem,
  type MenuItemData,
  type MenuItemProps,
  type MenuProps,
  type SuggestionItem,
} from './Menu.tsx';

// Loading
export {
  type BatchOperation,
  BatchOperations,
  type BatchOperationsProps,
  DEFAULT_LOADING_PHRASES,
  LoadingOverlay,
  type LoadingOverlayProps,
  LoadingPhrase,
  type LoadingPhraseProps,
  LoadingState,
  type LoadingStateProps,
  OperationStatus,
  type OperationStatusProps,
  ProgressIndicator,
  type ProgressIndicatorProps,
  SkeletonLoader,
  type SkeletonLoaderProps,
  StepLoader,
  type StepLoaderProps,
  type StepLoaderStep,
  TECHNICAL_PHRASES,
  WITTY_PHRASES,
} from './Loading.tsx';
