import * as vscode from "vscode";
import * as assert from "assert";
import sinon from "sinon";
import * as common from "../common";
import { ACTIVATION_SEPARATOR, FIELD_SEPARATOR, VALUE_SEPARATOR } from "../rubyEnvironment";
import { JitType, OptionalRubyDefinition } from "../types";

/**
 * A fake extension context for testing that includes workspace state management
 * and a dispose method for cleanup.
 *
 * Use this type when creating test contexts with {@link createContext}.
 */
export type FakeContext = vscode.ExtensionContext & { dispose: () => void };

/**
 * Creates a mock workspace folder for testing.
 *
 * Returns a minimal workspace folder object with:
 * - uri: /test/workspace
 * - name: "test"
 * - index: 0
 *
 * @returns A mock workspace folder suitable for testing
 *
 * @example
 * ```typescript
 * const workspace = createTestWorkspace();
 * const context = WorkspaceContext.fromWorkspaceFolder(workspace);
 * ```
 */
export function createTestWorkspace(): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file("/test/workspace"),
    name: "test",
    index: 0,
  };
}

/**
 * Creates a fake extension context for testing with workspace state management.
 *
 * The returned context includes:
 * - A subscriptions array for tracking disposables
 * - A workspace state storage backed by a Map
 * - An extensionUri pointing to the project root
 * - A dispose() method for cleanup
 *
 * Always call dispose() after tests to prevent memory leaks.
 *
 * @returns A fake extension context with full workspace state support
 *
 * @example
 * ```typescript
 * let context: FakeContext;
 *
 * beforeEach(() => {
 *   context = createContext();
 * });
 *
 * afterEach(() => {
 *   context.dispose();
 * });
 * ```
 */
export function createContext(): FakeContext {
  const subscriptions: vscode.Disposable[] = [];
  const workspaceStateStorage = new Map<string, unknown>();

  return {
    subscriptions,
    extensionUri: vscode.Uri.file(__dirname + "/../.."),
    workspaceState: {
      get: <T>(key: string): T | undefined => {
        return workspaceStateStorage.get(key) as T | undefined;
      },
      update: (key: string, value: unknown): Thenable<void> => {
        workspaceStateStorage.set(key, value);
        return Promise.resolve();
      },
      keys: () => Array.from(workspaceStateStorage.keys()),
    },
    dispose: () => {
      subscriptions.forEach((subscription) => {
        subscription.dispose();
      });
    },
  } as unknown as FakeContext;
}

/**
 * Creates a mock Ruby activation response string with default values.
 *
 * The response includes:
 * - Ruby version: 3.3.0
 * - Gem paths: /path/to/gems, /another/path
 * - YJIT enabled: true
 * - Environment variables: PATH=/usr/bin, HOME=/home/user
 *
 * Use this when you need a standard Ruby activation response for testing.
 * For custom responses, manually construct the string using the same format.
 *
 * @returns A properly formatted Ruby activation response string
 *
 * @example
 * ```typescript
 * const response = createMockRubyResponse();
 * stubAsyncExec(sandbox, response);
 * ```
 */
export function createMockRubyResponse(): string {
  return [
    "3.3.0",
    "/path/to/gems,/another/path",
    "true",
    `PATH${VALUE_SEPARATOR}/usr/bin`,
    `HOME${VALUE_SEPARATOR}/home/user`,
  ].join(FIELD_SEPARATOR);
}

/**
 * Stubs the asyncExec function to return a mock Ruby activation response.
 *
 * If no response is provided, uses {@link createMockRubyResponse} to generate
 * a default response with standard Ruby configuration.
 *
 * The stub wraps the response with activation separators to match the actual
 * activation script output format.
 *
 * @param sandbox - The Sinon sandbox for managing stubs
 * @param response - Optional custom Ruby activation response string
 * @returns A Sinon stub for asyncExec that can be used for assertions
 *
 * @example
 * ```typescript
 * // Use default response
 * const execStub = stubAsyncExec(sandbox);
 *
 * // Use custom response
 * const customResponse = "3.2.0" + FIELD_SEPARATOR + "/custom/gems" + ...;
 * stubAsyncExec(sandbox, customResponse);
 * ```
 */
export function stubAsyncExec(sandbox: sinon.SinonSandbox, response?: string): sinon.SinonStub {
  const envStub = response || createMockRubyResponse();
  return sandbox.stub(common, "asyncExec").resolves({
    stdout: "",
    stderr: `${ACTIVATION_SEPARATOR}${envStub}${ACTIVATION_SEPARATOR}`,
  });
}

