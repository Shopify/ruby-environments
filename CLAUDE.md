# Instructions

Ruby environments is a VS Code extension that allows managing different Ruby interpreter versions in the user's machine.
The key feature is detecting where the interpreter is installed and composing the correct environment variables so that
Ruby gem executables can be launched from the editor in a way that matches the user's shell environment.

When working on this codebase, take the following things into consideration:

1. The extension needs to interact with the user's shell. Consider if the code properly supports a wide variety of shells,
   like bash, zsh, fish, PowerShell and so on
2. The extension provides integrations for the most popular version managers, like chruby, rbenv, asdf, mise, rvm and so
   on. Consider the specific behavior and settings of each manager when implementing features
3. The extension is intended to be used as a dependency by other extensions that need the Ruby environment to be correctly
   activated. Use strict encapsulation of the Ruby environment data, so that the user's environment data is protected and
   cannot be mutated by any API consumers. Essentially, ensure that no consumers of the API would be able to cause other
   extensions to crash
4. Ensure that the extension is being built using idiomatic TypeScript
5. Respect the VS Code API and UX guidelines, always aiming to provide optimal experiences

## Commands

- `yarn run compile`: type check, compile and lint the TypeScript code
- `yarn run test`: run all tests
