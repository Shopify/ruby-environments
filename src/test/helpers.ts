import * as vscode from "vscode";

export type FakeContext = vscode.ExtensionContext & { dispose: () => void };

export function createContext(): FakeContext {
  const subscriptions: vscode.Disposable[] = [];
  const workspaceStateStorage = new Map<string, unknown>();

  return {
    subscriptions,
    workspaceState: {
      get: <T>(key: string): T | undefined => {
        return workspaceStateStorage.get(key) as T | undefined;
      },
      update: (key: string, value: unknown): Thenable<void> => {
        workspaceStateStorage.set(key, value);
        return Promise.resolve();
      },
      keys: () => Array.from(workspaceStateStorage.keys()),
    },
    dispose: () => {
      subscriptions.forEach((subscription) => {
        subscription.dispose();
      });
    },
  } as unknown as FakeContext;
}
