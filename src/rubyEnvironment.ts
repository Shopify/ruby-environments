import * as vscode from "vscode";
import { RubyChangeEvent, OptionalRubyDefinition, RubyDefinition, JitType } from "./types";
import { asyncExec, isWindows } from "./common";
import { WorkspaceContext } from "./workspaceContext";

// Separators for parsing activation script output
export const ACTIVATION_SEPARATOR = "RUBY_ENVIRONMENTS_ACTIVATION_SEPARATOR";
export const VALUE_SEPARATOR = "RUBY_ENVIRONMENTS_VS";
export const FIELD_SEPARATOR = "RUBY_ENVIRONMENTS_FS";

/**
 * Manages the Ruby environment for a single workspace context
 */
export class RubyEnvironment {
  private readonly context: vscode.ExtensionContext;
  private readonly workspace: WorkspaceContext;
  private readonly changeEmitter: vscode.EventEmitter<RubyChangeEvent>;
  private currentRubyDefinition: OptionalRubyDefinition = null;

  constructor(
    context: vscode.ExtensionContext,
    workspace: WorkspaceContext,
    changeEmitter: vscode.EventEmitter<RubyChangeEvent>,
  ) {
    this.context = context;
    this.workspace = workspace;
    this.changeEmitter = changeEmitter;
  }

  async activate(): Promise<void> {
    // Load Ruby definition from configuration and emit change event
    await this.updateRubyDefinition();
  }

  getRuby(): OptionalRubyDefinition {
    return this.currentRubyDefinition;
  }

  async updateRubyDefinition(): Promise<void> {
    this.currentRubyDefinition = await this.getRubyDefinitionFromConfig();
    this.changeEmitter.fire({
      workspace: this.workspace.workspaceFolder,
      ruby: this.currentRubyDefinition,
    });
  }

  private async getRubyDefinitionFromConfig(): Promise<OptionalRubyDefinition> {
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

      const cwd = this.workspace.uri.fsPath;

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
    const workspaceKey = this.workspace.getStorageKey();

    // First check workspace state (set by the selectRuby command) for this specific workspace
    const workspaceRubyPath = this.context.workspaceState.get<string>(workspaceKey);

    // Then fall back to workspace-specific configuration
    const config = vscode.workspace.getConfiguration("rubyEnvironments", this.workspace.uri);
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

  async selectRuby(): Promise<void> {
    const rubyPath = this.getRubyPath();
    const workspaceName = this.workspace.name;

    // Show options for how to set the path
    const option = await vscode.window.showQuickPick(
      [
        { label: "$(folder) Browse for file...", value: "browse" },
        { label: "$(edit) Enter path manually...", value: "manual" },
      ],
      {
        placeHolder: `Current path for ${workspaceName}: ${rubyPath || "not set"}`,
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
        prompt: `Enter Ruby executable path for ${workspaceName}`,
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
      const workspaceKey = this.workspace.getStorageKey();
      await this.context.workspaceState.update(workspaceKey, newPath);
      await this.updateRubyDefinition();
      vscode.window.showInformationMessage(`Ruby executable path for ${workspaceName} updated to ${newPath}`);
    }
  }
}
