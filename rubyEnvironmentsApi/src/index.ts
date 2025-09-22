import { WorkspaceFolder, extensions } from "vscode";

/**
 * Identifiers for supported Ruby version managers.
 */
export enum ManagerIdentifier {
  Asdf = "asdf",
  Auto = "auto",
  Chruby = "chruby",
  Rbenv = "rbenv",
  Rvm = "rvm",
  Shadowenv = "shadowenv",
  Mise = "mise",
  RubyInstaller = "rubyInstaller",
  None = "none",
  Custom = "custom",
}

/**
 * Configuration for a Ruby version manager.
 * @property identifier The type of version manager in use.
 */
export interface ManagerConfiguration {
  /** The type of version manager in use. */
  identifier: ManagerIdentifier;
}

/**
 * Represents a fully resolved Ruby environment for a workspace.
 * @property env The environment variables for the Ruby process.
 * @property rubyVersion The active Ruby version (optional).
 * @property yjitEnabled Whether YJIT is enabled (optional).
 * @property gemPath Array of gem paths for the environment.
 * @property versionManager The configuration of the version manager used.
 */
export interface RubyEnvironment {
  /** The environment variables for the Ruby process. */
  env: NodeJS.ProcessEnv;
  /** The active Ruby version, if detected. */
  rubyVersion?: string;
  /** Whether YJIT is enabled, if detected. */
  yjitEnabled?: boolean;
  /** Array of gem paths for the environment. */
  gemPath: string[];
  /** The configuration of the version manager used. */
  versionManager: ManagerConfiguration;
}

/**
 * Main API for interacting with Ruby environments in VS Code extensions.
 */
export interface RubyEnvironmentsApi {
  /**
   * Get the resolved Ruby environment for a workspace folder.
   * @param workspaceFolder The workspace folder to resolve the environment for.
   */
  getEnvironment(workspaceFolder: WorkspaceFolder): Promise<RubyEnvironment>;

  /**
   * Update the Ruby environment for a workspace folder.
   * @param env The environment variables to update.
   * @param workspaceFolder The workspace folder to update.
   */
  updateEnvironment(env: NodeJS.ProcessEnv, workspaceFolder: WorkspaceFolder): Promise<void>;

  /**
   * Force the Ruby environment extension to re-resolve the environment for a workspace folder.
   * @param workspaceFolder The workspace folder to refresh.
   */
  refreshEnvironment(workspaceFolder: WorkspaceFolder): Promise<void>;
}

/**
 * The extension identifier for the Ruby environments API.
 */
const EXTENSION_NAME = "shopify.ruby-environments";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RubyEnvironmentsApi {
  /**
   * Return the API exported by the Ruby Environments extension.
   * @throws If the extension is not found or cannot be activated.
   */
  export async function getApi(): Promise<RubyEnvironmentsApi> {
    const extension = extensions.getExtension(EXTENSION_NAME);
    if (!extension) {
      throw new Error(`Extension ${EXTENSION_NAME} not found`);
    }
    await extension.activate();
    return extension.exports as RubyEnvironmentsApi;
  }
}
