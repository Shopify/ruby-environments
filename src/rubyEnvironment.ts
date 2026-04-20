import * as vscode from "vscode";
import { RubyStatus } from "./status";
import { RubyChangeEvent, OptionalRubyDefinition, RubyEnvironmentsApi, RubyDefinition, JitType } from "./types";
import { asyncExec, isWindows } from "./common";

// Separators for parsing activation script output
export const ACTIVATION_SEPARATOR = "RUBY_ENVIRONMENTS_ACTIVATION_SEPARATOR";
export const VALUE_SEPARATOR = "RUBY_ENVIRONMENTS_VS";
export const FIELD_SEPARATOR = "RUBY_ENVIRONMENTS_FS";

export class RubyEnvironmentManager implements RubyEnvironmentsApi {
  private readonly context: vscode.ExtensionContext;
  private readonly status: RubyStatus;
  private readonly changeEmitter: vscode.EventEmitter<RubyChangeEvent>;
  private currentRubyDefinition: OptionalRubyDefinition = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.changeEmitter = new vscode.EventEmitter<RubyChangeEvent>();
    this.status = new RubyStatus(this.changeEmitter.event);

    // Register disposables
    context.subscriptions.push(this.status);
    context.subscriptions.push(this.changeEmitter);

    // Watch for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("rubyEnvironments")) {
        await this.updateRubyDefinition(vscode.workspace.workspaceFolders?.[0]);
      }
    });
    context.subscriptions.push(configWatcher);

    // Register command to select Ruby installation
    const selectRuby = vscode.commands.registerCommand("ruby-environments.selectRuby", async () => {
      await this.selectRuby();
    });
    context.subscriptions.push(selectRuby);
  }

  async activate(workspace: vscode.WorkspaceFolder | undefined): Promise<void> {
    // Load Ruby definition from configuration and emit change event
    await this.updateRubyDefinition(workspace);
  }

  getRuby(): OptionalRubyDefinition {
    return this.currentRubyDefinition;
  }

  get onDidRubyChange(): vscode.Event<RubyChangeEvent> {
    return this.changeEmitter.event;
  }

  private async updateRubyDefinition(workspace: vscode.WorkspaceFolder | undefined): Promise<void> {
    this.currentRubyDefinition = await this.getRubyDefinitionFromConfig(workspace);
    this.changeEmitter.fire({
      workspace: workspace,
      ruby: this.currentRubyDefinition,
    });
  }

  private async getRubyDefinitionFromConfig(
    workspace: vscode.WorkspaceFolder | undefined,
  ): Promise<OptionalRubyDefinition> {
    const rubyPath = this.getRubyPath();

    if (!rubyPath) {
      return null;
    }

    try {
      const activationScriptUri = vscode.Uri.joinPath(this.context.extensionUri, "activation.rb");

      const command = `${rubyPath} -W0 -EUTF-8:UTF-8 '${activationScriptUri.fsPath}'`;

      let shell: string | undefined;
      // Use the user's preferred shell (except on Windows) to ensure proper environment sourcing
      if (vscode.env.shell.length > 0 && !isWindows()) {
        shell = vscode.env.shell;
      }

      const cwd = workspace?.uri.fsPath || process.cwd();

      const result = await asyncExec(command, {
        cwd,
        shell,
        env: process.env,
      });

      return this.parseActivationResult(result.stderr);
    } catch (_error: unknown) {
      return {
        error: true,
      };
    }
  }

  private getRubyPath(): string | undefined {
    // First check workspace state (set by the selectRuby command)
    const workspaceRubyPath = this.context.workspaceState.get<string>("rubyPath");

    // Then fall back to configuration
    const config = vscode.workspace.getConfiguration("rubyEnvironments");
    const configuredRubyPath = config.get<string>("rubyPath");

    return workspaceRubyPath || configuredRubyPath;
  }

  private parseActivationResult(stderr: string): RubyDefinition {
    const activationContent = new RegExp(`${ACTIVATION_SEPARATOR}([^]*)${ACTIVATION_SEPARATOR}`).exec(stderr);

    if (!activationContent) {
      return {
        error: true,
      };
    }

    const [version, gemPath, yjit, ...envEntries] = activationContent[1].split(FIELD_SEPARATOR);

    const availableJITs: JitType[] = [];

    if (yjit) availableJITs.push(JitType.YJIT);

    return {
      error: false,
      rubyVersion: version,
      gemPath: gemPath.split(","),
      availableJITs: availableJITs,
      env: Object.fromEntries(envEntries.map((entry: string) => entry.split(VALUE_SEPARATOR))) as NodeJS.ProcessEnv,
    };
  }

  private async selectRuby(): Promise<void> {
    const rubyPath = this.getRubyPath();

    // Show options for how to set the path
    const option = await vscode.window.showQuickPick(
      [
        { label: "$(folder) Browse for file...", value: "browse" },
        { label: "$(edit) Enter path manually...", value: "manual" },
      ],
      {
        placeHolder: `Current path: ${rubyPath || "not set"}`,
      },
    );

    if (!option) {
      return;
    }

    let newPath: string | undefined;

    if (option.value === "browse") {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: "Select Ruby Executable",
        title: "Select Ruby Executable",
        filters: {
          // No extension filter to support executables without extensions
          "All Files": ["*"],
        },
      });

      if (uris && uris.length > 0) {
        newPath = uris[0].fsPath;
      }
    } else if (option.value === "manual") {
      newPath = await vscode.window.showInputBox({
        prompt: "Enter Ruby executable path",
        value: rubyPath,
        placeHolder: "ruby",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Path cannot be empty";
          }
          return null;
        },
      });
    }

    if (newPath) {
      await this.context.workspaceState.update("rubyPath", newPath);
      await this.updateRubyDefinition(vscode.workspace.workspaceFolders?.[0]);
      vscode.window.showInformationMessage(`Ruby executable path updated to ${newPath}`);
    }
  }
}
