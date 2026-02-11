import * as vscode from "vscode";
import { RubyEnvironmentManager } from "./rubyEnvironmentManager";
import { RubyEnvironmentsApi } from "./types";

export async function activate(context: vscode.ExtensionContext): Promise<RubyEnvironmentsApi> {
  const manager = new RubyEnvironmentManager(context);
  await manager.activate();
  return manager;
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
