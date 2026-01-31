/**
 * @module components/List
 *
 * List component with multiple styles using deno-ink.
 */

import React from "react";
import { Box, Text } from "@ink/mod.ts";
import { StatusIndicator, type StatusType } from "./StatusIndicator.tsx";

export type ListStyle = "bullet" | "numbered" | "checkbox" | "arrow" | "custom";

export interface ListItem {
  /** Item text */
  text: string;
  /** Optional status (shows status icon instead of bullet) */
  status?: StatusType;
  /** Nested sub-items */
  subItems?: ListItem[];
  /** Custom color for this item */
  color?: string;
}

export interface ListProps {
  /** Items to display (strings or ListItem objects) */
  items: (string | ListItem)[];
  /** List style (default: "bullet") */
  style?: ListStyle;
  /** Custom bullet character (for style: "custom") */
  bullet?: string;
  /** Left indentation in spaces (default: 0) */
  indent?: number;
  /** Color for bullets/arrows */
  bulletColor?: string;
  /** Default color for item text */
  itemColor?: string;
}

const BULLETS: Record<ListStyle, string> = {
  bullet: "•",
  numbered: "", // Handled specially
  checkbox: "", // Uses status icons
  arrow: "▶",
  custom: "•",
};

function normalizeItem(item: string | ListItem): ListItem {
  if (typeof item === "string") {
    return { text: item };
  }
  return item;
}

interface ListItemRowProps {
  item: ListItem;
  index: number;
  style: ListStyle;
  bullet?: string;
  bulletColor?: string;
  itemColor?: string;
  depth?: number;
}

function ListItemRow({
  item,
  index,
  style,
  bullet,
  bulletColor,
  itemColor,
  depth = 0,
}: ListItemRowProps): React.ReactElement {
  const indentStr = "  ".repeat(depth);

  // If item has a status, render with StatusIndicator
  if (item.status) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text>{indentStr}</Text>
          <StatusIndicator type={item.status} text={item.text} />
        </Box>
        {item.subItems?.map((subItem, i) => (
          <React.Fragment key={i}>
            <ListItemRow
              item={normalizeItem(subItem)}
              index={i}
              style={style}
              bullet={bullet}
              bulletColor={bulletColor}
              itemColor={itemColor}
              depth={depth + 1}
            />
          </React.Fragment>
        ))}
      </Box>
    );
  }

  // Determine the prefix
  let prefix: string;
  switch (style) {
    case "numbered":
      prefix = `${index + 1}.`;
      break;
    case "checkbox":
      prefix = "○"; // Default to pending
      break;
    case "arrow":
      prefix = BULLETS.arrow;
      break;
    case "custom":
      prefix = bullet ?? BULLETS.bullet;
      break;
    case "bullet":
    default:
      prefix = BULLETS.bullet;
      break;
  }

  const textColor = item.color ?? itemColor;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{indentStr}</Text>
        <Text color={bulletColor} dimColor={!bulletColor}>
          {prefix}
        </Text>
        <Text> </Text>
        <Text color={textColor}>{item.text}</Text>
      </Box>
      {item.subItems?.map((subItem, i) => (
        <React.Fragment key={i}>
          <ListItemRow
            item={normalizeItem(subItem)}
            index={i}
            style={style}
            bullet={bullet}
            bulletColor={bulletColor}
            itemColor={itemColor}
            depth={depth + 1}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}

export function List({
  items,
  style = "bullet",
  bullet,
  indent = 0,
  bulletColor,
  itemColor,
}: ListProps): React.ReactElement {
  const indentStr = " ".repeat(indent);

  return (
    <Box flexDirection="column">
      {items.map((rawItem, index) => {
        const item = normalizeItem(rawItem);
        return (
          <Box key={index}>
            <Text>{indentStr}</Text>
            <ListItemRow
              item={item}
              index={index}
              style={style}
              bullet={bullet}
              bulletColor={bulletColor}
              itemColor={itemColor}
            />
          </Box>
        );
      })}
    </Box>
  );
}

// Convenience components
export function BulletList({
  items,
  indent,
}: {
  items: string[];
  indent?: number;
}): React.ReactElement {
  return <List items={items} style="bullet" indent={indent} />;
}

export function NumberedList({
  items,
  indent,
}: {
  items: string[];
  indent?: number;
}): React.ReactElement {
  return <List items={items} style="numbered" indent={indent} />;
}

export function ArrowList({
  items,
  indent,
  bulletColor,
}: {
  items: string[];
  indent?: number;
  bulletColor?: string;
}): React.ReactElement {
  return <List items={items} style="arrow" indent={indent} bulletColor={bulletColor} />;
}

export function TaskList({
  items,
  indent,
}: {
  items: Array<{ text: string; status: StatusType }>;
  indent?: number;
}): React.ReactElement {
  return <List items={items} indent={indent} />;
}
