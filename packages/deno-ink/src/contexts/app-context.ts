// App context - provides access to the Ink app instance
import { createContext } from "react";

export interface AppContextValue {
  exit: (error?: Error) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);
