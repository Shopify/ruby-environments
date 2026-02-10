import * as vscode from "vscode";
import { RubyStatus } from "./status";
import { RubyChangeEvent, RubyDefinition, RubyEnvironmentsApi } from "./types";
import { ConfiguredRuby } from "./configuredRuby";
import { VersionManager } from "./versionManager";

/**
 * Main class that manages the Ruby environment state and lifecycle
 */
export class RubyEnvironment implements RubyEnvironmentsApi {
  private versionManager: VersionManager | null = null;
  private currentRubyDefinition: RubyDefinition | null = null;
  private workspaceFolder: vscode.WorkspaceFolder | undefined;
  private status: RubyStatus | null = null;

  private readonly logger: vscode.LogOutputChannel;
  private readonly context: vscode.ExtensionContext;
  // Event emitter for Ruby environment changes
  private readonly rubyChangeEmitter = new vscode.EventEmitter<RubyChangeEvent>();

  constructor(context: vscode.ExtensionContext, logger: vscode.LogOutputChannel) {
    this.context = context;
    this.logger = logger;
  }

  async activate(): Promise<void> {
    this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    this.logger.info("Ruby Environments extension activating...");
    if (this.workspaceFolder) {
      this.logger.info(`Workspace folder: ${this.workspaceFolder.uri.fsPath}`);
    } else {
      this.logger.warn("No workspace folder found");
    }

    // Create the version manager
    this.versionManager = this.createVersionManager();
    this.logger.info(`Using version manager: ${this.versionManager.name}`);

    // Create the status item
    this.status = new RubyStatus();
    this.context.subscriptions.push(this.status);

    // Setup watchers and commands
    this.setupConfigWatcher();
    this.registerCommands();

    this.logger.info("Activating Ruby environment...");
    this.currentRubyDefinition = await this.versionManager.activate();

    if (this.currentRubyDefinition.error) {
      this.logger.error("Failed to activate Ruby environment");
    } else {
      this.logger.info(`Ruby activated: ${this.currentRubyDefinition.rubyVersion}`);
      if (this.currentRubyDefinition.availableJITs.length > 0) {
        this.logger.info(`Available JITs: ${this.currentRubyDefinition.availableJITs.join(", ")}`);
      }
      this.logger.debug(`Gem paths: ${this.currentRubyDefinition.gemPath.join(", ")}`);
    }

    this.status.refresh(this.currentRubyDefinition);
  }

  getRuby(): RubyDefinition | null {
    return this.currentRubyDefinition;
  }

  private createVersionManager(): VersionManager {
    const config = vscode.workspace.getConfiguration("rubyEnvironments");
    const versionManager = config.get<string>("versionManager", "configured");

    switch (versionManager) {
      case "configured":
        return new ConfiguredRuby(vscode.workspace, this.context, this.logger, this.workspaceFolder);
      default:
        // Default to configured if unknown version manager
        return new ConfiguredRuby(vscode.workspace, this.context, this.logger, this.workspaceFolder);
    }
  }

  get onDidRubyChange(): vscode.Event<RubyChangeEvent> {
    return this.rubyChangeEmitter.event;
  }

  private setupConfigWatcher(): void {
    const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("rubyEnvironments")) {
        this.logger.info("Configuration changed, reactivating Ruby environment");
        // Recreate version manager if the version manager type changed
        if (e.affectsConfiguration("rubyEnvironments.versionManager")) {
          this.versionManager = this.createVersionManager();
          this.logger.info(`Switched to version manager: ${this.versionManager.name}`);
        }
        await this.activate();
      }
    });
    this.context.subscriptions.push(configWatcher);
  }

  private registerCommands(): void {
    const selectRubyVersion = vscode.commands.registerCommand("ruby-environments.selectRubyVersion", async () => {
      const config = vscode.workspace.getConfiguration("rubyEnvironments");

      // First, let the user select the version manager
      const versionManagerItems = [{ label: "Configured Ruby", value: "configured" }];

      const selectedManager = await vscode.window.showQuickPick(versionManagerItems, {
        placeHolder: "Select version manager",
      });

      if (selectedManager) {
        await config.update("versionManager", selectedManager.value, vscode.ConfigurationTarget.Workspace);

        // If configured, also ask for the Ruby executable path
        if (selectedManager.value === "configured") {
          const currentPath = config.get<string>("rubyExecutablePath", "ruby");

          // Show options for how to set the path
          const option = await vscode.window.showQuickPick(
            [
              { label: "$(folder) Browse for file...", value: "browse" },
              { label: "$(edit) Enter path manually...", value: "manual" },
            ],
            {
              placeHolder: `Current path: ${currentPath}`,
            },
          );

          if (option) {
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
                const selectedPath = uris[0].fsPath;
                await config.update("rubyExecutablePath", selectedPath, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`Ruby executable path updated to ${selectedPath}`);
              }
            } else if (option.value === "manual") {
              const newPath = await vscode.window.showInputBox({
                prompt: "Enter Ruby executable path",
                value: currentPath,
                placeHolder: "ruby",
                validateInput: (value) => {
                  if (!value || value.trim().length === 0) {
                    return "Path cannot be empty";
                  }
                  return null;
                },
              });

              if (newPath) {
                await config.update("rubyExecutablePath", newPath, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`Ruby executable path updated to ${newPath}`);
              }
            }
          }
        } else {
          vscode.window.showInformationMessage(`Switched to ${selectedManager.label} version manager`);
        }
      }
    });

    this.context.subscriptions.push(selectRubyVersion);
  }
}
