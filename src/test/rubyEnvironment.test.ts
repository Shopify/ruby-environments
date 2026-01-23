import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import { RubyEnvironmentManager } from "../rubyEnvironment";
import { FakeContext, createContext } from "./helpers";
import { RubyChangeEvent } from "../types";

suite("RubyEnvironmentManager", () => {
  let context: FakeContext;
  let manager: RubyEnvironmentManager;

  beforeEach(() => {
    context = createContext();
  });

  afterEach(async () => {
    context.dispose();
    // Clean up any configuration changes
    const config = vscode.workspace.getConfiguration("rubyEnvironments");
    await config.update("rubyPath", undefined, vscode.ConfigurationTarget.Global);
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

    test("returns Ruby definition after activation", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      manager = new RubyEnvironmentManager(context);
      await manager.activate(undefined);

      const ruby = manager.getRuby();
      assert.ok(ruby !== null, "Should return Ruby definition after activation");
      if (ruby !== null) {
        assert.strictEqual(ruby.error, true, "Should return error for mock ruby path");
      }
    });

    test("returns Ruby definition from workspace state after activation", async () => {
      await context.workspaceState.update("rubyPath", "/custom/ruby/path");
      manager = new RubyEnvironmentManager(context);
      await manager.activate(undefined);

      const ruby = manager.getRuby();
      assert.ok(ruby !== null, "Should return Ruby definition");
      if (ruby !== null) {
        assert.strictEqual(ruby.error, true, "Should return error state for configured path");
      }
    });
  });

  suite("activate", () => {
    test("initializes Ruby definition", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      manager = new RubyEnvironmentManager(context);
      assert.strictEqual(manager.getRuby(), null, "Should be null before activation");

      await manager.activate(undefined);

      const ruby = manager.getRuby();
      assert.ok(ruby !== null, "Should have Ruby definition after activation");
      if (ruby !== null) {
        assert.strictEqual(ruby.error, true, "Should return error for mock ruby path");
      }
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

      manager = new RubyEnvironmentManager(context);

      let eventFired = false;
      let receivedEvent: RubyChangeEvent | undefined;
      const disposable = manager.onDidRubyChange((event) => {
        eventFired = true;
        receivedEvent = event;
      });

      await manager.activate(undefined);

      assert.strictEqual(eventFired, true, "Event should have fired after activation");
      assert.ok(receivedEvent, "Event data should be received");
      assert.strictEqual(receivedEvent.workspace, undefined, "Workspace should be undefined");
      assert.ok(receivedEvent.ruby !== null, "Ruby should be defined when configured");

      disposable.dispose();
    });

    test("fires when configuration changes after activation", async () => {
      manager = new RubyEnvironmentManager(context);
      await manager.activate(undefined);

      let eventCount = 0;
      const disposable = manager.onDidRubyChange(() => {
        eventCount++;
      });

      // Trigger configuration change
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/test/ruby/path", vscode.ConfigurationTarget.Global);

      // Wait a bit for the event to fire
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(eventCount > 0, "Event should have fired when configuration changed");

      disposable.dispose();
    });

    test("includes workspace in event from workspaceFolders", async () => {
      manager = new RubyEnvironmentManager(context);

      let receivedEvent: RubyChangeEvent | undefined;
      const disposable = manager.onDidRubyChange((event) => {
        receivedEvent = event;
      });

      const mockWorkspace = {
        uri: vscode.Uri.file("/test/workspace"),
        name: "test-workspace",
        index: 0,
      } as vscode.WorkspaceFolder;

      await manager.activate(mockWorkspace);

      assert.ok(receivedEvent, "Event should have been received");
      assert.strictEqual(receivedEvent.workspace, mockWorkspace, "Workspace should match");

      disposable.dispose();
    });
  });

  suite("configuration changes", () => {
    test("updates Ruby definition when workspace state changes after activation", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      manager = new RubyEnvironmentManager(context);
      await manager.activate(undefined);

      const initialRuby = manager.getRuby();
      assert.ok(initialRuby !== null, "Initial Ruby should be defined after activation");

      // Dispose the first manager before creating a new one
      context.dispose();
      context = createContext();

      // Simulate workspace state change by creating a new manager with updated state
      await context.workspaceState.update("rubyPath", "/new/ruby/path");
      const newManager = new RubyEnvironmentManager(context);
      await newManager.activate(undefined);

      const updatedRuby = newManager.getRuby();
      assert.ok(updatedRuby, "Updated Ruby should be defined after activation");
    });
  });
});
