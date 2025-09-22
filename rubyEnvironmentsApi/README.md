# Ruby environments

This npm module provides a TypeScript API for interacting with Ruby environments VS Code extension.

## Extension Settings

```
{
    "extensionDependencies": [
        "shopify.ruby-environments"
    ],
    "dependencies": {
        "@shopify/ruby-environments": "..."
    },
}
```

## API

```
// Import the API
import { RubyEnvironments } from '@shopify/ruby-environments';

// Load the RubyEnvironments API
const rubyEnvApi: RubyEnvironmentsApi = await RubyEnvironmentsApi.getApi();

// Retrieve the resolved Ruby environment.
const rubyEnv = await rubyEnvApi.getEnvironment(vscode.workspace.workspaceFolders[0]);
```
