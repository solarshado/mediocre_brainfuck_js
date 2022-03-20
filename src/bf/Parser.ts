import {Parser, ParseResult} from "./common_types.ts";
import {RuntimeSettings} from "./RuntimeOptions.ts";

export interface ParsedCode {
    originalSource:string;
    cleanedSource:string;
    ast?:unknown;
}

export function parseSource(src:string, opts:RuntimeSettings):ParseResult<ParsedCode> {
    const cleaningRegex = opts.enableOctoDebug ? /[^-+,.<>\[\]#]/g : /[^-+,.<>\[\]]/g;

    const cleanedSource = src.replace(cleaningRegex,"");

    if(!areBracketsBalanced(cleanedSource))
        return {success: false, errorMessage: "Imbalanced brackets detected!"};

    // TODO? pre-assemble some sort of runnable structure?

    return {success: true, parsed: { cleanedSource, originalSource: src}};
}

export const BasicParser:Parser<ParsedCode> = parseSource;

function areBracketsBalanced(str:string):boolean {
    let open = 0;

    for(const char of str) {
        switch(char) {
            case '[':
                ++open;
            break;
            case ']':
                --open;
            if(open < 0)
                return false;
            break;
            default:
            break;
        }
    }
    return open == 0;
}
