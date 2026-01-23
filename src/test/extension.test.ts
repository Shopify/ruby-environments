import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import { activate, deactivate } from "../extension";
import { FakeContext, createContext } from "./helpers";
import { RubyEnvironmentsApi } from "../types";

suite("Extension Test Suite", () => {
  suite("activate", () => {
    let context: FakeContext;

    beforeEach(() => {
      context = createContext();
    });

    afterEach(() => {
      context.dispose();
    });

    test("returns an object implementing RubyEnvironmentsApi", async () => {
      const api = activate(context);

      assert.strictEqual(typeof api, "object", "activate should return an object");
      assert.strictEqual(typeof api.activate, "function", "API should have an activate method");
      assert.strictEqual(typeof api.getRuby, "function", "API should have a getRuby method");
      assert.strictEqual(typeof api.onDidRubyChange, "function", "API should have an onDidRubyChange event");

      const result = api.activate(undefined);
      assert.ok(result instanceof Promise, "activate should return a Promise");
      await result;
    });

    test("returned API conforms to RubyEnvironmentsApi interface", () => {
      const api = activate(context);

      const typedApi: RubyEnvironmentsApi = api;
      assert.ok(typedApi, "API should conform to RubyEnvironmentsApi interface");
    });

    test("getRuby returns null initially", () => {
      const api = activate(context);

      assert.strictEqual(api.getRuby(), null, "getRuby should return null before activation");
    });

    test("onDidRubyChange allows subscribing to events", () => {
      const api = activate(context);

      let eventFired = false;
      const disposable = api.onDidRubyChange(() => {
        eventFired = true;
      });

      assert.ok(disposable, "onDidRubyChange should return a disposable");
      assert.strictEqual(typeof disposable.dispose, "function", "disposable should have a dispose method");

      disposable.dispose();
      assert.strictEqual(eventFired, false, "event should not have fired yet");
    });

    test("registers emitter, status, config watcher, and command subscriptions", () => {
      assert.strictEqual(context.subscriptions.length, 0, "subscriptions should be empty initially");

      activate(context);

      assert.strictEqual(
        context.subscriptions.length,
        4,
        "Extension should register four subscriptions (emitter, status, config watcher, and command)",
      );
    });
  });

  suite("selectRubyVersion command", () => {
    test("command is registered", async () => {
      const mockContext = createContext();
      activate(mockContext);

      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes("ruby-environments.selectRubyVersion"), "Command should be registered");

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
