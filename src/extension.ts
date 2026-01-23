import * as vscode from "vscode";
import { RubyStatus } from "./status";
import { RubyChangeEvent, RubyDefinition, RubyEnvironmentsApi } from "./types";

// Event emitter for Ruby environment changes
const rubyChangeEmitter = new vscode.EventEmitter<RubyChangeEvent>();

function getRubyDefinitionFromConfig(): RubyDefinition {
  const config = vscode.workspace.getConfiguration("rubyEnvironments");
  const rubyVersion = config.get<string | null>("rubyVersion");

  if (!rubyVersion) {
    // Return mock data if not configured
    return {
      error: false,
      rubyVersion: "3.3.0",
      availableJITs: [],
      env: {},
      gemPath: [],
    };
  }

  return {
    error: true,
  };
}

export function activate(context: vscode.ExtensionContext): RubyEnvironmentsApi {
  // Ensure the event emitter is disposed when the extension is deactivated
  context.subscriptions.push(rubyChangeEmitter);

  // Create the status item
  const status = new RubyStatus();
  context.subscriptions.push(status);

  // Load Ruby definition from configuration
  let currentRubyDefinition = getRubyDefinitionFromConfig();
  status.refresh(currentRubyDefinition);

  // Watch for configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("rubyEnvironments")) {
      currentRubyDefinition = getRubyDefinitionFromConfig();
      status.refresh(currentRubyDefinition);
    }
  });
  context.subscriptions.push(configWatcher);

  // Register command to select Ruby version
  const selectRubyVersion = vscode.commands.registerCommand("ruby-environments.selectRubyVersion", async () => {
    const items = [
      { label: "Ruby 3.3.0 (YJIT)", version: "3.3.0", yjit: true },
      { label: "Ruby 3.3.0", version: "3.3.0", yjit: false },
      { label: "Ruby 3.2.0 (YJIT)", version: "3.2.0", yjit: true },
      { label: "Ruby 3.2.0", version: "3.2.0", yjit: false },
      { label: "Ruby 3.1.0", version: "3.1.0", yjit: false },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select Ruby installation",
    });

    if (selected) {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");
      await config.update("rubyVersion", selected.version, vscode.ConfigurationTarget.Workspace);
      await config.update("yjitEnabled", selected.yjit, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(`Switched to ${selected.label}`);
    }
  });

  context.subscriptions.push(selectRubyVersion);

  return {
    activate: async (_workspace: vscode.WorkspaceFolder | undefined) => {},
    getRuby: () => null,
    onDidRubyChange: rubyChangeEmitter.event,
  };
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
