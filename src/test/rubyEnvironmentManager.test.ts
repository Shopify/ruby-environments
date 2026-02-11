import * as assert from "assert";
import * as vscode from "vscode";
import sinon from "sinon";
import { suite, test, beforeEach, afterEach } from "mocha";
import { RubyEnvironmentManager } from "../rubyEnvironmentManager";
import * as helpers from "./helpers";
import { RubyChangeEvent } from "../types";

suite("RubyEnvironmentManager", () => {
  let context: helpers.FakeContext;
  let manager: RubyEnvironmentManager;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    context = helpers.createContext();
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

      const ruby = manager.getRuby(undefined);
      assert.strictEqual(ruby, null, "Should return null before activation");
    });
  });

  suite("activate", () => {
    test("does not set Ruby definition if not configured", async () => {
      manager = new RubyEnvironmentManager(context);
      await manager.activate();

      const ruby = manager.getRuby(undefined);
      assert.strictEqual(ruby, null, "Should return null if not configured");
    });

    test("activates specific workspace when provided", async () => {
      const workspace1 = helpers.createTestWorkspace();
      const workspace2 = {
        uri: vscode.Uri.file("/test/workspace2"),
        name: "test2",
        index: 1,
      };

      // Set up configuration for workspace1
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const _execStub = helpers.stubAsyncExec(sandbox);
      sandbox.stub(vscode.workspace, "workspaceFolders").value([workspace1, workspace2]);

      manager = new RubyEnvironmentManager(context);

      // Activate only workspace2
      await manager.activateWorkspace(workspace2);

      // workspace2 should be activated
      const ruby2 = manager.getRuby(workspace2);
      assert.ok(ruby2 !== null, "workspace2 should have Ruby environment");

      // workspace1 should NOT be activated yet
      const ruby1 = manager.getRuby(workspace1);
      assert.strictEqual(ruby1, null, "workspace1 should not be activated yet");
    });

    test("initializes Ruby definition from configuration", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const workspaceFolder = helpers.createTestWorkspace();
      const execStub = helpers.stubAsyncExec(sandbox);

      // Stub workspace folders so the manager sees our test workspace
      sandbox.stub(vscode.workspace, "workspaceFolders").value([workspaceFolder]);

      manager = new RubyEnvironmentManager(context);
      await manager.activate();

      const expectedCommand = helpers.buildExpectedCommand(context, "/usr/bin/ruby");
      const shell = helpers.getExpectedShell();

      assert.ok(
        execStub.calledOnceWithExactly(expectedCommand, {
          cwd: workspaceFolder.uri.fsPath,
          shell,
          env: process.env,
        }),
        `Expected asyncExec to be called with correct arguments`,
      );

      const ruby = manager.getRuby(workspaceFolder);
      helpers.assertRubyDefinition(ruby);
    });

    test("initializes Ruby definition from workspace state", async () => {
      const workspaceFolder = helpers.createTestWorkspace();
      await context.workspaceState.update(`rubyPath:${workspaceFolder.uri.toString()}`, "/custom/ruby/path");

      const execStub = helpers.stubAsyncExec(sandbox);

      // Stub workspace folders so the manager sees our test workspace
      sandbox.stub(vscode.workspace, "workspaceFolders").value([workspaceFolder]);

      manager = new RubyEnvironmentManager(context);
      await manager.activate();

      const expectedCommand = helpers.buildExpectedCommand(context, "/custom/ruby/path");
      const shell = helpers.getExpectedShell();

      assert.ok(
        execStub.calledOnceWithExactly(expectedCommand, {
          cwd: workspaceFolder.uri.fsPath,
          shell,
          env: process.env,
        }),
        `Expected asyncExec to be called with correct arguments`,
      );

      const ruby = manager.getRuby(workspaceFolder);
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

      const workspaceFolder = helpers.createTestWorkspace();
      const execStub = helpers.stubAsyncExec(sandbox);

      // Stub workspace folders so the manager sees our test workspace
      sandbox.stub(vscode.workspace, "workspaceFolders").value([workspaceFolder]);

      manager = new RubyEnvironmentManager(context);

      let eventFired = false;
      let receivedEvent: RubyChangeEvent | undefined;
      const disposable = manager.onDidRubyChange((event) => {
        eventFired = true;
        receivedEvent = event;
      });

      await manager.activate();

      const expectedCommand = helpers.buildExpectedCommand(context, "/usr/bin/ruby");
      const shell = helpers.getExpectedShell();

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

      helpers.assertRubyDefinition(receivedEvent.ruby);

      disposable.dispose();
    });

    test("fires when configuration changes after activation", async () => {
      manager = new RubyEnvironmentManager(context);
      await manager.activate();

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
