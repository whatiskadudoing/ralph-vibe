/**
 * @module components/InitScreen
 *
 * Init screen using shared UI components.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  render,
  Spinner,
  Text,
  useApp,
  useFinalOutput,
  useInput,
} from '../../packages/deno-ink/src/mod.ts';
import { type ProjectFile } from '../services/project_service.ts';
import {
  colors,
  CommandBox,
  Header,
  KeyboardHints,
  StatusResult,
  StepIndicator,
  type StepStatus,
} from './ui/mod.ts';
import { buildFinalOutput } from './CommandScreen.tsx';

// ============================================================================
// Types
// ============================================================================

export interface ProjectFileInfo {
  key: ProjectFile;
  name: string;
  description: string;
  exists: boolean;
}

type Phase = 'checking' | 'select-files' | 'creating' | 'done';

interface PrerequisitesState {
  project: { status: StepStatus; message: string; detail?: string };
  git: { status: StepStatus; message: string; detail?: string };
  claude: { status: StepStatus; message: string; detail?: string };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface FileSelectorProps {
  files: ProjectFileInfo[];
  selectedKeys: Set<ProjectFile>;
  onToggle: (key: ProjectFile) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function FileSelector({
  files,
  selectedKeys,
  onToggle,
  onSelectAll,
  onSelectNone,
  onConfirm,
  onCancel,
}: FileSelectorProps): React.ReactElement {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useInput(
    (
      input: string,
      key: { escape?: boolean; upArrow?: boolean; downArrow?: boolean; return?: boolean },
    ) => {
      if (key.escape) {
        onCancel();
      } else if (key.upArrow) {
        setFocusedIndex((i: number) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setFocusedIndex((i: number) => Math.min(files.length - 1, i + 1));
      } else if (input === ' ') {
        const file = files[focusedIndex];
        if (file) onToggle(file.key);
      } else if (key.return) {
        onConfirm();
      } else if (input === 'a' || input === 'A') {
        onSelectAll();
      } else if (input === 'n' || input === 'N') {
        onSelectNone();
      }
    },
  );

  return (
    <Box flexDirection='column'>
      <Box marginBottom={1}>
        <Text color={colors.muted}>Select files to update (existing files):</Text>
      </Box>

      {files.map((file, i) => {
        const isSelected = selectedKeys.has(file.key);
        const isFocused = i === focusedIndex;
        return (
          <Box key={file.key} flexDirection='row' gap={1}>
            <Text color={isFocused ? colors.accent : colors.dim}>
              {isFocused ? '>' : ' '}
            </Text>
            <Text color={isSelected ? colors.success : colors.dim}>
              {isSelected ? '[x]' : '[ ]'}
            </Text>
            <Text color={isSelected ? colors.text : colors.muted}>{file.name}</Text>
            <Text color={colors.dim}>- {file.description}</Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <KeyboardHints
          hints={[
            { key: '↑↓', label: 'navigate' },
            { key: 'space', label: 'toggle' },
            { key: 'a', label: 'all' },
            { key: 'n', label: 'none' },
            { key: 'enter', label: 'confirm' },
            { key: 'esc', label: 'quit' },
          ]}
        />
      </Box>
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface InitScreenProps {
  checkProject: () => Promise<{ isInit: boolean; message: string; detail?: string }>;
  checkGit: () => Promise<{ ok: boolean; message: string; detail?: string }>;
  checkClaude: () => Promise<{ ok: boolean; message: string; detail?: string }>;
  getProjectFiles: () => Promise<ProjectFileInfo[]>;
  createFiles: (files: Set<ProjectFile>) => Promise<{ ok: boolean; error?: { message: string } }>;
  onComplete: (files: ProjectFile[]) => void;
  onCancel: () => void;
  onError: (message: string) => void;
  vibeMode?: boolean;
  vibeSteps?: string[];
}

function InitScreen({
  checkProject,
  checkGit,
  checkClaude,
  getProjectFiles,
  createFiles,
  onComplete,
  onCancel,
  onError,
  vibeMode = false,
  vibeSteps = [],
}: InitScreenProps): React.ReactElement {
  const { exit } = useApp();
  const setFinalOutput = useFinalOutput();

  // State
  const [phase, setPhase] = useState<Phase>('checking');
  const [prerequisites, setPrerequisites] = useState<PrerequisitesState>({
    project: { status: 'active', message: 'Checking project...' },
    git: { status: 'pending', message: 'Checking git...' },
    claude: { status: 'pending', message: 'Checking Claude CLI...' },
  });
  const [projectFiles, setProjectFiles] = useState<ProjectFileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<ProjectFile>>(new Set());
  const [createdFiles, setCreatedFiles] = useState<ProjectFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  // Run prerequisites check
  useEffect(() => {
    (async () => {
      // Check project
      const projectResult = await checkProject();
      setPrerequisites((prev: PrerequisitesState) => ({
        ...prev,
        project: {
          status: 'completed',
          message: projectResult.message,
          detail: projectResult.detail,
        },
        git: { ...prev.git, status: 'active' },
      }));

      // Check git
      const gitResult = await checkGit();
      setPrerequisites((prev: PrerequisitesState) => ({
        ...prev,
        git: {
          status: gitResult.ok ? 'completed' : 'error',
          message: gitResult.message,
          detail: gitResult.detail,
        },
        claude: { ...prev.claude, status: 'active' },
      }));

      // Check Claude CLI
      const claudeResult = await checkClaude();
      setPrerequisites((prev: PrerequisitesState) => ({
        ...prev,
        claude: {
          status: claudeResult.ok ? 'completed' : 'error',
          message: claudeResult.message,
          detail: claudeResult.detail,
        },
      }));

      if (!claudeResult.ok) {
        setErrorMessage('Claude CLI not found');
        onError('Claude CLI not found');
        setTimeout(() => exit(), 2000);
        return;
      }

      // Get project files
      const files = await getProjectFiles();
      setProjectFiles(files);

      const existingFiles = files.filter((f: ProjectFileInfo) => f.exists);

      if (projectResult.isInit && existingFiles.length > 0) {
        setPhase('select-files');
      } else {
        setPhase('creating');
        const allFileKeys = new Set<ProjectFile>(files.map((f: ProjectFileInfo) => f.key));
        const result = await createFiles(allFileKeys);
        if (result.ok) {
          setCreatedFiles(Array.from(allFileKeys));
          setPhase('done');
        } else {
          setErrorMessage(result.error?.message ?? 'Unknown error');
          onError(result.error?.message ?? 'Unknown error');
          setTimeout(() => exit(), 2000);
        }
      }
    })();
  }, []);

  // Handle file creation for existing project
  const handleConfirm = useCallback(async () => {
    setPhase('creating');

    const missingFiles = projectFiles
      .filter((f: ProjectFileInfo) => !f.exists)
      .map((f: ProjectFileInfo) => f.key);
    const filesToCreate = new Set<ProjectFile>([...selectedFiles, ...missingFiles]);

    if (filesToCreate.size === 0) {
      setCreatedFiles([]);
      setPhase('done');
      return;
    }

    const result = await createFiles(filesToCreate);
    if (result.ok) {
      setCreatedFiles(Array.from(filesToCreate));
      setPhase('done');
    } else {
      setErrorMessage(result.error?.message ?? 'Unknown error');
      onError(result.error?.message ?? 'Unknown error');
      setTimeout(() => exit(), 2000);
    }
  }, [projectFiles, selectedFiles, createFiles, onError, exit]);

  // Exit when done
  useEffect(() => {
    if (phase === 'done') {
      setFinalOutput(buildFinalOutput({
        success: true,
        title: 'Ready to vibe!',
        files: createdFiles.length > 0 ? createdFiles.map((k: ProjectFile) => k) : undefined,
        nextCommand: vibeMode ? undefined : 'ralph start',
      }));

      const timer = setTimeout(() => {
        onComplete(createdFiles);
        exit();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, createdFiles, onComplete, exit, setFinalOutput, vibeMode]);

  const existingFiles = projectFiles.filter((f: ProjectFileInfo) => f.exists);

  return (
    <CommandBox animateBorder={phase === 'checking' || phase === 'creating'}>
      <Header
        name='Ralph Init'
        vibeMode={vibeMode}
        vibeCurrentStep='init'
        vibeSteps={vibeSteps}
      />

      {/* Checking phase */}
      {phase === 'checking' && (
        <Box flexDirection='column'>
          <Text color={colors.muted} bold>Checking prerequisites...</Text>
          <Box flexDirection='column' paddingLeft={2} marginTop={1}>
            <StepIndicator
              status={prerequisites.project.status}
              label={prerequisites.project.message}
              detail={prerequisites.project.detail}
            />
            <StepIndicator
              status={prerequisites.git.status}
              label={prerequisites.git.message}
              detail={prerequisites.git.detail}
            />
            <StepIndicator
              status={prerequisites.claude.status}
              label={prerequisites.claude.message}
              detail={prerequisites.claude.detail}
            />
          </Box>
        </Box>
      )}

      {/* File selection phase */}
      {phase === 'select-files' && existingFiles.length > 0 && (
        <FileSelector
          files={existingFiles}
          selectedKeys={selectedFiles}
          onToggle={(key: ProjectFile) => {
            setSelectedFiles((prev: Set<ProjectFile>) => {
              const next = new Set(prev);
              if (next.has(key)) {
                next.delete(key);
              } else {
                next.add(key);
              }
              return next;
            });
          }}
          onSelectAll={() =>
            setSelectedFiles(new Set(existingFiles.map((f: ProjectFileInfo) => f.key)))}
          onSelectNone={() => setSelectedFiles(new Set())}
          onConfirm={handleConfirm}
          onCancel={() => {
            onCancel();
            exit();
          }}
        />
      )}

      {/* Creating phase */}
      {phase === 'creating' && (
        <Box flexDirection='row' gap={1}>
          <Spinner type='dots' />
          <Text>Creating project files...</Text>
        </Box>
      )}

      {/* Done phase */}
      {phase === 'done' && <StatusResult type='success' title='Ready to vibe!' />}

      {/* Error */}
      {errorMessage && <StatusResult type='error' title='Error' detail={errorMessage} />}
    </CommandBox>
  );
}

