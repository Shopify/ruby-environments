import * as assert from "assert";
import { suite, test } from "mocha";
import * as vscode from "vscode";
import { activateInternal, deactivate } from "../extension";

suite("Extension Test Suite", () => {
  type FakeContext = vscode.ExtensionContext & { dispose: () => void };

  function createContext() {
    const subscriptions: vscode.Disposable[] = [];

    return {
      subscriptions,
      dispose: () => {
        subscriptions.forEach((subscription) => {
          subscription.dispose();
        });
      },
    } as unknown as FakeContext;
  }

  suite("selectRubyVersion command", () => {
    test("command is registered", async () => {
      const mockContext = createContext();
      activateInternal(mockContext);

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
