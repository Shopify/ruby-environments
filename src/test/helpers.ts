import * as vscode from "vscode";

export type FakeContext = vscode.ExtensionContext & { dispose: () => void };

export function createContext(): FakeContext {
  const subscriptions: vscode.Disposable[] = [];

  return {
    subscriptions,
    dispose: () => {
      subscriptions.forEach((subscription) => {
        subscription.dispose();
      });
    },
  } as unknown as FakeContext;
}
