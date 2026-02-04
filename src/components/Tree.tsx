/**
 * @module components/Tree
 *
 * Tree view component for hierarchical data using deno-ink.
 */

import React from 'react';
import { Box, Text } from '@ink/mod.ts';

export interface TreeNode {
  /** Node label */
  label: string;
  /** Node icon (optional) */
  icon?: string;
  /** Node color (optional) */
  color?: string;
  /** Whether node is expanded */
  expanded?: boolean;
  /** Child nodes */
  children?: TreeNode[];
}

export interface TreeProps {
  /** Root nodes */
  nodes: TreeNode[];
  /** Use ASCII characters instead of Unicode */
  ascii?: boolean;
  /** Show guides (vertical lines) */
  guides?: boolean;
  /** Indent size */
  indent?: number;
}

interface TreeChars {
  branch: string;
  lastBranch: string;
  vertical: string;
  space: string;
}

const TREE_CHARS: TreeChars = {
  branch: '├── ',
  lastBranch: '└── ',
  vertical: '│   ',
  space: '    ',
};

const TREE_CHARS_ASCII: TreeChars = {
  branch: '|-- ',
  lastBranch: '`-- ',
  vertical: '|   ',
  space: '    ',
};

interface TreeNodeRowProps {
  node: TreeNode;
  isLast: boolean;
  prefix: string;
  chars: TreeChars;
  guides: boolean;
}

function TreeNodeRow({
  node,
  isLast,
  prefix,
  chars,
  guides,
}: TreeNodeRowProps): React.ReactElement {
  const hasChildren = node.children && node.children.length > 0;
  const branch = isLast ? chars.lastBranch : chars.branch;
  const childPrefix = prefix + (isLast ? chars.space : (guides ? chars.vertical : chars.space));

  return (
    <Box flexDirection='column'>
      <Box>
        <Text dimColor>{prefix}{branch}</Text>
        {node.icon && <Text color={node.color}>{node.icon}</Text>}
        <Text color={node.color}>{node.label}</Text>
      </Box>
      {hasChildren && node.expanded !== false &&
        node.children?.map((child, index) => (
          <React.Fragment key={index}>
            <TreeNodeRow
              node={child}
              isLast={index === (node.children?.length ?? 0) - 1}
              prefix={childPrefix}
              chars={chars}
              guides={guides}
            />
          </React.Fragment>
        ))}
    </Box>
  );
}

export function Tree({
  nodes,
  ascii = false,
  guides = true,
}: TreeProps): React.ReactElement {
  const chars = ascii ? TREE_CHARS_ASCII : TREE_CHARS;

  return (
    <Box flexDirection='column'>
      {nodes.map((node, index) => (
        <React.Fragment key={index}>
          <TreeNodeRow
            node={node}
            isLast={index === nodes.length - 1}
            prefix=''
            chars={chars}
            guides={guides}
          />
        </React.Fragment>
      ))}
    </Box>
  );
}

// File tree with default icons
export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

function getFileIcon(name: string, type: 'file' | 'folder'): string {
  if (type === 'folder') return '📁';

  const ext = name.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    ts: '📘',
    tsx: '⚛️',
    js: '📒',
    jsx: '⚛️',
    json: '📋',
    md: '📝',
    yml: '⚙️',
    yaml: '⚙️',
    css: '🎨',
    html: '🌐',
    py: '🐍',
    rs: '🦀',
    go: '🐹',
    sh: '🔧',
    bash: '🔧',
  };

  return iconMap[ext ?? ''] ?? '📄';
}

function fileNodeToTreeNode(node: FileNode): TreeNode {
  return {
    label: node.name,
    icon: getFileIcon(node.name, node.type),
    color: node.type === 'folder' ? 'cyan' : undefined,
    children: node.children?.map(fileNodeToTreeNode),
  };
}

export function FileTree({ files }: { files: FileNode[] }): React.ReactElement {
  const nodes = files.map(fileNodeToTreeNode);
  return <Tree nodes={nodes} />;
}

// Simple indented list (no tree lines)
export function IndentedList({
  items,
  indent = 2,
}: {
  items: Array<{ label: string; level: number; icon?: string; color?: string }>;
  indent?: number;
}): React.ReactElement {
  return (
    <Box flexDirection='column'>
      {items.map((item, index) => (
        <Box key={index}>
          <Text>{' '.repeat(item.level * indent)}</Text>
          {item.icon && <Text color={item.color}>{item.icon}</Text>}
          <Text color={item.color}>{item.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
