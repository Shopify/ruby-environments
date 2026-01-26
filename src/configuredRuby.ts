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
  private readonly logger: vscode.LogOutputChannel;

  constructor(
    workspace: WorkspaceInterface,
    context: vscode.ExtensionContext,
    logger: vscode.LogOutputChannel,
    workspaceFolder?: vscode.WorkspaceFolder,
  ) {
    this.workspace = workspace;
    this.context = context;
    this.logger = logger;
    this.workspaceFolder = workspaceFolder;
  }

  async activate(): Promise<RubyDefinition> {
    const config = this.workspace.getConfiguration("rubyEnvironments");
    const rubyExecutable = config.get<string>("rubyExecutablePath", "ruby");

    this.logger.info(`Configured Ruby: using executable '${rubyExecutable}'`);

    try {
      const activationScriptUri = vscode.Uri.joinPath(this.context.extensionUri, "activation.rb");
      this.logger.debug(`Activation script path: ${activationScriptUri.fsPath}`);

      const command = `${rubyExecutable} -W0 -EUTF-8:UTF-8 '${activationScriptUri.fsPath}'`;
      this.logger.debug(`Executing command: ${command}`);

      let shell: string | undefined;
      // Use the user's preferred shell (except on Windows) to ensure proper environment sourcing
      if (vscode.env.shell.length > 0 && !isWindows()) {
        shell = vscode.env.shell;
        this.logger.debug(`Using shell: ${shell}`);
      } else {
        this.logger.debug("Using default shell");
      }

      const cwd = this.workspaceFolder?.uri.fsPath || process.cwd();
      this.logger.debug(`Working directory: ${cwd}`);

      const result = await asyncExec(command, {
        cwd,
        shell,
        env: process.env,
      });

      this.logger.debug(`Command stdout length: ${result.stdout.length}`);
      this.logger.debug(`Command stderr length: ${result.stderr.length}`);

      if (result.stderr) {
        this.logger.trace(`Activation output (stderr): ${result.stderr}`);
      }

      return this.parseActivationResult(result.stderr);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to activate Ruby: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.trace(`Error stack: ${error.stack}`);
      }
      return {
        error: true,
      };
    }
  }

  private parseActivationResult(stderr: string): RubyDefinition {
    const activationContent = new RegExp(`${ACTIVATION_SEPARATOR}([^]*)${ACTIVATION_SEPARATOR}`).exec(stderr);

    if (!activationContent) {
      this.logger.error("Failed to parse activation result: separator not found in output");
      this.logger.trace(`Raw stderr content: ${stderr}`);
      return {
        error: true,
      };
    }

    this.logger.debug("Successfully parsed activation separator");
    const [version, gemPath, yjit, ...envEntries] = activationContent[1].split(FIELD_SEPARATOR);

    this.logger.debug(`Parsed Ruby version: ${version}`);
    this.logger.debug(`Parsed gem paths: ${gemPath}`);
    this.logger.debug(`Parsed YJIT status: ${yjit}`);
    this.logger.debug(`Parsed ${envEntries.length} environment variables`);

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
