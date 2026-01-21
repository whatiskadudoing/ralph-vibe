/**
 * Accessibility context for screen reader support.
 */

import { createContext } from "react";

export interface AccessibilityContextValue {
  /** Whether a screen reader is currently enabled */
  isScreenReaderEnabled: boolean;
}

export const AccessibilityContext = createContext<AccessibilityContextValue>({
  isScreenReaderEnabled: false,
});
