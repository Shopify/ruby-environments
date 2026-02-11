import * as vscode from "vscode";

/**
 * Represents a Ruby environment that failed to activate
 */
export interface RubyError {
  error: true;
}

/**
 * JIT compiler types supported by Ruby
 */
export enum JitType {
  YJIT = "YJIT",
  ZJIT = "ZJIT",
}

/**
 * Represents a successfully activated Ruby environment
 */
export interface RubyEnvironment {
  error: false;
  rubyVersion: string;
  availableJITs: JitType[];
  env: NodeJS.ProcessEnv;
  gemPath: string[];
}

/**
 * Represents a Ruby environment definition - either an error or a successful environment
 */
export type RubyDefinition = RubyError | RubyEnvironment;

/**
 * Represents an optional Ruby environment definition
 */
export type OptionalRubyDefinition = RubyDefinition | null;

/**
 * Event data emitted when the Ruby environment changes
 */
export interface RubyChangeEvent {
  workspace: vscode.WorkspaceFolder | undefined;
  ruby: OptionalRubyDefinition;
}

/**
 * The public API that gets exposed to other extensions that depend on Ruby environments
 */
export interface RubyEnvironmentsApi {
  /** Activate all Ruby environments on extension load */
  activate: () => Promise<void>;
  /** Ensure the Ruby environment is activated for a specific workspace folder */
  activateWorkspace: (workspace: vscode.WorkspaceFolder | undefined) => Promise<void>;
  /** Get the Ruby definition for a specific workspace folder */
  getRuby: (workspace: vscode.WorkspaceFolder | undefined) => OptionalRubyDefinition;
  /** Event that fires when the Ruby environment changes for any workspace */
  onDidRubyChange: vscode.Event<RubyChangeEvent>;
}