/**
 * Builds the expected Ruby activation command string for verification.
 *
 * Constructs the command that should be passed to asyncExec when activating
 * a Ruby environment. The command includes:
 * - The Ruby interpreter path
 * - Warning suppression (-W0)
 * - UTF-8 encoding (-EUTF-8:UTF-8)
 * - The activation script path
 *
 * Use this to verify that asyncExec was called with the correct command.
 *
 * @param context - The extension context containing the extension URI
 * @param rubyPath - The path to the Ruby interpreter
 * @returns The expected command string for Ruby activation
 *
 * @example
 * ```typescript
 * const execStub = stubAsyncExec(sandbox);
 * await rubyEnv.activate();
 *
 * const expectedCommand = buildExpectedCommand(context, "/usr/bin/ruby");
 * assert.ok(execStub.calledWith(expectedCommand));
 * ```
 */
export function buildExpectedCommand(context: FakeContext, rubyPath: string): string {
  const activationUri = vscode.Uri.joinPath(context.extensionUri, "activation.rb");
  return `${rubyPath} -W0 -EUTF-8:UTF-8 '${activationUri.fsPath}'`;
}

/**
 * Gets the expected shell value for the current platform.
 *
 * Returns:
 * - undefined on Windows (uses default Windows shell)
 * - vscode.env.shell on Unix-like systems (bash, zsh, etc.)
 *
 * Use this when verifying asyncExec was called with the correct shell option.
 *
 * @returns The expected shell path or undefined for Windows
 *
 * @example
 * ```typescript
 * const shell = getExpectedShell();
 * assert.ok(execStub.calledWithMatch(sinon.match.any, { shell }));
 * ```
 */
export function getExpectedShell(): string | undefined {
  return common.isWindows() ? undefined : vscode.env.shell;
}

/**
 * Asserts that a Ruby definition matches expected values.
 *
 * Verifies the Ruby definition object returned from Ruby environment activation,
 * checking:
 * - The definition is not null
 * - error flag is false
 * - Ruby version matches expected value
 * - Available JITs match expected array
 * - Gem paths match expected array
 * - Environment variables match expected values
 *
 * All parameters are optional and default to standard test values:
 * - rubyVersion: "3.3.0"
 * - availableJITs: [JitType.YJIT]
 * - gemPath: ["/path/to/gems", "/another/path"]
 * - envVars: { PATH: "/usr/bin", HOME: "/home/user" }
 *
 * @param ruby - The Ruby definition to assert against
 * @param expected - Optional object with expected values to override defaults
 * @param expected.rubyVersion - Expected Ruby version string
 * @param expected.availableJITs - Expected array of JIT types
 * @param expected.gemPath - Expected array of gem paths
 * @param expected.envVars - Expected environment variable key-value pairs
 *
 * @example
 * ```typescript
 * // Assert with default values
 * const ruby = rubyEnv.getRuby();
 * assertRubyDefinition(ruby);
 *
 * // Assert with custom version
 * assertRubyDefinition(ruby, { rubyVersion: "3.2.0" });
 *
 * // Assert with multiple custom values
 * assertRubyDefinition(ruby, {
 *   rubyVersion: "3.1.0",
 *   availableJITs: [],
 *   gemPath: ["/custom/gems"]
 * });
 * ```
 */
export function assertRubyDefinition(
  ruby: OptionalRubyDefinition,
  expected: {
    rubyVersion?: string;
    availableJITs?: JitType[];
    gemPath?: string[];
    envVars?: Record<string, string>;
  } = {},
): void {
  const {
    rubyVersion = "3.3.0",
    availableJITs = [JitType.YJIT],
    gemPath = ["/path/to/gems", "/another/path"],
    envVars = { PATH: "/usr/bin", HOME: "/home/user" },
  } = expected;

  assert.ok(ruby !== null, "Should return Ruby definition");
  assert.strictEqual(ruby.error, false);
  assert.strictEqual(ruby.rubyVersion, rubyVersion);
  assert.deepStrictEqual(ruby.availableJITs, availableJITs);
  assert.deepStrictEqual(ruby.gemPath, gemPath);

  for (const [key, value] of Object.entries(envVars)) {
    assert.strictEqual(ruby.env?.[key], value, `Expected env.${key} to be ${value}`);
  }
}
