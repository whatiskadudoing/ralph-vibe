/**
 * @module services/usage_service
 *
 * Fetches Claude Code subscription usage from Anthropic API.
 * Uses OAuth credentials stored in macOS Keychain.
 */

import { err, ok, type Result } from '@/utils/result.ts';

// ============================================================================
// Types
// ============================================================================

export interface UsageWindow {
  readonly utilization: number; // Percentage (0-100)
  readonly resetsAt: Date;
}

export interface SubscriptionUsage {
  readonly fiveHour: UsageWindow;
  readonly sevenDay: UsageWindow;
  readonly sevenDaySonnet: UsageWindow | null;
}

export interface UsageError {
  readonly type: 'usage_error';
  readonly code: 'no_credentials' | 'api_error' | 'parse_error';
  readonly message: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Creates a UsageError.
 */
const usageError = (code: UsageError['code'], message: string): UsageError => ({
  type: 'usage_error',
  code,
  message,
});

/**
 * Gets Claude Code OAuth credentials from macOS Keychain.
 */
const getCredentials = async (): Promise<Result<string, UsageError>> => {
  try {
    const command = new Deno.Command('security', {
      args: ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { success, stdout } = await command.output();
    if (!success) {
      return err(usageError('no_credentials', 'Claude Code credentials not found in Keychain'));
    }

    const json = new TextDecoder().decode(stdout).trim();
    const data = JSON.parse(json);
    const token = data?.claudeAiOauth?.accessToken;

    if (!token) {
      return err(usageError('no_credentials', 'No OAuth token found in credentials'));
    }

    return ok(token);
  } catch (e) {
    return err(
      usageError('no_credentials', e instanceof Error ? e.message : 'Failed to get credentials'),
    );
  }
};

/**
 * Fetches subscription usage from Anthropic API.
 */
export const getSubscriptionUsage = async (): Promise<Result<SubscriptionUsage, UsageError>> => {
  const credResult = await getCredentials();
  if (!credResult.ok) return credResult;

  try {
    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      headers: {
        'Authorization': `Bearer ${credResult.value}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });

    if (!response.ok) {
      return err(usageError('api_error', `API returned ${response.status}`));
    }

    const data = await response.json();

    const parseWindow = (w: unknown): UsageWindow | null => {
      if (!w || typeof w !== 'object') return null;
      const obj = w as Record<string, unknown>;
      if (typeof obj.utilization !== 'number') return null;
      return {
        utilization: obj.utilization,
        resetsAt: new Date(obj.resets_at as string),
      };
    };

    const fiveHour = parseWindow(data.five_hour);
    const sevenDay = parseWindow(data.seven_day);

    if (!fiveHour || !sevenDay) {
      return err(usageError('parse_error', 'Invalid usage data format'));
    }

    return ok({
      fiveHour,
      sevenDay,
      sevenDaySonnet: parseWindow(data.seven_day_sonnet),
    });
  } catch (e) {
    return err(usageError('api_error', e instanceof Error ? e.message : 'Failed to fetch usage'));
  }
};

/**
 * Formats a usage window for display.
 */
export const formatUsageWindow = (window: UsageWindow): string => {
  const pct = Math.round(window.utilization);
  const resetTime = formatResetTime(window.resetsAt);
  return `${pct}% (resets ${resetTime})`;
};

/**
 * Formats reset time as relative time.
 */
const formatResetTime = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) return 'soon';
  if (diffMins < 60) return `in ${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `in ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `in ${diffDays}d`;
};

/**
 * Formats subscription usage for compact display.
 */
export const formatSubscriptionUsage = (usage: SubscriptionUsage): string => {
  const fiveHr = Math.round(usage.fiveHour.utilization);
  const sevenDay = Math.round(usage.sevenDay.utilization);
  return `5h: ${fiveHr}% · 7d: ${sevenDay}%`;
};
