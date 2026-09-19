import { parseArgs, ParseArgsOptionsConfig } from "node:util";
import chalk from "chalk";
import { assert } from "node:console";
import { Assert } from "node:assert";

// ============================================================================
// Types
// ============================================================================
export type conflict = {
  for: string;
  if: possible_parsed_type;
  ifIsAny?: boolean;
  ifIAm?: boolean | string;
  on?: "warn" | "error";
};
export type string_config = {
  type: "string";
};
export type string_default_val = {
  default?: string;
};
export type number_config = {
  type: "number";
};
export type number_default = {
  default?: number;
};
export type possible_parsed_type =
  | string
  | boolean
  | number
  | possible_parsed_type[];
export type boolean_config = {
  type: "boolean";
};
export type boolean_default = {
  default?: boolean;
};
export type union_config = {
  type: "union";
  unionMembers: Set<string>;
};
export type regexp_config = {
  type: "regexp";
  regexp: RegExp;
};
export type custom_config = {
  type: "custom";
  fn(value: possible_parsed_type): boolean | Promise<boolean>;
};
export type array_config = {
  type: "array";
  arrayMemberType: type & { default?: undefined };
};
export type array_default = {
  default?: Extract<possible_parsed_type, any[]>;
};
export type type =
  | (string_config & string_default_val)
  | (boolean_config & boolean_default)
  | (union_config & string_default_val)
  | (regexp_config & string_default_val)
  | (custom_config & string_default_val)
  | (number_config & number_default)
  | (array_config & array_default);

export type option_config = (
  | type
  | {
      type: "array";
      arrayMemberType:
        | string_config
        | boolean_config
        | union_config
        | regexp_config
        | number_config;
      default?: string[];
    }
) & {
  short?: string;
  description?: string;
  conflicts?: conflict[];
};

export type options_config = Record<string, option_config>;
export type option_value<T extends option_config> =
  | (T["type"] extends "number"
      ? number
      : T["type"] extends "boolean"
        ? boolean
        : T["type"] extends "union"
          ? T extends { unionMembers: infer U extends Set<string> }
            ? U extends Set<infer V>
              ? V
              : string
            : string
          : T["type"] extends "array"
            ? //@ts-ignore
              T["arrayMemberType"] extends infer U extends option_config
              ? option_value<U>[]
              : never
            : string)
  | (T extends { default: any } ? never : undefined);

export type parsed_options<T extends options_config> = {
  [K in keyof T]: option_value<T[K]>;
};
export type parsed_positionals<T extends positionals_config> = {
  [K in Extract<keyof T, number>]: option_value<T[K]>;
};
export function translatePAToExpected<
  T extends positionals_config,
  U extends options_config,
>(
  positionals: T,
  options: U,
  parsed: ReturnType<typeof parseArgs>,
): parsed_arguments<U, T> {
  const pa = {
    positionals: [] as any[],
    values: {} as object,
  };
  for (let i = 0; i < positionals.length; i++) {
    pa.positionals[i] = translateToExpected(
      parsed.positionals[i],
      positionals[i],
    );
  }
  for (const [opt, value] of Object.entries(options)) {
    const val = parsed.values[opt];
    (pa.values as any)[opt] =
      typeof val === "undefined"
        ? value.default
        : translateToExpected(
            val as string | boolean | string[] | boolean[],
            options[opt],
          );
  }
  return pa as parsed_arguments<U, T>;
}
export function translateToExpected(
  val: string | boolean | string[] | boolean[],
  optionsConfig: type,
): possible_parsed_type {
  const type = typeof val;
  if (optionsConfig.type === "boolean") {
    return !!val;
  }
  if (optionsConfig.type === "number") {
    return +val;
  }
  if (optionsConfig.type === "array") {
    return [
      ...// @ts-ignore
      ((typeof val[Symbol.iterator] !== "undefined" ? val : [val]) as
        | string[]
        | boolean[]),
    ].map(function (a) {
      return translateToExpected(a, optionsConfig.arrayMemberType);
    });
  }
  return "" + val;
}
export function validatePositionals(
  config: positionals_config,
  positionals: possible_parsed_type[],
) {
  for (let i = 0; i < config.length; i++) {
    validateType(config[i], positionals[i]);
  }
}

export type parsed_arguments<
  T extends options_config,
  U extends positionals_config,
