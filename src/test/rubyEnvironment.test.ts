import * as assert from "assert";
import * as vscode from "vscode";
import sinon from "sinon";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as common from "../common";
import { ACTIVATION_SEPARATOR, FIELD_SEPARATOR, RubyEnvironmentManager, VALUE_SEPARATOR } from "../rubyEnvironment";
import { FakeContext, createContext } from "./helpers";
import { JitType, OptionalRubyDefinition, RubyChangeEvent } from "../types";

// Test helpers
function createTestWorkspace(): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file("/test/workspace"),
    name: "test",
    index: 0,
  };
}

function createMockRubyResponse(): string {
  return [
    "3.3.0",
    "/path/to/gems,/another/path",
    "true",
    `PATH${VALUE_SEPARATOR}/usr/bin`,
    `HOME${VALUE_SEPARATOR}/home/user`,
  ].join(FIELD_SEPARATOR);
}

function stubAsyncExec(sandbox: sinon.SinonSandbox, response?: string): sinon.SinonStub {
  const envStub = response || createMockRubyResponse();
  return sandbox.stub(common, "asyncExec").resolves({
    stdout: "",
    stderr: `${ACTIVATION_SEPARATOR}${envStub}${ACTIVATION_SEPARATOR}`,
  });
}

function buildExpectedCommand(context: FakeContext, rubyPath: string): string {
  const activationUri = vscode.Uri.joinPath(context.extensionUri, "activation.rb");
  return `${rubyPath} -W0 -EUTF-8:UTF-8 '${activationUri.fsPath}'`;
}

function getExpectedShell(): string | undefined {
  return common.isWindows() ? undefined : vscode.env.shell;
}

function assertRubyDefinition(ruby: OptionalRubyDefinition): void {
  assert.ok(ruby !== null, "Should return Ruby definition");
  assert.strictEqual(ruby.error, false);
  assert.strictEqual(ruby.rubyVersion, "3.3.0");
  assert.deepStrictEqual(ruby.availableJITs, [JitType.YJIT]);
  assert.deepStrictEqual(ruby.gemPath, ["/path/to/gems", "/another/path"]);
  assert.strictEqual(ruby.env?.PATH, "/usr/bin");
  assert.strictEqual(ruby.env?.HOME, "/home/user");
}

suite("RubyEnvironmentManager", () => {
  let context: FakeContext;
  let manager: RubyEnvironmentManager;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    context = createContext();
    sandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    context.dispose();
    // Clean up any configuration changes
    const config = vscode.workspace.getConfiguration("rubyEnvironments");
    await config.update("rubyPath", undefined, vscode.ConfigurationTarget.Global);
    sandbox.restore();
  });

  suite("constructor", () => {
    test("registers subscriptions", () => {
      const initialSubscriptions = context.subscriptions.length;
      manager = new RubyEnvironmentManager(context);

      assert.ok(context.subscriptions.length > initialSubscriptions, "Manager should register subscriptions");
    });

    test("registers selectRuby command", async () => {
      manager = new RubyEnvironmentManager(context);

      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes("ruby-environments.selectRuby"), "Command should be registered");
    });
  });

  suite("getRuby", () => {
    test("returns null before activation", () => {
      manager = new RubyEnvironmentManager(context);

      const ruby = manager.getRuby();
      assert.strictEqual(ruby, null, "Should return null before activation");
    });
  });

  suite("activate", () => {
    test("does not set Ruby definition if not configured", async () => {
      manager = new RubyEnvironmentManager(context);
      await manager.activate(undefined);

      const ruby = manager.getRuby();
      assert.strictEqual(ruby, null, "Should return null if not configured");
    });

    test("initializes Ruby definition from configuration", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const workspaceFolder = createTestWorkspace();
      const execStub = stubAsyncExec(sandbox);

      manager = new RubyEnvironmentManager(context);
      await manager.activate(workspaceFolder);

      const expectedCommand = buildExpectedCommand(context, "/usr/bin/ruby");
      const shell = getExpectedShell();

      assert.ok(
        execStub.calledOnceWithExactly(expectedCommand, {
          cwd: workspaceFolder.uri.fsPath,
          shell,
          env: process.env,
        }),
        `Expected asyncExec to be called with correct arguments`,
      );

      const ruby = manager.getRuby();
      assertRubyDefinition(ruby);
    });

    test("initializes Ruby definition from workspace state", async () => {
      await context.workspaceState.update("rubyPath", "/custom/ruby/path");
      manager = new RubyEnvironmentManager(context);

      const workspaceFolder = createTestWorkspace();
      const execStub = stubAsyncExec(sandbox);

      await manager.activate(workspaceFolder);

      const expectedCommand = buildExpectedCommand(context, "/custom/ruby/path");
      const shell = getExpectedShell();

      assert.ok(
        execStub.calledOnceWithExactly(expectedCommand, {
          cwd: workspaceFolder.uri.fsPath,
          shell,
          env: process.env,
        }),
        `Expected asyncExec to be called with correct arguments`,
      );

      const ruby = manager.getRuby();
      assert.ok(ruby !== null, "Should return Ruby definition");
      assert.strictEqual(ruby.error, false);
    });
  });

  suite("onDidRubyChange", () => {
    test("is an event that can be subscribed to", () => {
      manager = new RubyEnvironmentManager(context);

      let eventFired = false;
      const disposable = manager.onDidRubyChange(() => {
        eventFired = true;
      });

      assert.ok(disposable, "onDidRubyChange should return a disposable");
      assert.strictEqual(typeof disposable.dispose, "function", "disposable should have a dispose method");

      disposable.dispose();
      assert.strictEqual(eventFired, false, "event should not have fired yet");
    });

    test("fires when activate is called", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const workspaceFolder = createTestWorkspace();
      const execStub = stubAsyncExec(sandbox);

      manager = new RubyEnvironmentManager(context);

      let eventFired = false;
      let receivedEvent: RubyChangeEvent | undefined;
      const disposable = manager.onDidRubyChange((event) => {
        eventFired = true;
        receivedEvent = event;
      });

      await manager.activate(workspaceFolder);

      const expectedCommand = buildExpectedCommand(context, "/usr/bin/ruby");
      const shell = getExpectedShell();

      assert.ok(
        execStub.calledOnceWithExactly(expectedCommand, {
          cwd: workspaceFolder.uri.fsPath,
          shell,
          env: process.env,
        }),
        `Expected asyncExec to be called with correct arguments`,
      );

      assert.strictEqual(eventFired, true, "Event should have fired after activation");
      assert.ok(receivedEvent, "Event data should be received");
      assert.strictEqual(receivedEvent.workspace, workspaceFolder, "Workspace should match");

      assertRubyDefinition(receivedEvent.ruby);

      disposable.dispose();
    });

    test("fires when configuration changes after activation", async () => {
      manager = new RubyEnvironmentManager(context);
      await manager.activate(undefined);

      const eventPromise = new Promise<void>((resolve) => {
        manager.onDidRubyChange(() => {
          resolve();
        });
      });

      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Event did not fire within timeout")), 100);
      });

      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/test/ruby/path", vscode.ConfigurationTarget.Global);

      await Promise.race([eventPromise, timeoutPromise]);

      assert.ok(true, "Event fired when configuration changed");
    });
  });
});