// ============================================================================
// Render Function
// ============================================================================

export interface RenderInitOptions {
  checkProject: () => Promise<{ isInit: boolean; message: string; detail?: string }>;
  checkGit: () => Promise<{ ok: boolean; message: string; detail?: string }>;
  checkClaude: () => Promise<{ ok: boolean; message: string; detail?: string }>;
  getProjectFiles: () => Promise<ProjectFileInfo[]>;
  createFiles: (files: Set<ProjectFile>) => Promise<{ ok: boolean; error?: { message: string } }>;
  vibeMode?: boolean;
  vibeSteps?: string[];
}

export async function renderInit(options: RenderInitOptions): Promise<ProjectFile[]> {
  let resolveComplete: (files: ProjectFile[]) => void;
  let rejectComplete: (error: string) => void;
  let wasCancelled = false;

  const completePromise = new Promise<ProjectFile[]>((resolve, reject) => {
    resolveComplete = resolve;
    rejectComplete = reject;
  });

  const { waitUntilExit } = await render(
    <InitScreen
      checkProject={options.checkProject}
      checkGit={options.checkGit}
      checkClaude={options.checkClaude}
      getProjectFiles={options.getProjectFiles}
      createFiles={options.createFiles}
      onComplete={(files: ProjectFile[]) => resolveComplete(files)}
      onCancel={() => {
        wasCancelled = true;
        resolveComplete([]);
      }}
      onError={(msg: string) => rejectComplete(msg)}
      vibeMode={options.vibeMode}
      vibeSteps={options.vibeSteps}
    />,
    { fullScreen: true },
  );

  await waitUntilExit();

  const _createdFiles = await completePromise;

  if (wasCancelled) {
    console.log('\nCancelled.');
    Deno.exit(0);
  }

  Deno.exit(0);
}
