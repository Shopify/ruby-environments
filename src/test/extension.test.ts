import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import { activate, deactivate } from "../extension";
import * as helpers from "./helpers";
import { RubyEnvironmentsApi } from "../types";

suite("Extension Test Suite", () => {
  suite("activate", () => {
    let context: helpers.FakeContext;

    beforeEach(() => {
      context = helpers.createContext();
    });

    afterEach(() => {
      context.dispose();
    });

    test("returns an object implementing RubyEnvironmentsApi", async () => {
      const api: RubyEnvironmentsApi = await activate(context);

      assert.strictEqual(typeof api, "object", "activate should return an object");
      assert.strictEqual(typeof api.activate, "function", "API should have an activate method");
      assert.strictEqual(typeof api.activateWorkspace, "function", "API should have an activateWorkspace method");
      assert.strictEqual(typeof api.getRuby, "function", "API should have a getRuby method");
      assert.strictEqual(typeof api.onDidRubyChange, "function", "API should have an onDidRubyChange event");

      // Test that activate returns a Promise
      const activatePromise = api.activate();
      assert.ok(activatePromise instanceof Promise, "activate should return a Promise");

      // Test that activateWorkspace accepts workspace folder parameter and returns a Promise
      const activateWorkspacePromise = api.activateWorkspace(undefined);
      assert.ok(activateWorkspacePromise instanceof Promise, "activateWorkspace should return a Promise");

      // Test that getRuby accepts workspace folder parameter
      const ruby = api.getRuby(undefined);
      assert.ok(ruby === null || typeof ruby === "object", "getRuby should return null or an object");
    });

    test("returned API conforms to RubyEnvironmentsApi interface", async () => {
      const api = await activate(context);

      const typedApi: RubyEnvironmentsApi = api;
      assert.ok(typedApi, "API should conform to RubyEnvironmentsApi interface");
    });

    test("registers emitter, status, config watcher, workspace watcher, and command subscriptions", async () => {
      assert.strictEqual(context.subscriptions.length, 0, "subscriptions should be empty initially");

      await activate(context);

      assert.strictEqual(
        context.subscriptions.length,
        5,
        "Extension should register five subscriptions (emitter, status, config watcher, workspace watcher, and command)",
      );
    });
  });

  suite("selectRuby command", () => {
    test("command is registered", async () => {
      const mockContext = helpers.createContext();
      await activate(mockContext);

      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes("ruby-environments.selectRuby"), "Command should be registered");

      mockContext.dispose();
    });
  });

  suite("deactivate", () => {
    test("can be called without errors", () => {
      assert.doesNotThrow(() => {
        deactivate();
      }, "deactivate should not throw errors");
    });
  });
});
