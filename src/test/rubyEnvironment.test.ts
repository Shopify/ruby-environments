import * as assert from "assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as vscode from "vscode";
import { RubyEnvironment } from "../rubyEnvironment";
import { FakeContext, createContext } from "./helpers";

suite("RubyEnvironment Test Suite", () => {
  function createMockLogger(): vscode.LogOutputChannel {
    return {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      trace: () => {},
    } as unknown as vscode.LogOutputChannel;
  }

  suite("RubyEnvironment", () => {
    let context: FakeContext;
    let mockLogger: vscode.LogOutputChannel;

    beforeEach(() => {
      context = createContext();
      mockLogger = createMockLogger();
    });

    afterEach(() => {
      context.dispose();
    });

    test("returns an API object with activate and getRuby methods", () => {
      const rubyEnvironment = new RubyEnvironment(context, mockLogger);

      assert.ok(rubyEnvironment, "RubyEnvironment should be defined");
      assert.strictEqual(typeof rubyEnvironment.activate, "function", "activate should be a function");
      assert.strictEqual(typeof rubyEnvironment.getRuby, "function", "getRuby should be a function");
    });

    suite("activate", () => {
      test("registers config watcher, status item, and command subscriptions", async () => {
        const rubyEnvironment = new RubyEnvironment(context, mockLogger);

        await rubyEnvironment.activate();

        assert.strictEqual(
          context.subscriptions.length,
          3,
          "Extension should register three subscriptions (status item, config watcher, and command)",
        );
      });

      test("registers selectRubyVersion command", async () => {
        const rubyEnvironment = new RubyEnvironment(context, mockLogger);

        await rubyEnvironment.activate();

        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes("ruby-environments.selectRubyVersion"), "Command should be registered");
      });
    });

    test("returns initial Ruby definition from configuration", () => {
      const rubyEnvironment = new RubyEnvironment(context, mockLogger);

      const result = rubyEnvironment.getRuby();

      // Since no configuration is set in tests, it should return null
      assert.strictEqual(result, null, "getRuby should return null when no configuration is set");
    });
  });
});
