/**
 * @module components/Menu
 *
 * Menu, dropdown, and command palette components.
 * Inspired by VS Code command palette and Charm.sh gum.
 */

import React, { type ReactNode } from "react";
import { Box, Text } from "@ink/mod.ts";

// ============================================================================
// MENU ITEM - Single menu item
// ============================================================================

export interface MenuItemProps {
  /** Item label */
  label: string;
  /** Item icon */
  icon?: string;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Is selected/focused */
  selected?: boolean;
  /** Is disabled */
  disabled?: boolean;
  /** Danger/destructive action */
  danger?: boolean;
  /** Selected color */
  selectedColor?: string;
  /** Show checkbox */
  checkbox?: boolean;
  /** Checkbox checked state */
  checked?: boolean;
  /** Description */
  description?: string;
}

export function MenuItem({
  label,
  icon,
  shortcut,
  selected = false,
  disabled = false,
  danger = false,
  selectedColor = "cyan",
  checkbox = false,
  checked = false,
  description,
}: MenuItemProps): React.ReactElement {
  const color = disabled ? "gray" : danger ? "red" : selected ? selectedColor : undefined;

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Box>
          <Text color={selected ? selectedColor : "gray"}>
            {selected ? "› " : "  "}
          </Text>
          {checkbox && (
            <Text color={color}>
              {checked ? "[✓] " : "[ ] "}
            </Text>
          )}
          {icon && <Text color={color}>{icon} </Text>}
          <Text
            color={color}
            bold={selected}
            dimColor={disabled}
            strikethrough={disabled}
          >
            {label}
          </Text>
        </Box>
        {shortcut && (
          <Text dimColor> {shortcut}</Text>
        )}
      </Box>
      {description && selected && (
        <Box marginLeft={2}>
          <Text dimColor>{description}</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// MENU - Vertical menu list
// ============================================================================

export interface MenuItemData {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  description?: string;
  divider?: boolean;
}

export interface MenuProps {
  /** Menu items */
  items: MenuItemData[];
  /** Selected item id */
  selectedId?: string;
  /** Selected color */
  selectedColor?: string;
  /** Title */
  title?: string;
  /** Footer hint */
  footer?: string;
  /** Border */
  bordered?: boolean;
  /** Border color */
  borderColor?: string;
  /** Width */
  width?: number;
}

export function Menu({
  items,
  selectedId,
  selectedColor = "cyan",
  title,
  footer,
  bordered = true,
  borderColor = "gray",
  width,
}: MenuProps): React.ReactElement {
  const content = (
    <Box flexDirection="column" width={width}>
      {title && (
        <Box marginBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      {items.map((item) => {
        if (item.divider) {
          return (
            <Box key={item.id} marginY={0}>
              <Text dimColor>{"─".repeat(width ? width - 4 : 30)}</Text>
            </Box>
          );
        }
        return (
          <React.Fragment key={item.id}>
            <MenuItem
              label={item.label}
              icon={item.icon}
              shortcut={item.shortcut}
              selected={item.id === selectedId}
              disabled={item.disabled}
              danger={item.danger}
              selectedColor={selectedColor}
              description={item.description}
            />
          </React.Fragment>
        );
      })}
      {footer && (
        <Box marginTop={1}>
          <Text dimColor>{footer}</Text>
        </Box>
      )}
    </Box>
  );

  if (bordered) {
    return (
      <Box
        borderStyle="round"
        borderColor={borderColor}
        paddingX={1}
        paddingY={0}
      >
        {content}
      </Box>
    );
  }

  return content;
}

// ============================================================================
// DROPDOWN MENU - Menu with trigger label
// ============================================================================

export interface DropdownMenuProps {
  /** Trigger label */
  label: string;
  /** Is open */
  open?: boolean;
  /** Menu items */
  items: MenuItemData[];
  /** Selected item id */
  selectedId?: string;
  /** Selected color */
  selectedColor?: string;
  /** Width */
  width?: number;
}

export function DropdownMenu({
  label,
  open = false,
  items,
  selectedId,
  selectedColor = "cyan",
  width,
}: DropdownMenuProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor={open ? selectedColor : "gray"}
        paddingX={2}
      >
        <Text>{label}</Text>
        <Text> </Text>
        <Text color={open ? selectedColor : "gray"}>
          {open ? "▲" : "▼"}
        </Text>
      </Box>
      {open && (
        <Menu
          items={items}
          selectedId={selectedId}
          selectedColor={selectedColor}
          width={width}
        />
      )}
    </Box>
  );
}

// ============================================================================
// CONTEXT MENU - Floating context menu
// ============================================================================

export interface ContextMenuProps {
  /** Menu items */
  items: MenuItemData[];
  /** Selected item id */
  selectedId?: string;
  /** Selected color */
  selectedColor?: string;
  /** Position (visual hint) */
  position?: "left" | "right";
}

export function ContextMenu({
  items,
  selectedId,
  selectedColor = "cyan",
  position = "left",
}: ContextMenuProps): React.ReactElement {
  return (
    <Box justifyContent={position === "right" ? "flex-end" : "flex-start"}>
      <Menu
        items={items}
        selectedId={selectedId}
        selectedColor={selectedColor}
        bordered
        borderColor="gray"
      />
    </Box>
  );
}

// ============================================================================
// COMMAND PALETTE - Search-driven command menu
// ============================================================================

export interface CommandItem {
  id: string;
  label: string;
  category?: string;
  icon?: string;
  shortcut?: string;
  description?: string;
}

export interface CommandPaletteProps {
  /** Available commands */
  commands: CommandItem[];
  /** Search query */
  query?: string;
  /** Selected command id */
  selectedId?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Max visible items */
  maxVisible?: number;
  /** Width */
  width?: number;
  /** Accent color */
  accentColor?: string;
}

export function CommandPalette({
  commands,
  query = "",
  selectedId,
  placeholder = "Type a command...",
  maxVisible = 10,
  width = 60,
  accentColor = "cyan",
}: CommandPaletteProps): React.ReactElement {
  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.category?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const visibleCommands = filteredCommands.slice(0, maxVisible);
  const hasMore = filteredCommands.length > maxVisible;

  // Group by category
  const categories = new Map<string, CommandItem[]>();
  visibleCommands.forEach((cmd) => {
    const cat = cmd.category || "Commands";
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(cmd);
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={accentColor}
      width={width}
    >
      {/* Search Input */}
      <Box
        borderStyle="single"
        borderColor="gray"
        borderLeft={false}
        borderRight={false}
        borderTop={false}
        paddingX={2}
        paddingY={0}
      >
        <Text color={accentColor}>{">"} </Text>
        <Text>{query || <Text dimColor>{placeholder}</Text>}</Text>
        <Text color={accentColor}>│</Text>
      </Box>

      {/* Results */}
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        {filteredCommands.length === 0 ? (
          <Text dimColor>No commands found</Text>
        ) : (
          Array.from(categories.entries()).map(([category, items]) => (
            <Box key={category} flexDirection="column">
              <Text dimColor bold>{category}</Text>
              {items.map((cmd) => (
                <Box key={cmd.id} justifyContent="space-between">
                  <Box>
                    <Text color={cmd.id === selectedId ? accentColor : "gray"}>
                      {cmd.id === selectedId ? "› " : "  "}
                    </Text>
                    {cmd.icon && (
                      <Text color={cmd.id === selectedId ? accentColor : undefined}>
                        {cmd.icon}{" "}
                      </Text>
                    )}
                    <Text
                      color={cmd.id === selectedId ? accentColor : undefined}
                      bold={cmd.id === selectedId}
                    >
                      {cmd.label}
                    </Text>
                    {cmd.description && cmd.id === selectedId && (
                      <Text dimColor> - {cmd.description}</Text>
                    )}
                  </Box>
                  {cmd.shortcut && (
                    <Text dimColor>{cmd.shortcut}</Text>
                  )}
                </Box>
              ))}
            </Box>
          ))
        )}
        {hasMore && (
          <Text dimColor>
            +{filteredCommands.length - maxVisible} more results...
          </Text>
        )}
      </Box>

      {/* Footer hint */}
      <Box
        borderStyle="single"
        borderColor="gray"
        borderLeft={false}
        borderRight={false}
        borderBottom={false}
        paddingX={2}
        paddingY={0}
        justifyContent="center"
      >
        <Text dimColor>↑↓ Navigate  Enter Select  Esc Close</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// AUTOCOMPLETE - Input with suggestions
// ============================================================================

export interface SuggestionItem {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface AutocompleteProps {
  /** Input value */
  value: string;
  /** Suggestions */
  suggestions: SuggestionItem[];
  /** Selected suggestion index */
  selectedIndex?: number;
  /** Placeholder */
  placeholder?: string;
  /** Label */
  label?: string;
  /** Max visible suggestions */
  maxVisible?: number;
  /** Width */
  width?: number;
  /** Accent color */
  accentColor?: string;
}

export function Autocomplete({
  value,
  suggestions,
  selectedIndex = 0,
  placeholder,
  label,
  maxVisible = 5,
  width = 40,
  accentColor = "cyan",
}: AutocompleteProps): React.ReactElement {
  const visibleSuggestions = suggestions.slice(0, maxVisible);

  return (
    <Box flexDirection="column" width={width}>
      {label && <Text>{label}</Text>}
      <Box
        borderStyle="round"
        borderColor={accentColor}
        paddingX={1}
      >
        <Text>{value || <Text dimColor>{placeholder}</Text>}</Text>
        <Text color={accentColor}>│</Text>
      </Box>
      {suggestions.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          borderTop={false}
          paddingX={1}
        >
          {visibleSuggestions.map((suggestion, index) => (
            <Box key={suggestion.id}>
              <Text color={index === selectedIndex ? accentColor : "gray"}>
                {index === selectedIndex ? "› " : "  "}
              </Text>
              {suggestion.icon && (
                <Text color={index === selectedIndex ? accentColor : undefined}>
                  {suggestion.icon}{" "}
                </Text>
              )}
              <Text
                color={index === selectedIndex ? accentColor : undefined}
                bold={index === selectedIndex}
              >
                {suggestion.label}
              </Text>
              {suggestion.description && index === selectedIndex && (
                <Text dimColor> - {suggestion.description}</Text>
              )}
            </Box>
          ))}
          {suggestions.length > maxVisible && (
            <Text dimColor>
              +{suggestions.length - maxVisible} more...
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// BREADCRUMB MENU - Hierarchical navigation menu
// ============================================================================

export interface BreadcrumbMenuProps {
  /** Path segments */
  path: Array<{ id: string; label: string }>;
  /** Active segment id */
  activeId?: string;
  /** Separator */
  separator?: string;
  /** Accent color */
  accentColor?: string;
}

export function BreadcrumbMenu({
  path,
  activeId,
  separator = " › ",
  accentColor = "cyan",
}: BreadcrumbMenuProps): React.ReactElement {
  return (
    <Box>
      {path.map((segment, index) => {
        const isActive = segment.id === activeId;
        const isLast = index === path.length - 1;

        return (
          <Box key={segment.id}>
            <Text
              color={isActive ? accentColor : undefined}
              bold={isActive}
              underline={!isLast}
            >
              {segment.label}
            </Text>
            {!isLast && <Text dimColor>{separator}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================================================
// ACTION BAR - Horizontal action buttons
// ============================================================================

export interface ActionBarItem {
  id: string;
  label: string;
  icon?: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export interface ActionBarProps {
  /** Actions */
  actions: ActionBarItem[];
  /** Selected action id */
  selectedId?: string;
  /** Accent color */
  accentColor?: string;
  /** Gap between actions */
  gap?: number;
}

export function ActionBar({
  actions,
  selectedId,
  accentColor = "cyan",
  gap = 2,
}: ActionBarProps): React.ReactElement {
  return (
    <Box gap={gap}>
      {actions.map((action) => {
        const isSelected = action.id === selectedId;
        let color: string | undefined;

        if (action.disabled) {
          color = "gray";
        } else if (action.danger) {
          color = "red";
        } else if (action.primary || isSelected) {
          color = accentColor;
        }

        return (
          <Box
            key={action.id}
            borderStyle="round"
            borderColor={isSelected ? color : "gray"}
            paddingX={2}
          >
            {action.icon && <Text color={color}>{action.icon} </Text>}
            <Text
              color={color}
              bold={action.primary || isSelected}
              dimColor={action.disabled}
            >
              {action.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