> = {
  values: parsed_options<T>;
  positionals: parsed_positionals<U>;
};
export type positionals_config = (type & { description?: string })[];
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
        ...(option.short ? { short: option.short } : {}),
        ...(option.default ? { default: option.default } : {}),
      };

      continue;
    }

    if (option.type === "array") {
      result[name] = {
        type: "string",
        multiple: true,
        ...(option.short ? { short: option.short } : {}),
        ...(option.default
          ? {
              default:
                typeof option.default === "undefined" ||
                typeof option.default === "number"
                  ? "" + option.default
                  : (option.default as string | boolean | string[] | boolean[]),
            }
          : {}),
      };

      continue;
    }

    result[name] = {
      type: "string",
      ...(option.short ? { short: option.short } : {}),
      ...(option.default
        ? {
            default:
              typeof option.default === "undefined" ||
              typeof option.default === "number"
                ? "" + option.default
                : (option.default as string | boolean | string[] | boolean[]),
          }
        : {}),
    };
  }

  return result;
}
export function parse<T extends options_config, U extends positionals_config>(
  options: T,
  positionals: U,
  args: string[] = process.argv.slice(3),
): parsed_arguments<T, U> {
  const parsed = parseArgs({
    args,
    options: translateToParseArgsCfg(options),
    allowPositionals: true,
    allowNegative: true,
  });

  return translatePAToExpected(positionals, options, parsed);
}
export function err(name: string, message: string) {
  console.log(chalk.red(`[${name}] ERROR:`), message);
  process.exit(0);
  throw "Error";
}
export function warn(name: string, message: string) {
  console.log(chalk.yellow(`[${name}] WARN:`), message);
}
export async function validate<
  Cfg extends options_config,
  Posit extends positionals_config,
