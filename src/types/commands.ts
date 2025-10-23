/**
 * Type definitions mirroring Claude's memory tool command contract.
 * https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool
 */

export const DEFAULT_MEMORY_TOOL_NAME = "memory" as const;

export type MemoryToolName = string;

export const MEMORY_COMMANDS = [
  "view",
  "create",
  "str_replace",
  "insert",
  "delete",
  "rename",
] as const;

export type MemoryCommandName = (typeof MEMORY_COMMANDS)[number];

export type LineRange = readonly [startLine: number, endLine: number];

interface BaseCommand<Name extends MemoryCommandName> {
  readonly command: Name;
}

export interface ViewCommand extends BaseCommand<"view"> {
  readonly path: string;
  readonly view_range?: LineRange;
}

export interface CreateCommand extends BaseCommand<"create"> {
  readonly path: string;
  readonly file_text: string;
}

export interface StrReplaceCommand extends BaseCommand<"str_replace"> {
  readonly path: string;
  readonly old_str: string;
  readonly new_str: string;
}

export interface InsertCommand extends BaseCommand<"insert"> {
  readonly path: string;
  readonly insert_line: number;
  readonly insert_text: string;
}

export interface DeleteCommand extends BaseCommand<"delete"> {
  readonly path: string;
}

export interface RenameCommand extends BaseCommand<"rename"> {
  readonly old_path: string;
  readonly new_path: string;
}

export type MemoryCommand =
  | ViewCommand
  | CreateCommand
  | StrReplaceCommand
  | InsertCommand
  | DeleteCommand
  | RenameCommand;

export const isMemoryCommandName = (
  value: string | null | undefined,
): value is MemoryCommandName =>
  MEMORY_COMMANDS.includes(value as MemoryCommandName);
