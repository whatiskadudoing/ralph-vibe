// Main render function
export { render, type InkInstance, type InkOptions } from "./ink.ts";

// Components
export { Box, type BoxProps } from "./components/Box.tsx";
export { Text, type TextProps } from "./components/Text.tsx";
export { Newline, type NewlineProps } from "./components/Newline.tsx";
export { Spacer } from "./components/Spacer.tsx";
export { Spinner, type SpinnerProps } from "./components/Spinner.tsx";
export { Static, type StaticProps } from "./components/Static.tsx";
export { Transform, type TransformProps } from "./components/Transform.tsx";
export { ErrorBoundary, type ErrorBoundaryProps, type ErrorBoundaryState } from "./components/ErrorBoundary.tsx";
export { TextInput, type TextInputProps } from "./components/TextInput.tsx";
export { SelectInput, type SelectInputProps, type SelectInputItem } from "./components/SelectInput.tsx";

// Hooks
export { useInput, type Key, type InputHandler } from "./hooks/use-input.ts";
export { useApp } from "./hooks/use-app.ts";
export { useFocus, type UseFocusOptions, type UseFocusResult } from "./hooks/use-focus.ts";
export { useFocusManager, type UseFocusManagerResult } from "./hooks/use-focus-manager.ts";
export { useStdout } from "./hooks/use-stdout.ts";
export { useStderr } from "./hooks/use-stderr.ts";
export { useStdin } from "./hooks/use-stdin.ts";

// Utilities
export { measureText, widestLine, clearMeasureCache } from "./measure-text.ts";
export { spinners, type SpinnerName, type SpinnerDefinition } from "./spinners.ts";

// Types
export type { Styles } from "./styles.ts";
export type { AppContextValue } from "./contexts/app-context.ts";
export type { FocusContextValue } from "./contexts/focus-context.ts";
export type { StdoutContextValue, StderrContextValue, StdinContextValue } from "./contexts/std-context.ts";
