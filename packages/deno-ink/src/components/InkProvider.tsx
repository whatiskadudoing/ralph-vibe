// deno-lint-ignore-file no-explicit-any
// InkProvider - provides all contexts to the Ink component tree
import React, { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { AppContext, type AppContextValue } from "../contexts/app-context.ts";
import { FocusContext, FocusManagerContext, type FocusContextValue } from "../contexts/focus-context.ts";
import {
  StdoutContext,
  StderrContext,
  StdinContext,
  type StdoutContextValue,
  type StderrContextValue,
  type StdinContextValue,
} from "../contexts/std-context.ts";
import { InputContext } from "../hooks/use-input.ts";
import type { FocusManager } from "../focus-manager.ts";

export interface InkProviderProps {
  children: ReactNode;
  app: AppContextValue;
  focusManager: FocusManager;
  stdout: StdoutContextValue;
  stderr: StderrContextValue;
  stdin: StdinContextValue;
  input: {
    subscribe: (handler: (input: string, key: any) => void) => () => void;
    isRawModeSupported: boolean;
  };
}

export function InkProvider({
  children,
  app,
  focusManager,
  stdout,
  stderr,
  stdin,
  input,
}: InkProviderProps) {
  // Use state to track focus context changes
  const [focusContext, setFocusContext] = useState<FocusContextValue>(() =>
    focusManager.getContextValue()
  );

  // Subscribe to focus manager changes
  useEffect(() => {
    const unsubscribe = focusManager.subscribe(() => {
      setFocusContext(focusManager.getContextValue());
    });
    return unsubscribe;
  }, [focusManager]);

  // Memoize the manager context
  const focusManagerContext = useMemo(() => ({ manager: focusManager }), [focusManager]);

  return (
    <AppContext.Provider value={app}>
      <FocusManagerContext.Provider value={focusManagerContext}>
        <FocusContext.Provider value={focusContext}>
          <StdoutContext.Provider value={stdout}>
            <StderrContext.Provider value={stderr}>
              <StdinContext.Provider value={stdin}>
                <InputContext.Provider value={input}>
                  {children}
                </InputContext.Provider>
              </StdinContext.Provider>
            </StderrContext.Provider>
          </StdoutContext.Provider>
        </FocusContext.Provider>
      </FocusManagerContext.Provider>
    </AppContext.Provider>
  );
}
