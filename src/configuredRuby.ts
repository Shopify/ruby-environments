import * as vscode from "vscode";
import { JitType, RubyDefinition } from "./types";
import { VersionManager } from "./versionManager";
import { asyncExec, isWindows } from "./common";

// Separators for parsing activation script output
export const ACTIVATION_SEPARATOR = "RUBY_ENVIRONMENTS_ACTIVATION_SEPARATOR";
export const VALUE_SEPARATOR = "RUBY_ENVIRONMENTS_VS";
export const FIELD_SEPARATOR = "RUBY_ENVIRONMENTS_FS";

/**
 * Interface for workspace configuration
 */
export interface WorkspaceConfigurationInterface {
  get<T>(section: string, defaultValue?: T): T | undefined;
}

/**
 * Interface for workspace configuration access
 */
export interface WorkspaceInterface {
  getConfiguration(section: string): WorkspaceConfigurationInterface;
}

/**
 * A version manager that respects the configured Ruby in the Workspace or Global configuration.
 * This manager doesn't interact with any external version managers - it simply reads from VS Code settings.
 */
export class ConfiguredRuby implements VersionManager {
  readonly identifier = "configured";
  readonly name = "Configured Ruby";
  private readonly workspace: WorkspaceInterface;
  private readonly context: vscode.ExtensionContext;
  private readonly workspaceFolder: vscode.WorkspaceFolder | undefined;

  constructor(
    workspace: WorkspaceInterface = vscode.workspace,
    context: vscode.ExtensionContext,
    workspaceFolder?: vscode.WorkspaceFolder,
  ) {
    this.workspace = workspace;
    this.context = context;
    this.workspaceFolder = workspaceFolder;
  }

  async activate(): Promise<RubyDefinition> {
    const config = this.workspace.getConfiguration("rubyEnvironments");
    const rubyExecutable = config.get<string>("rubyExecutablePath", "ruby");

    try {
      const activationScriptUri = vscode.Uri.joinPath(this.context.extensionUri, "activation.rb");

      const command = `${rubyExecutable} -W0 -EUTF-8:UTF-8 '${activationScriptUri.fsPath}'`;

      let shell: string | undefined;
      // Use the user's preferred shell (except on Windows) to ensure proper environment sourcing
      if (vscode.env.shell.length > 0 && !isWindows()) {
        shell = vscode.env.shell;
      }

      const cwd = this.workspaceFolder?.uri.fsPath || process.cwd();

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
}
