import * as vscode from "vscode";
import { RubyStatus } from "./status";
import { RubyChangeEvent, RubyEnvironmentsApi } from "./types";

// Event emitter for Ruby environment changes
const rubyChangeEmitter = new vscode.EventEmitter<RubyChangeEvent>();

export function activate(context: vscode.ExtensionContext): RubyEnvironmentsApi {
  // Ensure the event emitter is disposed when the extension is deactivated
  context.subscriptions.push(rubyChangeEmitter);

  // Create the status item
  const status = new RubyStatus();
  context.subscriptions.push(status);

  return {
    activate: async (_workspace: vscode.WorkspaceFolder | undefined) => {},
    getRuby: () => null,
    onDidRubyChange: rubyChangeEmitter.event,
  };
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
