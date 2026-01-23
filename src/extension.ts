import * as vscode from "vscode";
import { RubyEnvironmentManager } from "./rubyEnvironment";
import { RubyEnvironmentsApi } from "./types";

export async function activate(context: vscode.ExtensionContext): Promise<RubyEnvironmentsApi> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const manager = new RubyEnvironmentManager(context);
  await manager.activate(workspaceFolder);
  return manager;
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
