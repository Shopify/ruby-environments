import * as vscode from "vscode";
import { RubyDefinition } from "./types";
import { VersionManager } from "./versionManager";

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

  constructor(workspace: WorkspaceInterface = vscode.workspace) {
    this.workspace = workspace;
  }

  getRubyDefinition(): RubyDefinition | null {
    const config = this.workspace.getConfiguration("rubyEnvironments");
    const rubyVersion = config.get<string | null>("rubyVersion");

    if (!rubyVersion) {
      // Return null if not configured - let the caller decide how to handle this
      return null;
    }

    return {
      error: false,
      rubyVersion,
      availableJITs: [],
      env: {},
      gemPath: [],
    };
  }
}
