import * as vscode from "vscode";
import { RubyStatus } from "./status";
import { RubyChangeEvent, RubyDefinition, RubyEnvironmentsApi } from "./types";
import { ConfiguredRuby } from "./configuredRuby";
import { VersionManager } from "./versionManager";

function createVersionManager(
  context: vscode.ExtensionContext,
  logger: vscode.LogOutputChannel,
  workspaceFolder: vscode.WorkspaceFolder | undefined,
): VersionManager {
  const config = vscode.workspace.getConfiguration("rubyEnvironments");
  const versionManager = config.get<string>("versionManager", "configured");

  switch (versionManager) {
    case "configured":
      return new ConfiguredRuby(vscode.workspace, context, logger, workspaceFolder);
    default:
      // Default to configured if unknown version manager
      return new ConfiguredRuby(vscode.workspace, context, logger, workspaceFolder);
  }
}

// Event emitter for Ruby environment changes
const rubyChangeEmitter = new vscode.EventEmitter<RubyChangeEvent>();

// Internal activation function that accepts optional output channel for testing
export function activateInternal(
  context: vscode.ExtensionContext,
  outputChannel?: vscode.LogOutputChannel,
): RubyEnvironmentsApi {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  // Use provided output channel or create a no-op one for tests
  const logger =
    outputChannel ||
    ({
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    } as unknown as vscode.LogOutputChannel);

  logger.info("Ruby Environments extension activating...");
  if (workspaceFolder) {
    logger.info(`Workspace folder: ${workspaceFolder.uri.fsPath}`);
  } else {
    logger.warn("No workspace folder found");
  }

  // Create the version manager
  let versionManager = createVersionManager(context, logger, workspaceFolder);
  logger.info(`Using version manager: ${versionManager.name}`);

  // Ensure the event emitter is disposed when the extension is deactivated
  context.subscriptions.push(rubyChangeEmitter);

  // Create the status item
  const status = new RubyStatus();
  context.subscriptions.push(status);

  // Load Ruby definition from version manager
  let currentRubyDefinition: RubyDefinition | null = null;

  // Activate Ruby environment asynchronously
  const activateRuby = async () => {
    logger.info("Activating Ruby environment...");
    currentRubyDefinition = await versionManager.activate();

    if (currentRubyDefinition.error) {
      logger.error("Failed to activate Ruby environment");
    } else {
      logger.info(`Ruby activated: ${currentRubyDefinition.rubyVersion || "unknown version"}`);
      if (currentRubyDefinition.availableJITs.length > 0) {
        logger.info(`JITs available: ${currentRubyDefinition.availableJITs.join(", ")}`);
      }
      if (currentRubyDefinition.gemPath) {
        logger.debug(`Gem paths: ${currentRubyDefinition.gemPath.join(", ")}`);
      }
    }

    status.refresh(currentRubyDefinition);
  };

  // Initial activation
  void activateRuby();

  // Watch for configuration changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("rubyEnvironments")) {
      logger.info("Configuration changed, reactivating Ruby environment");
      // Recreate version manager if the version manager type changed
      if (e.affectsConfiguration("rubyEnvironments.versionManager")) {
        versionManager = createVersionManager(context, logger, workspaceFolder);
        logger.info(`Switched to version manager: ${versionManager.name}`);
      }
      void activateRuby();
    }
  });
  context.subscriptions.push(configWatcher);

  // Register command to select Ruby version
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

  context.subscriptions.push(selectRubyVersion);

  return {
    activate: async (_workspace: vscode.WorkspaceFolder | undefined) => {},
    getRuby: () => null,
    onDidRubyChange: rubyChangeEmitter.event,
  };
}

export function activate(context: vscode.ExtensionContext): RubyEnvironmentsApi {
  // Create log output channel for production use
  const outputChannel = vscode.window.createOutputChannel("Ruby Environments", { log: true });
  context.subscriptions.push(outputChannel);

  return activateInternal(context, outputChannel);
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
