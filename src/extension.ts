import * as vscode from "vscode";
import { RubyEnvironmentsApi } from "./types";
import { RubyEnvironment } from "./rubyEnvironment";

export function activate(context: vscode.ExtensionContext): RubyEnvironmentsApi {
  const outputChannel = vscode.window.createOutputChannel("Ruby Environments", { log: true });
  context.subscriptions.push(outputChannel);

  const rubyEnvironment = new RubyEnvironment(context, outputChannel);
  return rubyEnvironment;
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
