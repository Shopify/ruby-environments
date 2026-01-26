import * as vscode from "vscode";
import { RubyEnvironmentsApi } from "./types";
import { RubyEnvironment } from "./rubyEnvironment";

export function activate(context: vscode.ExtensionContext): RubyEnvironmentsApi {
  // Create log output channel for production use
  const outputChannel = vscode.window.createOutputChannel("Ruby Environments", { log: true });
  context.subscriptions.push(outputChannel);

  return new RubyEnvironment(context, outputChannel);
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
