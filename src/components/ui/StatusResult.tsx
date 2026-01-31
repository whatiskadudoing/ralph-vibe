/**
 * @module components/ui/StatusResult
 *
 * Success or error result display.
 */

import React from "react";
import { Box, Text } from "../../../packages/deno-ink/src/mod.ts";
import { colors } from "./theme.ts";

export interface StatusResultProps {
  /** Result type */
  type: "success" | "error";
  /** Main message */
  title: string;
  /** Optional detail/subtitle */
  detail?: string;
  /** Optional file paths to display */
  files?: string[];
}

export function StatusResult({
  type,
  title,
  detail,
  files,
}: StatusResultProps): React.ReactElement {
  const icon = type === "success" ? "✓" : "✗";
  const iconColor = type === "success" ? colors.success : colors.error;
  const titleColor = type === "error" ? colors.error : undefined;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text color={iconColor}>{icon}</Text>
        <Text bold color={titleColor}>{title}</Text>
      </Box>
      {detail && (
        <Text color={colors.dim}>{detail}</Text>
      )}
      {files && files.length > 0 && (
        <Box flexDirection="column" marginTop={0}>
          {files.map((file, i) => (
            <Text key={`file-${i}`} color={colors.dim}>→ {file}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
