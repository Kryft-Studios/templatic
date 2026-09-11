import { parseArgs, ParseArgsOptionsConfig } from "node:util";
import chalk from "chalk";
import { assert } from "node:console";
import { Assert } from "node:assert";

// ============================================================================
// Types
// ============================================================================
export type conflict = {
  for: string;
  if: (boolean | string)[] | boolean | string;
  ifIsAny?: boolean;
  ifIAm?: boolean | string;
  on?: "warn" | "error";
};

export type option_config = (
  | {
      type: "string";
      default?: string;
    }
  | {
      type: "boolean";
      default?: boolean;
    }
  | {
      type: "union";
      default?: string;
      unionMembers: Set<string>;
    }
  | {
      type: "array";
      arrayMemberType:
        | {
            type: "string";
          }
        | { type: "boolean" }
        | { type: "union"; unionMembers: Set<string> }
        | { type: "custom"; regex: RegExp };
      default?: string[];
    }
  | {
      type: "custom";
      regex: RegExp;
      default?: string;
    }
) & {
  short?: string;
  description?: string;
  conflicts?: conflict[];
};

export type options_config = Record<string, option_config>;

export type option_value<T extends option_config> = T["type"] extends "boolean"
  ? boolean
  : T["type"] extends "union"
    ? T extends { unionMembers: infer U extends Set<string> }
      ? U extends Set<infer V>
        ? V
        : string
      : string
    : T["type"] extends "array"
      ? // @ts-ignore this @ts-ignore is a crime :>
        T["arrayMemberType"] extends infer U extends option_config
        ? option_value<U>[]
        : never
      : string;

export type parsed_options<T extends options_config> = {
  [K in keyof T]: option_value<T[K]>;
};

export type parsed_arguments<T extends options_config> = {
  values: parsed_options<T>;
  positionals: string[];
};

// ============================================================================
// Argument parsing
// ============================================================================
export function translateToParseArgsCfg(
  options: options_config,
): ParseArgsOptionsConfig {
  const result: ParseArgsOptionsConfig = {};

  for (const [name, option] of Object.entries(options)) {
    if (option.type === "boolean") {
      result[name] = {
        type: "boolean",
        short: option.short,
        default: option.default,
      };

      continue;
    }

    if (option.type === "array") {
      result[name] = {
        type: "string",
        multiple: true,
        short: option.short,
        default: option.default,
      };

      continue;
    }

    result[name] = {
      type: "string",
      short: option.short,
      default: option.default,
    };
  }

  return result;
}
export function parse<T extends options_config>(
  options: T,
  args: string[] = process.argv.slice(3),
): parsed_arguments<T> {
  const parsed = parseArgs({
    args,
    options: translateToParseArgsCfg(options),
    allowPositionals: true,
    allowNegative: true,
  });

  return {
    //@ts-ignore
    values: parsed.values as parsed_options<T>,
    positionals: parsed.positionals,
  };
}
export function err(name: string, message: string) {
  console.log(chalk.red(`[${name}] ERROR:`), message);
}
export function warn(name: string, message: string) {
  console.log(chalk.yellow(`[${name}] WARN:`), message);
}
export function validate<Cfg extends options_config>(
  name: string,
  options: Cfg,
  parsed: parsed_arguments<Cfg>,
) {
  for (const [command, config] of Object.entries(options)) {
    const value = parsed.values[command];
    if (!validateType(config, value)) {
      err(
        name,
        `At ${chalk.underlineRed(chalk.red(command))}: Invalid type. Expected ${Commands.stringifyType(config)}`,
      );
      throw "Invalid Type";
    }

    // CONFLICT HANDLING
    if (config.conflicts) {
      for (const conflict of config.conflicts) {
        const cmd = parsed.values[conflict.for];
        if (
          !conflict.ifIsAny
            ? Array.isArray(value)
              ? value.every((a) => {
                  return Array.isArray(conflict.if)
                    ? conflict.if.includes(a)
                    : a === conflict.if;
                })
              : Array.isArray(conflict.if)
                ? conflict.if.includes(value)
                : conflict.if === value
            : cmd &&
              cmd !== "" &&
              Array.isArray(cmd) &&
              typeof cmd[0] !== "undefined"
        ) {
          const reason = Array.isArray(value)
            ? Array.isArray(conflict.if)
              ? `${chalk.yellow(command)} contains values matching ${chalk.cyan(JSON.stringify(conflict.if))}`
              : `${chalk.yellow(command)} contains ${chalk.cyan(JSON.stringify(conflict.if))}`
            : Array.isArray(conflict.if)
              ? `${chalk.yellow(command)} has a value from ${chalk.cyan(JSON.stringify(conflict.if))}`
              : `${chalk.yellow(command)} is ${chalk.cyan(JSON.stringify(value))}`;

          (conflict.on === "error" ? err : warn)(
            name,
            `At ${chalk.underlineYellow(command)}: CONFLICT!
    WITH: ${chalk.magenta(conflict.for)}
    REASON: ${reason}`,
          );
        }
      }
    }
  }
}
export function validateType(
  type: option_config,
  value: string | boolean | string[] | undefined,
): boolean {
  if (value === undefined) return true;
  if (type.type === "string" || type.type === "boolean") return true;
  if (type.type === "custom") return !!type.regex.test(value as string);
  if (type.type === "union") {
    return type.unionMembers.has(value as string);
  }
  if (type.type === "array") {
    return (value as string[]).every((a) =>
      validateType(type.arrayMemberType, a),
    );
  }
  return true;
}
function qua<A>(v: A): asserts v is A {}
// ============================================================================
// Commands
// ============================================================================
export interface command_class<T extends options_config> {
  exec(positionals: string[], parsedOpts: parsed_options<T>): void | Promise<void>;
}
export type commands_config<T extends Record<string, options_config>> = {
  [K in keyof T]: command_config<T[K]>;
};
export type command_constructor<T extends options_config> = new (
  ...args: any[]
) => command_class<T>;

