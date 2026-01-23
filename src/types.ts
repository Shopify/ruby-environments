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
 * Event data emitted when the Ruby environment changes
 */
export interface RubyChangeEvent {
  workspace: vscode.WorkspaceFolder | undefined;
  ruby: RubyDefinition;
}

/**
 * The public API that gets exposed to other extensions that depend on Ruby environments
 */
export interface RubyEnvironmentsApi {
  /** Activate the extension for a specific workspace */
  activate: (workspace: vscode.WorkspaceFolder | undefined) => Promise<void>;
  /** Get the current Ruby definition */
  getRuby: () => RubyDefinition | null;
  /** Event that fires when the Ruby environment changes */
  onDidRubyChange: vscode.Event<RubyChangeEvent>;
}
