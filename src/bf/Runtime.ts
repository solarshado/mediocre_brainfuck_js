import { EngineBuilder, isErrorResult, Parser, ParseResult, RunResult } from "./common_types.ts";
import { BasicParser, ParsedCode } from "./Parser.ts";
import { BasicEngine } from "./Engine.ts";
import { buildRuntimeSettings, DefaultRuntimeSettings, RuntimeOptions, RuntimeSettings } from "./RuntimeOptions.ts";
import { buildRunErrorFromParseError } from "./util.ts";

export const DEFAULT_PARSER = BasicParser;
export const DEFAULT_ENGINE = BasicEngine;

export class Runtime<TParserOutput = ParsedCode> {
    #parseResult?: ParseResult<TParserOutput>;
    #runResult?: RunResult;
    readonly #settings: RuntimeSettings;

    constructor(
        readonly code: string,
        readonly input: string,
        options: RuntimeOptions,
        readonly parser: Parser<TParserOutput>,
        readonly engine: EngineBuilder<TParserOutput>
    ) {
        this.#settings = buildRuntimeSettings(options);
    }

    static withDefaultParserAndEngine(
        code: string,
        input = "",
        options?: RuntimeOptions
    ) {
        return new Runtime(
            code,
            input,
            options ?? DefaultRuntimeSettings,
            DEFAULT_PARSER,
            DEFAULT_ENGINE
        );
    }

    get hasParsed() { return this.#parseResult !== undefined; }
    get hasRan() { return this.#runResult !== undefined; }

    /** no need to call this explicitly: run() will ensure it gets called */
    parse() {
        this.#parseResult = this.parser(this.code, this.#settings);
        return this.#parseResult;
    }

    async run(): Promise<RunResult> {
        if(!this.hasParsed)
            this.parse();

        // if parse failed, build runResult from parseResult
        if(isErrorResult(this.#parseResult))
            return this.#runResult = buildRunErrorFromParseError(this.#parseResult);

        if(isErrorResult(this.#runResult))
            return this.#runResult;

        const engine = new this.engine(this.#parseResult!.parsed, this.#settings, this.input);
        this.#runResult = await engine.run();

        return this.#runResult;
    }
}
