import { RunResult, Result, ErrorPart, ParseResult } from "./common_types.ts";

export function stringifyResult(result: RunResult | Result<unknown>): string {
    return result.success ?
        `SUCCESS!${"output" in result ? ` OUTPUT:\n${result.output}` : ""}` :
        `ERROR: ${result.errorMessage}`;
}

export function buildRunErrorFromParseError(pr: ErrorPart<ParseResult<unknown>>): ErrorPart<RunResult> {
    return pr;
}
