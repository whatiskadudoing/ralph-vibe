/**
 * @module components/ui/ToolActivity.test
 *
 * Tests for ToolActivity helper functions
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  getToolIcon,
  getToolColor,
  getInputPreview,
  getModelBadge,
  getModelBadgeColor,
  type EnhancedToolCall,
} from "./ToolActivity.tsx";
import { colors } from "./theme.ts";

Deno.test("getToolIcon - returns correct icons", () => {
  assertEquals(getToolIcon("Read"), "◦");
  assertEquals(getToolIcon("Write"), "+");
  assertEquals(getToolIcon("Edit"), "~");
  assertEquals(getToolIcon("Bash"), "$");
  assertEquals(getToolIcon("Glob"), "○");
  assertEquals(getToolIcon("Grep"), "○");
  assertEquals(getToolIcon("Task"), "●");
  assertEquals(getToolIcon("WebFetch"), "↗");
  assertEquals(getToolIcon("Unknown"), "▸");
});

Deno.test("getToolColor - returns correct colors", () => {
  assertEquals(getToolColor("Read"), colors.info);
  assertEquals(getToolColor("Write"), colors.success);
  assertEquals(getToolColor("Edit"), colors.accent);
  assertEquals(getToolColor("Bash"), colors.accent);
  assertEquals(getToolColor("Unknown"), colors.dim);
});

Deno.test("getInputPreview - Read tool shows last two path segments", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "Read",
    status: "success",
    input: {
      file_path: "/Users/kadu/project/src/auth/session.ts",
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, "auth/session.ts");
});

Deno.test("getInputPreview - Bash tool shows command", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "Bash",
    status: "running",
    input: {
      command: "npm test",
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, "npm test");
});

Deno.test("getInputPreview - Bash tool truncates long commands", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "Bash",
    status: "running",
    input: {
      command: "This is a very long command that should be truncated because it exceeds the maximum length",
    },
  };

  const preview = getInputPreview(tool, 40);
  assertEquals(preview.length, 40);
  assertEquals(preview.endsWith("..."), true);
});

Deno.test("getInputPreview - Task tool shows description in quotes", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "Task",
    status: "running",
    input: {
      description: "analyze code structure",
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, '"analyze code structure"');
});

Deno.test("getInputPreview - Glob tool shows pattern", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "Glob",
    status: "success",
    input: {
      pattern: "**/*.ts",
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, "**/*.ts");
});

Deno.test("getInputPreview - WebFetch tool shows hostname", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "WebFetch",
    status: "running",
    input: {
      url: "https://api.github.com/repos/user/repo",
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, "api.github.com");
});

Deno.test("getModelBadge - returns correct badges", () => {
  assertEquals(getModelBadge("claude-opus-4"), "[opus]");
  assertEquals(getModelBadge("claude-sonnet-4"), "[sonnet]");
  assertEquals(getModelBadge("claude-haiku-4"), "[haiku]");
  assertEquals(getModelBadge("some-other-model"), "[some-o]");
  assertEquals(getModelBadge(undefined), "");
});

Deno.test("getModelBadgeColor - returns correct colors", () => {
  assertEquals(getModelBadgeColor("opus"), colors.accent);
  assertEquals(getModelBadgeColor("sonnet"), colors.info);
  assertEquals(getModelBadgeColor("haiku"), colors.success);
  assertEquals(getModelBadgeColor("unknown"), colors.dim);
  assertEquals(getModelBadgeColor(undefined), colors.dim);
});

Deno.test("getInputPreview - handles short paths", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "Read",
    status: "success",
    input: {
      file_path: "file.ts",
    },
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, "file.ts");
});

Deno.test("getInputPreview - handles empty input gracefully", () => {
  const tool: EnhancedToolCall = {
    id: "1",
    name: "Read",
    status: "success",
    input: {},
  };

  const preview = getInputPreview(tool);
  assertEquals(preview, "");
});
