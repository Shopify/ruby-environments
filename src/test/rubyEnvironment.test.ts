import * as assert from "assert";
import * as vscode from "vscode";
import sinon from "sinon";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as common from "../common";
import { RubyEnvironment, FIELD_SEPARATOR, VALUE_SEPARATOR } from "../rubyEnvironment";
import { WorkspaceContext } from "../workspaceContext";
import * as helpers from "./helpers";
import { RubyChangeEvent } from "../types";

suite("RubyEnvironment", () => {
  let context: helpers.FakeContext;
  let workspace: WorkspaceContext;
  let changeEmitter: vscode.EventEmitter<RubyChangeEvent>;
  let rubyEnv: RubyEnvironment;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    context = helpers.createContext();
    workspace = WorkspaceContext.fromWorkspaceFolder(helpers.createTestWorkspace());
    changeEmitter = new vscode.EventEmitter<RubyChangeEvent>();
    sandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    context.dispose();
    changeEmitter.dispose();
    // Clean up any configuration changes
    const config = vscode.workspace.getConfiguration("rubyEnvironments");
    await config.update("rubyPath", undefined, vscode.ConfigurationTarget.Global);
    sandbox.restore();
  });

  suite("getRuby", () => {
    test("returns null before activation", () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      const ruby = rubyEnv.getRuby();
      assert.strictEqual(ruby, null, "Should return null before activation");
    });
  });

  suite("activate", () => {
    test("does not set Ruby definition if not configured", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      assert.strictEqual(ruby, null, "Should return null if not configured");
    });

    test("initializes Ruby definition from configuration", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const execStub = helpers.stubAsyncExec(sandbox);
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const expectedCommand = helpers.buildExpectedCommand(context, "/usr/bin/ruby");
      const shell = helpers.getExpectedShell();

      assert.ok(
        execStub.calledOnceWithExactly(expectedCommand, {
          cwd: workspace.uri.fsPath,
          shell,
          env: process.env,
        }),
        "Expected asyncExec to be called with correct arguments",
      );

      const ruby = rubyEnv.getRuby();
      helpers.assertRubyDefinition(ruby);
    });

    test("initializes Ruby definition from workspace state", async () => {
      await context.workspaceState.update(workspace.getStorageKey(), "/custom/ruby/path");

      const execStub = helpers.stubAsyncExec(sandbox);
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const expectedCommand = helpers.buildExpectedCommand(context, "/custom/ruby/path");
      const shell = helpers.getExpectedShell();

      assert.ok(
        execStub.calledOnceWithExactly(expectedCommand, {
          cwd: workspace.uri.fsPath,
          shell,
          env: process.env,
        }),
        "Expected asyncExec to be called with correct arguments",
      );

      const ruby = rubyEnv.getRuby();
      assert.ok(ruby !== null, "Should return Ruby definition");
      assert.strictEqual(ruby.error, false);
    });

    test("workspace state takes precedence over configuration", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/config/ruby", vscode.ConfigurationTarget.Global);
      await context.workspaceState.update(workspace.getStorageKey(), "/state/ruby");

      const execStub = helpers.stubAsyncExec(sandbox);
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const expectedCommand = helpers.buildExpectedCommand(context, "/state/ruby");
      assert.ok(execStub.calledOnceWith(expectedCommand), "Should use workspace state path over config path");
    });

    test("fires change event on activation", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      helpers.stubAsyncExec(sandbox);

      let eventFired = false;
      let receivedEvent: RubyChangeEvent | undefined;
      const disposable = changeEmitter.event((event) => {
        eventFired = true;
        receivedEvent = event;
      });

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      assert.strictEqual(eventFired, true, "Event should have fired after activation");
      assert.ok(receivedEvent, "Event data should be received");
      assert.strictEqual(receivedEvent.workspace, workspace.workspaceFolder);

      const ruby = receivedEvent.ruby;
      assert.ok(ruby !== null, "Ruby definition should be present");
      assert.strictEqual(ruby.error, false);

      disposable.dispose();
    });

    test("handles activation errors gracefully", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/invalid/ruby", vscode.ConfigurationTarget.Global);

      sandbox.stub(common, "asyncExec").rejects(new Error("Command failed"));

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      assert.ok(ruby !== null, "Should return error Ruby definition");
      assert.strictEqual(ruby.error, true);
    });

    test("handles missing activation separator in response", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      sandbox.stub(common, "asyncExec").resolves({
        stdout: "",
        stderr: "This is an incomplete response without separators",
      });

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      assert.ok(ruby !== null, "Should return error Ruby definition");
      assert.strictEqual(ruby.error, true);
    });
  });

  suite("updateRubyDefinition", () => {
    test("updates Ruby definition and fires change event", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      helpers.stubAsyncExec(sandbox);

      let eventCount = 0;
      const disposable = changeEmitter.event(() => {
        eventCount++;
      });

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.updateRubyDefinition();

      assert.strictEqual(eventCount, 1, "Event should fire once");

      const ruby = rubyEnv.getRuby();
      assert.ok(ruby !== null, "Ruby definition should be updated");
      assert.strictEqual(ruby.error, false);

      disposable.dispose();
    });
  });

  suite("parseActivationResult", () => {
    test("parses complete activation response with YJIT", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const response = [
        "3.3.0",
        "/path/to/gems,/another/path",
        "true",
        `PATH${VALUE_SEPARATOR}/usr/bin`,
        `HOME${VALUE_SEPARATOR}/home/user`,
      ].join(FIELD_SEPARATOR);

      helpers.stubAsyncExec(sandbox, response);

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      helpers.assertRubyDefinition(ruby);
    });

    test("parses activation response without YJIT", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const response = [
        "3.2.0",
        "/path/to/gems",
        "", // Empty YJIT field
        `PATH${VALUE_SEPARATOR}/usr/bin`,
      ].join(FIELD_SEPARATOR);

      helpers.stubAsyncExec(sandbox, response);

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      helpers.assertRubyDefinition(ruby, {
        rubyVersion: "3.2.0",
        availableJITs: [],
        gemPath: ["/path/to/gems"],
        envVars: { PATH: "/usr/bin" },
      });
    });

    test("parses activation response with multiple gem paths", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const response = ["3.3.0", "/path/one,/path/two,/path/three", "true"].join(FIELD_SEPARATOR);

      helpers.stubAsyncExec(sandbox, response);

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      helpers.assertRubyDefinition(ruby, {
        gemPath: ["/path/one", "/path/two", "/path/three"],
        envVars: {},
      });
    });

    test("parses activation response with multiple environment variables", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      const response = [
        "3.3.0",
        "/path/to/gems",
        "true",
        `PATH${VALUE_SEPARATOR}/usr/bin`,
        `HOME${VALUE_SEPARATOR}/home/user`,
        `GEM_HOME${VALUE_SEPARATOR}/home/user/.gem`,
        `RUBY_VERSION${VALUE_SEPARATOR}3.3.0`,
      ].join(FIELD_SEPARATOR);

      helpers.stubAsyncExec(sandbox, response);

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      helpers.assertRubyDefinition(ruby, {
        gemPath: ["/path/to/gems"],
        envVars: {
          PATH: "/usr/bin",
          HOME: "/home/user",
          GEM_HOME: "/home/user/.gem",
          RUBY_VERSION: "3.3.0",
        },
      });
    });
  });

  suite("selectRuby", () => {
    test("updates workspace state when path is provided manually", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .resolves({ label: "$(edit) Enter path manually...", value: "manual" } as vscode.QuickPickItem);

      const showInputBoxStub = sandbox.stub(vscode.window, "showInputBox").resolves("/new/ruby/path");
      const showInformationMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
      helpers.stubAsyncExec(sandbox);

      await rubyEnv.selectRuby();

      assert.ok(showQuickPickStub.calledOnce, "Quick pick should be shown");
      assert.ok(showInputBoxStub.calledOnce, "Input box should be shown");
      assert.ok(showInformationMessageStub.calledOnce, "Confirmation message should be shown");

      const storedPath = context.workspaceState.get<string>(workspace.getStorageKey());
      assert.strictEqual(storedPath, "/new/ruby/path", "Path should be stored in workspace state");
    });

    test("updates workspace state when path is browsed", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .resolves({ label: "$(folder) Browse for file...", value: "browse" } as vscode.QuickPickItem);

      const testPath = "/browsed/ruby/path";
      const showOpenDialogStub = sandbox.stub(vscode.window, "showOpenDialog").resolves([vscode.Uri.file(testPath)]);
      const showInformationMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
      helpers.stubAsyncExec(sandbox);

      await rubyEnv.selectRuby();

      assert.ok(showQuickPickStub.calledOnce, "Quick pick should be shown");
      assert.ok(showOpenDialogStub.calledOnce, "Open dialog should be shown");
      assert.ok(showInformationMessageStub.calledOnce, "Confirmation message should be shown");

      const storedPath = context.workspaceState.get<string>(workspace.getStorageKey());
      assert.strictEqual(storedPath, testPath, "Path should be stored in workspace state");
    });

    test("does not update when user cancels quick pick", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      const showQuickPickStub = sandbox.stub(vscode.window, "showQuickPick").resolves(undefined);

      await rubyEnv.selectRuby();

      assert.ok(showQuickPickStub.calledOnce, "Quick pick should be shown");

      const storedPath = context.workspaceState.get<string>(workspace.getStorageKey());
      assert.strictEqual(storedPath, undefined, "Path should not be stored");
    });

    test("does not update when user cancels file browse", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      sandbox
        .stub(vscode.window, "showQuickPick")
        .resolves({ label: "$(folder) Browse for file...", value: "browse" } as vscode.QuickPickItem);

      const showOpenDialogStub = sandbox.stub(vscode.window, "showOpenDialog").resolves(undefined);

      await rubyEnv.selectRuby();

      assert.ok(showOpenDialogStub.calledOnce, "Open dialog should be shown");

      const storedPath = context.workspaceState.get<string>(workspace.getStorageKey());
      assert.strictEqual(storedPath, undefined, "Path should not be stored");
    });

    test("does not update when user cancels manual input", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      sandbox
        .stub(vscode.window, "showQuickPick")
        .resolves({ label: "$(edit) Enter path manually...", value: "manual" } as vscode.QuickPickItem);

      const showInputBoxStub = sandbox.stub(vscode.window, "showInputBox").resolves(undefined);

      await rubyEnv.selectRuby();

      assert.ok(showInputBoxStub.calledOnce, "Input box should be shown");

      const storedPath = context.workspaceState.get<string>(workspace.getStorageKey());
      assert.strictEqual(storedPath, undefined, "Path should not be stored");
    });

    test("validates empty input", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      let validateInput: ((value: string) => string | null) | undefined;

      sandbox
        .stub(vscode.window, "showQuickPick")
        .resolves({ label: "$(edit) Enter path manually...", value: "manual" } as vscode.QuickPickItem);

      sandbox.stub(vscode.window, "showInputBox").callsFake((options?: vscode.InputBoxOptions) => {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        validateInput = options?.validateInput as ((value: string) => string | null) | undefined;
        return Promise.resolve(undefined);
      });

      await rubyEnv.selectRuby();

      assert.ok(validateInput, "Validation function should be provided");

      const emptyError = validateInput("");
      assert.strictEqual(emptyError, "Path cannot be empty");

      const whitespaceError = validateInput("   ");
      assert.strictEqual(whitespaceError, "Path cannot be empty");

      const validResult = validateInput("/valid/path");
      assert.strictEqual(validResult, null);
    });

    test("shows current path in placeholder", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/existing/ruby", vscode.ConfigurationTarget.Global);

      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      let capturedPlaceholder: string | undefined;

      const showQuickPickStub = sandbox.stub(vscode.window, "showQuickPick").callsFake((items, options?) => {
        capturedPlaceholder = (options as vscode.QuickPickOptions)?.placeHolder;
        return Promise.resolve(undefined);
      });

      await rubyEnv.selectRuby();

      assert.ok(showQuickPickStub.calledOnce);
      assert.ok(capturedPlaceholder?.includes("/existing/ruby"), "Placeholder should show current path");
    });

    test("fires change event after updating path", async () => {
      rubyEnv = new RubyEnvironment(context, workspace, changeEmitter);

      sandbox
        .stub(vscode.window, "showQuickPick")
        .resolves({ label: "$(edit) Enter path manually...", value: "manual" } as vscode.QuickPickItem);

      sandbox.stub(vscode.window, "showInputBox").resolves("/new/ruby/path");
      sandbox.stub(vscode.window, "showInformationMessage");
      helpers.stubAsyncExec(sandbox);

      let eventFired = false;
      const disposable = changeEmitter.event(() => {
        eventFired = true;
      });

      await rubyEnv.selectRuby();

      assert.strictEqual(eventFired, true, "Change event should fire after path update");

      disposable.dispose();
    });
  });

  suite("default workspace", () => {
    test("works with default workspace context", async () => {
      const defaultWorkspace = WorkspaceContext.createDefault();
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyPath", "/usr/bin/ruby", vscode.ConfigurationTarget.Global);

      helpers.stubAsyncExec(sandbox);

      rubyEnv = new RubyEnvironment(context, defaultWorkspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      assert.ok(ruby !== null, "Should return Ruby definition for default workspace");
      assert.strictEqual(ruby.error, false);
    });

    test("uses simple storage key for default workspace", async () => {
      const defaultWorkspace = WorkspaceContext.createDefault();
      await context.workspaceState.update("rubyPath", "/default/ruby/path");

      helpers.stubAsyncExec(sandbox);

      rubyEnv = new RubyEnvironment(context, defaultWorkspace, changeEmitter);
      await rubyEnv.activate();

      const ruby = rubyEnv.getRuby();
      assert.ok(ruby !== null, "Should load from default storage key");
      assert.strictEqual(ruby.error, false);
    });
  });
});
