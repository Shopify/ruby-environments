import * as assert from "assert";
import { suite, test } from "mocha";
import { WorkspaceContext } from "../workspaceContext";
import * as helpers from "./helpers";

suite("WorkspaceContext", () => {
  suite("fromWorkspaceFolder", () => {
    test("creates context from workspace folder", () => {
      const folder = helpers.createTestWorkspace();
      const context = WorkspaceContext.fromWorkspaceFolder(folder);

      assert.strictEqual(context.uri, folder.uri);
      assert.strictEqual(context.name, folder.name);
      assert.strictEqual(context.key, folder.uri.toString());
      assert.strictEqual(context.isDefault, false);
      assert.strictEqual(context.workspaceFolder, folder);
    });
  });

  suite("createDefault", () => {
    test("creates default context", () => {
      const context = WorkspaceContext.createDefault();

      assert.strictEqual(context.uri.fsPath, process.cwd());
      assert.strictEqual(context.name, "default");
      assert.strictEqual(context.key, "__default__");
      assert.strictEqual(context.isDefault, true);
      assert.strictEqual(context.workspaceFolder, undefined);
    });
  });

  suite("from", () => {
    test("creates workspace context from folder", () => {
      const folder = helpers.createTestWorkspace();
      const context = WorkspaceContext.from(folder);

      assert.strictEqual(context.uri, folder.uri);
      assert.strictEqual(context.isDefault, false);
      assert.strictEqual(context.workspaceFolder, folder);
    });

    test("creates default context when undefined", () => {
      const context = WorkspaceContext.from(undefined);

      assert.strictEqual(context.name, "default");
      assert.strictEqual(context.isDefault, true);
      assert.strictEqual(context.workspaceFolder, undefined);
    });
  });

  suite("getStorageKey", () => {
    test("returns simple key for default workspace", () => {
      const context = WorkspaceContext.createDefault();
      assert.strictEqual(context.getStorageKey(), "rubyPath");
    });

    test("returns prefixed key for specific workspace", () => {
      const folder = helpers.createTestWorkspace();
      const context = WorkspaceContext.fromWorkspaceFolder(folder);
      assert.strictEqual(context.getStorageKey(), `rubyPath:${folder.uri.toString()}`);
    });
  });
});