export type command_config<T extends options_config> = {
  class: command_constructor<T>;
  options: T;
  description: string;
};
export namespace Commands {
  export function begin<T extends Record<string, options_config>>(
    name: string,
    commandsConfig: commands_config<T>,
  ): void {
    determineCommand(commandsConfig, name);
  }

  function determineCommand(
    commands: commands_config<Record<string, options_config>>,
    name: string,
  ): void {
    const command = process.argv[2] as string | undefined;

    if (command && command in commands) {
      qua<command_config<options_config>>(commands[command]);
      const parsed = parse(commands[command].options, process.argv.slice(3));
      validate(name, commands[command].options, parsed);

      new commands[command].class().exec(parsed.positionals, parsed.values);
    } else Commands.help(commands, name);
  }

  // ------------------------------------------------------------------------
  // Help
  // ------------------------------------------------------------------------

  export function help(
    commandsConfig: commands_config<Record<string, options_config>>,
    name: string,
  ): void {
    const commands = Reflect.ownKeys(commandsConfig) as string[];
    console.log(`
${chalk.bold(name)}

${chalk.bold("Usage:")}

  ${name} <command> [options]

${chalk.bold("Commands:")}

  ${chalk.cyan("help")}
        Show this help message.

${commands.map(
  (a) => `
    ${chalk.yellow(a)}
        ${commandsConfig[a].description}
        
        ${chalk.magenta("Options:")}
        ${Object.entries(commandsConfig[a].options)
          .map(
            ([name, option]) => `
            ${chalk.green(`[--${name}${option.short ? ` | -${option.short}` : ""}]`)}
            ${chalk.blue(`<${stringifyType(option)}>`)}
            ${
              option.default !== undefined
                ? ` ${chalk.yellow(`DEFAULT: ${JSON.stringify(option.default)}`)}`
                : ""
            }${
              option.description
                ? `\n        ${chalk.cyan(option.description)}`
                : ""
            }${
              option.conflicts
                ? `\n        ${chalk.red("CONFLICTS:")}${option.conflicts
                    .map(
                      (conflict) => `
                    ${chalk.magenta("WITH:")} ${chalk.magenta(conflict.for)}
                    ${chalk.yellow("IF:")} ${
                      conflict.ifIsAny
                        ? chalk.yellow("any")
                        : chalk.yellow(JSON.stringify(conflict.if))
                    }${
                      conflict.ifIAm !== undefined
                        ? `\n            ${chalk.yellow("IF I AM:")} ${chalk.yellow(JSON.stringify(conflict.ifIAm))}`
                        : ""
                    }
                    ${chalk.red("ON CONFLICT:")} ${chalk.red(conflict.on ?? "warn")}`,
                    )
                    .join("")}`
                : ""
            }`,
          )
          .join("")}`,
)}

${chalk.bold("Options:")}
`);
  }
  export function stringifyType(type: option_config): string {
    if (type.type === "array") {
      return `Array<${stringifyType(type.arrayMemberType)}>`;
    }
    if (type.type === "union") {
      return `Union<${[...type.unionMembers].map((a) => `"${a}"`).join("|")}>`;
    }
    return type.type === "boolean"
      ? "boolean"
      : type.type === "string"
        ? "string"
        : type.type === "custom"
          ? `RegExp<${type.regex}>`
          : "unknown";
  }
}
