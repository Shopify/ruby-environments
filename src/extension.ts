import * as vscode from "vscode";
import { RubyEnvironmentsApi } from "./types";
import { RubyEnvironment } from "./rubyEnvironment";

// Internal activation function that accepts optional output channel for testing
export function activateInternal(
  context: vscode.ExtensionContext,
  outputChannel?: vscode.LogOutputChannel,
): RubyEnvironmentsApi {
  // Use provided output channel or create a no-op one for tests
  const logger =
    outputChannel ||
    ({
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    } as unknown as vscode.LogOutputChannel);

  return new RubyEnvironment(context, logger);
}

export function activate(context: vscode.ExtensionContext): RubyEnvironmentsApi {
  // Create log output channel for production use
  const outputChannel = vscode.window.createOutputChannel("Ruby Environments", { log: true });
  context.subscriptions.push(outputChannel);

  return new RubyEnvironment(context, outputChannel);
}

export function deactivate() {
  // Extension cleanup happens automatically via context.subscriptions
}
