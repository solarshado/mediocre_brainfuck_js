import { RuntimeSettings } from "./RuntimeOptions.ts";
import type {Expand} from "./_util.ts";

export type SuccessResult<T> = Readonly<Expand<{ success: true } & T>>;
export type FailureResult<T> = Readonly<Expand<{ success: false } & T>>;
export type BaseResult<TSuccess,TFailure> = SuccessResult<TSuccess> | FailureResult<TFailure>;
export type Result<TSuccess> = BaseResult<TSuccess,{errorMessage:string}>;

export type SuccessPart<TResult> = TResult extends SuccessResult<unknown> ? TResult : never;
export type ErrorPart<TResult> = TResult extends FailureResult<unknown> ? TResult : never;

export type ParseResult<TParsed> = Result<{parsed:TParsed}>
export type RunResult = Result<{output:string}>

export function isErrorResult<T extends BaseResult<unknown,unknown>>(obj:T|undefined): obj is ErrorPart<T> {
    return obj !== undefined && obj.success === false;
}

export type Parser<TParserOutput> = (source:string, options:RuntimeSettings)=> ParseResult<TParserOutput>;

export interface EngineBuilder<TParserOutput> {
    new (parserOutput:TParserOutput, options:RuntimeSettings, stdin:string): Engine;
}

export interface Engine {
    run():Promise<RunResult>;
}

