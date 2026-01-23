# Ruby environments

This extension provides Ruby environment management for VS Code, providing ways for detecting the Ruby interpreter in the
user's machine with integrations to version managers. It is intended to be used as a dependency of other extensions that
need to activate the Ruby environment in order to launch Ruby executables, such as the
[Ruby LSP](https://github.com/Shopify/ruby-lsp) and [Ruby debug](https://github.com/ruby/vscode-rdbg).

## Features

- **Automatic Ruby detection**: Discovers the Ruby interpreter installed on your machine
- **Version manager integrations**: Supports popular version managers including:
  - [chruby](https://github.com/postmodern/chruby)
  - [rbenv](https://github.com/rbenv/rbenv)
  - [rvm](https://rvm.io/)
  - [asdf](https://asdf-vm.com/) (with ruby plugin)
  - [mise](https://mise.jdx.dev/)
- **Environment activation**: Composes the correct environment variables (`PATH`, `GEM_HOME`, `GEM_PATH`, etc.) to match your shell configuration
- **JIT detection**: Identifies available JIT compilers (YJIT, ZJIT) for the activated Ruby version
- **Shell support**: Works with various shells including bash, zsh, fish, and PowerShell
- **Extension API**: Provides a programmatic API for other extensions to access the activated Ruby environment

## Extension Settings

TODO

## API

This extension exposes an API that other extensions can use to access the activated Ruby environment.

### TypeScript Types

Type definitions are available as a separate npm package:

```bash
npm install --save-dev @shopify/ruby-environments-types
```

### Getting the API

```typescript
import type { RubyEnvironmentsApi } from "@shopify/ruby-environments-types";

const rubyEnvExtension = vscode.extensions.getExtension<RubyEnvironmentsApi>("Shopify.ruby-environments");

if (rubyEnvExtension) {
  if (!rubyEnvExtension.isActive) {
    await rubyEnvExtension.activate();
  }

  const api: RubyEnvironmentsApi = rubyEnvExtension.exports;
  // Use the API...
}
```

### Activating the Ruby Environment

Request the extension to activate Ruby for a specific workspace:

```typescript
await api.activate(vscode.workspace.workspaceFolders?.[0]);
```

### Getting the Current Ruby Definition

Retrieve the currently activated Ruby environment:

```typescript
import type { RubyDefinition } from "@shopify/ruby-environments-types";

const ruby: RubyDefinition | null = api.getRuby();

if (ruby === null) {
  console.log("Ruby environment not yet activated");
} else if (ruby.error) {
  console.log("Ruby activation failed");
} else {
  console.log(`Ruby version: ${ruby.rubyVersion}`);
  console.log(`Available JITs: ${ruby.availableJITs.join(", ")}`);
  console.log(`GEM_PATH: ${ruby.gemPath.join(":")}`);
}
```

### Subscribing to Ruby Environment Changes

Listen for changes to the Ruby environment (e.g., when the user switches Ruby versions):

```typescript
import type { RubyChangeEvent } from "@shopify/ruby-environments-types";

const disposable = api.onDidRubyChange((event: RubyChangeEvent) => {
  console.log(`Ruby changed in workspace: ${event.workspace?.name}`);

  if (!event.ruby.error) {
    console.log(`New Ruby version: ${event.ruby.rubyVersion}`);
  }
});

// Add to your extension's subscriptions for automatic cleanup
context.subscriptions.push(disposable);
```

### Extension Dependency

To ensure your extension loads after Ruby Environments, add it as a dependency in your `package.json`:

```json
{
  "extensionDependencies": ["Shopify.ruby-environments"]
}
```
