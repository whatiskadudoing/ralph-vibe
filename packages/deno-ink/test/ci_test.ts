// Tests for CI environment detection
// This feature detects CI environments and disables raw mode
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { isCI, shouldUseColors, isInteractive } from "../src/ci.ts";

// Helper to temporarily set an env variable
function withEnv(key: string, value: string, fn: () => void): void {
  const original = Deno.env.get(key);
  Deno.env.set(key, value);
  try {
    fn();
  } finally {
    if (original !== undefined) {
      Deno.env.set(key, original);
    } else {
      Deno.env.delete(key);
    }
  }
}

// Helper to temporarily delete an env variable
function withoutEnv(key: string, fn: () => void): void {
  const original = Deno.env.get(key);
  Deno.env.delete(key);
  try {
    fn();
  } finally {
    if (original !== undefined) {
      Deno.env.set(key, original);
    }
  }
}

Deno.test("ci: detects CI environment from CI env variable", () => {
  withEnv("CI", "true", () => {
    assertEquals(isCI(), true);
  });
});

Deno.test("ci: detects GitHub Actions", () => {
  withEnv("GITHUB_ACTIONS", "true", () => {
    assertEquals(isCI(), true);
  });
});

Deno.test("ci: detects Travis CI", () => {
  withEnv("TRAVIS", "true", () => {
    assertEquals(isCI(), true);
  });
});

Deno.test("ci: detects CircleCI", () => {
  withEnv("CIRCLECI", "true", () => {
    assertEquals(isCI(), true);
  });
});

Deno.test("ci: detects Jenkins", () => {
  withEnv("JENKINS_URL", "http://jenkins.example.com", () => {
    assertEquals(isCI(), true);
  });
});

Deno.test("ci: detects GitLab CI", () => {
  withEnv("GITLAB_CI", "true", () => {
    assertEquals(isCI(), true);
  });
});

Deno.test("ci: detects Buildkite", () => {
  withEnv("BUILDKITE", "true", () => {
    assertEquals(isCI(), true);
  });
});

Deno.test("ci: shouldUseColors respects FORCE_COLOR", () => {
  withEnv("FORCE_COLOR", "1", () => {
    assertEquals(shouldUseColors(), true);
  });
});

Deno.test("ci: shouldUseColors respects NO_COLOR", () => {
  withEnv("NO_COLOR", "1", () => {
    assertEquals(shouldUseColors(), false);
  });
});

Deno.test("ci: isInteractive returns false in CI", () => {
  withEnv("CI", "true", () => {
    assertEquals(isInteractive(), false);
  });
});
