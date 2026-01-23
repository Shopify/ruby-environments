import * as vscode from "vscode";
import { RubyDefinition } from "./types";

export class RubyStatus {
  public readonly item: vscode.LanguageStatusItem;

  constructor() {
    this.item = vscode.languages.createLanguageStatusItem("ruby-environments-status", {
      language: "ruby",
    });

    this.item.name = "Ruby Environment";
    this.item.severity = vscode.LanguageStatusSeverity.Information;
  }

  refresh(rubyDefinition: RubyDefinition | null) {
    if (rubyDefinition === null) {
      this.item.text = "Ruby: Not detected";
      this.item.detail = "No Ruby environment detected";
      this.item.severity = vscode.LanguageStatusSeverity.Warning;
    } else if (rubyDefinition.error) {
      this.item.text = "Ruby: Error";
      this.item.detail = "Error detecting Ruby environment";
      this.item.severity = vscode.LanguageStatusSeverity.Error;
    } else {
      const version = rubyDefinition.rubyVersion || "unknown";
      const jitStatus = rubyDefinition.availableJITs.length > 0 ? ` (${rubyDefinition.availableJITs.join(", ")})` : "";
      this.item.text = `Ruby ${version}${jitStatus}`;
      this.item.severity = vscode.LanguageStatusSeverity.Information;
    }
  }

  dispose() {
    this.item.dispose();
  }
}
