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
   * Get the Ruby definition from this version manager
   */
  getRubyDefinition(): RubyDefinition | null;
}
