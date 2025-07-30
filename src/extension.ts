import * as vscode from "vscode";

// The public API that gets exposed to other extensions that depend on Ruby environments
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RubyEnvironmentsApi {}

export function activate(_context: vscode.ExtensionContext): RubyEnvironmentsApi {
  return {};
}

export function deactivate() {}
