import * as assert from "assert";
import { beforeEach, afterEach } from "mocha";
import * as vscode from "vscode";
import sinon from "sinon";
import { ConfiguredRuby, WorkspaceInterface } from "../configuredRuby";
import * as common from "../common";
import { ACTIVATION_SEPARATOR, FIELD_SEPARATOR, VALUE_SEPARATOR } from "../configuredRuby";
import { JitType } from "../types";

// Re-export the constants for testing
export { ACTIVATION_SEPARATOR, FIELD_SEPARATOR, VALUE_SEPARATOR };

type MockWorkspaceConfiguration = {
  get<T>(section: string, defaultValue?: T): T | undefined;
};

function createMockWorkspace(config: Record<string, unknown>): WorkspaceInterface {
  return {
    getConfiguration: (_section: string) =>
      ({
        get: <T>(key: string, defaultValue?: T): T | undefined => {
          const value = config[key];
          return value !== undefined ? (value as T) : defaultValue;
        },
      }) as MockWorkspaceConfiguration,
  };
}

function createMockLogger(): vscode.LogOutputChannel {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
  } as unknown as vscode.LogOutputChannel;
}

suite("ConfiguredRuby", () => {
  let versionManager: ConfiguredRuby;
  let mockContext: vscode.ExtensionContext;
  let mockLogger: vscode.LogOutputChannel;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Create a minimal mock context
    mockContext = {
      extensionUri: vscode.Uri.file(__dirname + "/../.."),
    } as vscode.ExtensionContext;
    mockLogger = createMockLogger();
  });

  afterEach(() => {
    sandbox.restore();
  });

  test("has correct identifier and name", () => {
    const mockWorkspace = createMockWorkspace({});
    versionManager = new ConfiguredRuby(mockWorkspace, mockContext, mockLogger);

    assert.strictEqual(versionManager.identifier, "configured");
    assert.strictEqual(versionManager.name, "Configured Ruby");
  });

  test("activate executes Ruby and returns result", async () => {
    const mockWorkspace = createMockWorkspace({
      rubyExecutablePath: "ruby",
    });
    const workspaceFolder = {
      uri: vscode.Uri.file("/test/workspace"),
      name: "test",
      index: 0,
    };
    versionManager = new ConfiguredRuby(mockWorkspace, mockContext, mockLogger, workspaceFolder);

    const envStub = [
      "3.3.0",
      "/path/to/gems,/another/path",
      "true",
      `PATH${VALUE_SEPARATOR}/usr/bin`,
      `HOME${VALUE_SEPARATOR}/home/user`,
    ].join(FIELD_SEPARATOR);

    const execStub = sandbox.stub(common, "asyncExec").resolves({
      stdout: "",
      stderr: `${ACTIVATION_SEPARATOR}${envStub}${ACTIVATION_SEPARATOR}`,
    });

    const result = await versionManager.activate();

    const activationUri = vscode.Uri.joinPath(mockContext.extensionUri, "activation.rb");
    const expectedCommand = `ruby -W0 -EUTF-8:UTF-8 '${activationUri.fsPath}'`;

    // We must not set the shell on Windows
    const shell = common.isWindows() ? undefined : vscode.env.shell;

    assert.ok(
      execStub.calledOnceWithExactly(expectedCommand, {
        cwd: workspaceFolder.uri.fsPath,
        shell,
        env: process.env,
      }),
      `Expected asyncExec to be called with correct arguments`,
    );

    assert.strictEqual(result.error, false);
    assert.strictEqual(result.rubyVersion, "3.3.0");
    assert.deepStrictEqual(result.availableJITs, [JitType.YJIT]);
    assert.deepStrictEqual(result.gemPath, ["/path/to/gems", "/another/path"]);
    assert.strictEqual(result.env?.PATH, "/usr/bin");
    assert.strictEqual(result.env?.HOME, "/home/user");
  });

  test("activate returns error when Ruby executable fails", async () => {
    const mockWorkspace = createMockWorkspace({
      rubyExecutablePath: "/nonexistent/ruby",
    });
    versionManager = new ConfiguredRuby(mockWorkspace, mockContext, mockLogger);

    sandbox.stub(common, "asyncExec").rejects(new Error("Command failed"));

    const result = await versionManager.activate();

    assert.strictEqual(result.error, true);
  });

  test("activate uses custom Ruby executable path", async () => {
    const mockWorkspace = createMockWorkspace({
      rubyExecutablePath: "/custom/path/to/ruby",
    });
    versionManager = new ConfiguredRuby(mockWorkspace, mockContext, mockLogger);

    const envStub = ["3.2.0", "/gems", "false"].join(FIELD_SEPARATOR);
    const execStub = sandbox.stub(common, "asyncExec").resolves({
      stdout: "",
      stderr: `${ACTIVATION_SEPARATOR}${envStub}${ACTIVATION_SEPARATOR}`,
    });

    await versionManager.activate();

    const activationUri = vscode.Uri.joinPath(mockContext.extensionUri, "activation.rb");
    const expectedCommand = `/custom/path/to/ruby -W0 -EUTF-8:UTF-8 '${activationUri.fsPath}'`;

    assert.ok(execStub.calledOnce);
    assert.ok(execStub.firstCall.args[0] === expectedCommand);
  });

  test("activate returns error when activation output is malformed", async () => {
    const mockWorkspace = createMockWorkspace({
      rubyExecutablePath: "ruby",
    });
    versionManager = new ConfiguredRuby(mockWorkspace, mockContext, mockLogger);

    sandbox.stub(common, "asyncExec").resolves({
      stdout: "",
      stderr: "Invalid output without separators",
    });

    const result = await versionManager.activate();

    assert.strictEqual(result.error, true);
  });
});