>(
  name: string,
  options: Cfg,
  positionals: Posit,
  parsed: parsed_arguments<Cfg, Posit>,
) {
  for (let i = 0; i < positionals.length; i++) {
    if (typeof parsed.positionals[i] === "undefined") {
      err(
        name,
        `At ${chalk.underlineRedBright(chalk.red("Positional " + i))}: Positional not given`,
      );
      throw "Positional Not There";
    }
    qua<Exclude<any, undefined>>(parsed.positionals[i]);
    if (
      !validateType(
        positionals[i],
        parsed.positionals[i] as possible_parsed_type,
      )
    ) {
      err(name, 
                `At ${chalk.underlineRedBright(chalk.red("Positional " + i))}: Positional is of invalid type. expected a value that satisfies ${stringifyType(positionals[i])}`,

      )
    }
  }
  for (const [command, config] of Object.entries(options)) {
    const value = parsed.values[command] as possible_parsed_type;
    if (!(await validateType(config, value))) {
      err(
        name,
        `At ${chalk.underlineRed(chalk.red(command))}: Invalid type. Expected a value that satisfies ${stringifyType(config)}`,
      );
      throw "Invalid Type";
    }

    // CONFLICT HANDLING
    if (config.conflicts) {
      for (const conflict of config.conflicts) {
        const cmd = parsed.values[conflict.for];
        if (
          (!conflict.ifIsAny
            ? Array.isArray(cmd)
              ? cmd.every((a) => {
                  return Array.isArray(conflict.if)
                    ? //@ts-ignore
                      conflict.if.includes(a)
                    : a === conflict.if;
                })
              : Array.isArray(conflict.if)
                ? cmd !== undefined && conflict.if.includes(cmd)
                : cmd !== undefined && conflict.if === cmd
            : cmd &&
              cmd !== "" &&
              Array.isArray(cmd) &&
              typeof cmd[0] !== "undefined") &&
          (Array.isArray(conflict.ifIAm)
            ? conflict.ifIAm.includes(value)
            : typeof conflict.ifIAm === "undefined"
              ? true
              : conflict.ifIAm === value)
        ) {
          const reason = Array.isArray(cmd)
            ? Array.isArray(conflict.if)
              ? `${chalk.yellow(command)} contains values matching ${chalk.cyan(JSON.stringify(conflict.if))}`
              : `${chalk.yellow(command)} contains ${chalk.cyan(JSON.stringify(conflict.if))}`
            : Array.isArray(conflict.if)
              ? `${chalk.yellow(command)} has a value from ${chalk.cyan(JSON.stringify(conflict.if))}`
              : `${chalk.yellow(command)} is ${chalk.cyan(JSON.stringify(cmd))}`;

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
export async function validateType(
  type: type,
  value: possible_parsed_type,
): Promise<boolean> {
  if (typeof value === "undefined") return true;
  if (type.type === "string" && typeof value === "string") return true;
  if (type.type === "boolean" && typeof value === "boolean") return true;
  if (type.type === "regexp")
    return typeof value === "string" && !!type.regexp.test(value as string);
  if (type.type === "union") {
    return typeof value === "string" && type.unionMembers.has(value);
  }
  if (type.type === "custom") return await type.fn(value);
  if (type.type === "array") {
    return (value as string[]).every((a) =>
      validateType(type.arrayMemberType, a),
    );
  }
  return true;
}
function qua<A>(v: any): asserts v is A {}
// ============================================================================
// Commands
// ============================================================================
export interface command_class<
  T extends options_config,
  U extends positionals_config,
> {
  exec(
    positionals: parsed_positionals<U>,
    parsedOpts: parsed_options<T>,
  ): void | Promise<void>;
}
export type commands_config<
  T extends Record<string, options_config>,
  U extends Record<string, positionals_config>,
> = {
  [K in keyof T & keyof U]: command_config<T[K], U[K]>;
};
export type command_constructor<
  T extends options_config,
  U extends positionals_config,
> = new (...args: any[]) => command_class<T, U>;

export type command_config<
  T extends options_config,
  U extends positionals_config,
> = {
  class: command_constructor<T, U>;
  options: T;
  positionalsConfig: U;
  description: string;
};
export namespace Commands {
  export function begin<
    T extends Record<string, options_config>,
    U extends Record<string, positionals_config>,
  >(name: string, commandsConfig: commands_config<T, U>): void {
    determineCommand(commandsConfig, name);
  }

  async function determineCommand(
    commands: commands_config<
      Record<string, options_config>,
      Record<string, positionals_config>
    >,
    name: string,
  ) {
    const command = process.argv[2] as string | undefined;

    if (command && command in commands) {
      qua<command_config<options_config, positionals_config>>(
        commands[command],
      );
      const parsed = parse(
        commands[command].options,
        commands[command].positionalsConfig,
        process.argv.slice(3),
      );
      await validate(
        name,
        commands[command].options,
        commands[command].positionalsConfig,
        parsed,
      );

      new commands[command].class().exec(parsed.positionals, parsed.values);
    } else Commands.help(commands, name);
  }

  // ------------------------------------------------------------------------
  // Help
  // ------------------------------------------------------------------------

  export function help(
    commandsConfig: commands_config<
      Record<string, options_config>,
      Record<string, positionals_config>
    >,
    name: string,
  ): void {
    const commands = Reflect.ownKeys(commandsConfig) as string[];

    console.log(`
${chalk.bold(name)}

${chalk.bold("Usage")}
  ${chalk.cyan(name)} <command> [options]

${chalk.bold("Commands")}
  ${chalk.yellow("help")}  ${chalk.dim("Show this help message.")}

${commands
  .map((command) => {
    const config = commandsConfig[command];

    return `
  ${chalk.yellow(command)}
  ${chalk.dim(config.description)}

  ${chalk.magenta("Options")}
${Object.entries(config.options)
  .map(([optionName, option]) => {
    const flag = `--${optionName}`;
    const short = option.short ? `, -${option.short}` : "";
    const type = `<${stringifyType(option)}>`;

    const defaultValue =
      option.default !== undefined
        ? ` ${chalk.dim(`(default: ${JSON.stringify(option.default)})`)}`
        : "";

    const description = option.description
      ? `\n      ${chalk.dim(option.description)}`
      : "";

    const conflicts = option.conflicts
      ? `\n${option.conflicts
          .map(
            (conflict) => `      ${chalk.red("conflict")}
        ${chalk.dim("with:")} ${conflict.for}
        ${chalk.dim("if:")} ${
          conflict.ifIsAny ? "any" : JSON.stringify(conflict.if)
        }${
          conflict.ifIAm !== undefined
            ? `\n        ${chalk.dim("if I am:")} ${JSON.stringify(conflict.ifIAm)}`
            : ""
        }
        ${chalk.dim("on conflict:")} ${conflict.on ?? "warn"}`,
          )
          .join("\n")}`
      : "";

    return `    ${chalk.green(flag + short)} ${chalk.blue(type)}${defaultValue}${description}${conflicts}`;
  })
  .join("\n\n")}
  
  ${chalk.magenta("Positionals")}
${config.positionalsConfig
  .map((a, i) => {
    const defaultValue =
      a.default !== undefined
        ? ` ${chalk.dim(`(default: ${JSON.stringify(a.default)})`)}`
        : "";
    const type = `<${stringifyType(a)}>`;
    const description = a.description
      ? `\n      ${chalk.dim(a.description)}`
      : "";
    return `    ${chalk.green("Positional " + i)} ${chalk.blue(type)}${defaultValue}${description}`;
  })
  .join("\n\n")}
`;
  })
  .join("\n")}
`);
  }
}
export function stringifyType(type: option_config): string {
  if (type.type === "array") {
    return `Array<${stringifyType(type.arrayMemberType)}>`;
  }
  if (type.type === "union") {
    return `Union<${[...type.unionMembers].map((a) => `"${a}"`).join("|")}>`;
  }
  if (type.type === "custom") {
    const a = type.fn.toString().slice(0, 50);
    return `Eligidible<${a}${a !== type.fn.toString() ? "..." : ""}>`;
  }
  return type.type === "boolean"
    ? "boolean"
    : type.type === "number"
      ? "number"
      : type.type === "string"
        ? "string"
        : type.type === "regexp"
          ? `RegExp<${type.regexp}>`
          : "unknown";
}
