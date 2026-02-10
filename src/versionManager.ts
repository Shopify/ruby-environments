import { RubyDefinition } from "./types";

/**
 * Base interface for Ruby version managers
 */
export interface VersionManager {
  /**
   * The identifier for this version manager
   */
  readonly identifier: string;

  /**
   * The display name for this version manager
   */
  readonly name: string;

  /**
   * Activate the Ruby environment and return the Ruby definition
   */
  activate(): Promise<RubyDefinition>;
}
