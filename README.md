# Ruby Environments

This extension provides Ruby environment management for VS Code, enabling detection and management of Ruby interpreters with proper environment variable composition. It supports multiple version managers and is designed to be used as a dependency by other extensions that need to activate the Ruby environment, such as the [Ruby LSP](https://github.com/Shopify/ruby-lsp) and [Ruby Debug](https://github.com/ruby/vscode-rdbg).

## Features

### Ruby Environment Detection

- **Automatic Detection**: Detects your Ruby installation and gathers environment information
- **Version Display**: Shows current Ruby version in the status bar
- **YJIT Status**: Indicates whether YJIT is enabled in your Ruby installation
- **Environment Variables**: Properly composes environment variables to match your shell environment

### Version Manager Support

Currently supported version managers:

- **Configured Ruby**: Uses a Ruby executable path from VS Code settings

Coming soon:

- chruby
- rbenv
- asdf
- mise
- rvm

### Interactive Commands

- **Select Ruby Version** (`ruby-environments.selectRubyVersion`): Choose your version manager and configure the Ruby executable path
  - Browse file system for Ruby executable
  - Enter path manually
  - Automatic environment reactivation on configuration changes

### Status Bar Integration

A language status item for Ruby files that shows:

- Current Ruby version (e.g., "Ruby 3.3.0")
- YJIT status indicator when enabled (e.g., "Ruby 3.3.0 (YJIT)")
- Quick access to version selection
- Error states for failed activation
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

This extension contributes the following settings:

- `rubyEnvironments.versionManager`: Version manager to use for Ruby environment detection. Default: `"configured"`
- `rubyEnvironments.rubyExecutablePath`: Path to the Ruby executable when using the "Configured Ruby" version manager. Default: `"ruby"`

## Usage

### For End Users

1. Install the extension
2. Open a Ruby file
3. Click on the Ruby version in the status bar to configure your Ruby environment
4. Select your preferred version manager or configure a specific Ruby executable path

## For Extension Developers

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

## Development

### Prerequisites

- Node.js and Yarn
- VS Code

### Building

```bash
# Install dependencies
yarn install

# Compile TypeScript and watch for changes
yarn run compile

# Or use the watch task
yarn run watch
```

### Testing

```bash
# Run tests
yarn run test
```

### Debugging

1. Open the project in VS Code
2. Press F5 to launch the Extension Development Host
3. Open a Ruby file to see the extension in action

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/Shopify/ruby-environments. This project is intended to be a safe, welcoming space for collaboration.

## License

This extension is available as open source under the terms of the [MIT License](LICENSE.txt)
