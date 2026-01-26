import * as vscode from "vscode";
import { RubyEnvironmentsApi } from "./types";
import { RubyEnvironment } from "./rubyEnvironment";

export async function activate(context: vscode.ExtensionContext): Promise<RubyEnvironmentsApi> {
  const outputChannel = vscode.window.createOutputChannel("Ruby Environments", { log: true });
  context.subscriptions.push(outputChannel);

  const rubyEnvironment = new RubyEnvironment(context, outputChannel);
  await rubyEnvironment.activate();
  return rubyEnvironment;
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
