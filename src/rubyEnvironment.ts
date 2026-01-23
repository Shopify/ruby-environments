import * as vscode from "vscode";
import { RubyStatus } from "./status";
import { RubyChangeEvent, OptionalRubyDefinition, RubyEnvironmentsApi } from "./types";

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
    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("rubyEnvironments")) {
        this.updateRubyDefinition(vscode.workspace.workspaceFolders?.[0]);
      }
    });
    context.subscriptions.push(configWatcher);

    // Register command to select Ruby installation
    const selectRuby = vscode.commands.registerCommand("ruby-environments.selectRuby", async () => {
      await this.selectRuby();
    });
    context.subscriptions.push(selectRuby);
  }

  activate(workspace: vscode.WorkspaceFolder | undefined): Promise<void> {
    // Load Ruby definition from configuration and emit change event
    this.updateRubyDefinition(workspace);
    return Promise.resolve();
  }

  getRuby(): OptionalRubyDefinition {
    return this.currentRubyDefinition;
  }

  get onDidRubyChange(): vscode.Event<RubyChangeEvent> {
    return this.changeEmitter.event;
  }

  private updateRubyDefinition(workspace: vscode.WorkspaceFolder | undefined): void {
    this.currentRubyDefinition = this.getRubyDefinitionFromConfig();
    this.changeEmitter.fire({
      workspace: workspace,
      ruby: this.currentRubyDefinition,
    });
  }

  private getRubyDefinitionFromConfig(): OptionalRubyDefinition {
    const rubyPath = this.getRubyPath();

    if (!rubyPath) {
      return null;
    }

    return {
      error: true,
    };
  }

  private getRubyPath(): string | undefined {
    // First check workspace state (set by the selectRuby command)
    const workspaceRubyPath = this.context.workspaceState.get<string>("rubyPath");

    // Then fall back to configuration
    const config = vscode.workspace.getConfiguration("rubyEnvironments");
    const configuredRubyPath = config.get<string>("rubyPath");

    return workspaceRubyPath || configuredRubyPath;
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
      this.updateRubyDefinition(vscode.workspace.workspaceFolders?.[0]);
      vscode.window.showInformationMessage(`Ruby executable path updated to ${newPath}`);
    }
  }
}
