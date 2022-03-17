
/*
Brainfuck operates on an array of memory cells, each initially set to zero. There is a pointer, initially pointing to the first memory cell. The commands are:

>	Move the pointer to the right
<	Move the pointer to the left
+	Increment the memory cell at the pointer
-	Decrement the memory cell at the pointer
.	Output the character signified by the cell at the pointer
,	Input a character and store it in the cell at the pointer
[	Jump past the matching ] if the cell at the pointer is 0
]	Jump back to the matching [ if the cell at the pointer is nonzero

Memory
	Memory should normally consist of 8 bit cells, a very fast compiler may use 32bit or larger cells. Floating point cells are strongly discouraged as are cells that are not a power of two in size. "Bignum" cells are allowed but should be an option.
	Memory should wrap on overflow and underflow. (This also includes the [-] function with "bignum" cells).
	Negative memory addresses should NOT be assumed to exist, however, an interpreter may provide some. (An optimising interpreter may be forced to)
	Memory should consist of at least 30000 cells, some existing brainfuck programs do need more so this should be configurable or unbounded.

EOF
	An interpreter should normally either return Zero or leave the cell unchanged on EOF.
	Note: It is strongly recommended that an interpreter be configurable to all three normal form of EOF (Zero, minus one and unchanged).

*/

function sleep(ms:number):Promise<void> {
    return new Promise((resolve)=>setTimeout(resolve,ms));
}

class Engine {
    #isRunning = false;
    #stdout = "";
    #instructionPointer = 0;
    #memoryPointer = 0;
    #stdinPointer = 0;
    readonly #memory:Int8Array;
    readonly #eofFunc:EOFHandler;

    constructor(
        readonly srcCode:string,
        readonly stdin:string,
        options:RuntimeOptions,
    ) {
        this.#memory = new Int8Array(options.memoryCellCount);
        this.#eofFunc = eofHandlers[options.eofMode];
    }

    static build(parsed:ParsedCode,stdin:string,opts:RuntimeOptions):Engine {
        return new Engine(parsed.cleanedSource,stdin,opts);
    }

    async run():Promise<RunResult> {
        if(this.#isRunning)
            throw new Error("already running!");

        this.#isRunning = true;

        const memPointerMax = this.#memory.length - 1;
        const stdinPointerMax = this.stdin.length - 1;

        while(this.#instructionPointer < this.srcCode.length) {
            await sleep(0);

            const curInst = this.srcCode[this.#instructionPointer] as "<"|">"|","|"."|"+"|"-"|"["|"]";
            const stdinAtEOF = this.#stdinPointer > stdinPointerMax;
            
            switch(curInst) {
                case ">": {
                    const mp1 = this.#memoryPointer + 1;
                    this.#memoryPointer = mp1 > memPointerMax ? memPointerMax : mp1;
                    break;
                }
                case "<": {
                    const mm1 = this.#memoryPointer - 1;
                    this.#memoryPointer = mm1 < 0 ? 0 : mm1;
                    break;
                }
                case "+": {
                    ++this.#memory[this.#memoryPointer];
                    break;
                }
                case "-": {
                    --this.#memory[this.#memoryPointer];
                    break;
                }
                case ".": {
                    const curVal = this.#memory[this.#memoryPointer];
                    const valStr = String.fromCodePoint(curVal);
                    this.#stdout += valStr;
                    break;
                }
                case ",": {
                    if(!stdinAtEOF) {
                        const inChar = this.stdin[this.#stdinPointer];
                        ++this.#stdinPointer;
                        const charVal = inChar.codePointAt(0) ?? 0;

                        this.#memory[this.#memoryPointer] = charVal;
                    }
                    else {
                        this.#memory[this.#memoryPointer] = this.#eofFunc(this.#memory[this.#memoryPointer]);
                    }
                    break;
                }
                case "[": {
                    if(this.#memory[this.#memoryPointer] == 0) {
                        let open = 1;

                        while(open > 0) {
                            ++this.#instructionPointer;
                            const inst = this.srcCode[this.#instructionPointer];
                            if(inst == "[")
                                ++open;
                            else if(inst == "]")
                                --open;
                        }
                    }
                    break;
                }
                case "]": {
                    if(this.#memory[this.#memoryPointer] != 0) {
                        let open = 1;

                        while(open > 0) {
                            --this.#instructionPointer;
                            const inst = this.srcCode[this.#instructionPointer];
                            if(inst == "[")
                                --open;
                            else if(inst == "]")
                                ++open;
                        }
                    }
                    break;
                }
                default:
                    // NOP
            }

            ++this.#instructionPointer;
        }
        
        this.#isRunning = false;
        return new RunResultImpl(true,this.#stdout);
    }
}

export interface ParsedCode {
    originalSource:string;
    cleanedSource:string;
    ast?:unknown;
}

function parseSource(src:string,opts:RuntimeOptions):ParseResult {
    const cleaningRegex = opts.enableOctoDebug ? /[^-+,.<>\[\]#]/g : /[^-+,.<>\[\]]/g;

    const cleanedSource = src.replace(cleaningRegex,"");

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

    if(!areBracketsBalanced(cleanedSource))
        return {success: false, errorMessage: "Imbalanced brackets detected!"};
 
    // TODO? pre-assemble some sort of runnable structure?

    return {success: true, parsed: { cleanedSource, originalSource: src}};
}

/*
const NewlineMode = { } as const;
*/

const EOFMode = {
    ZERO: "ZERO",
    NEGATIVE_ONE: "NEGATIVE_ONE",
    NOP: "NOP",
} as const;

type EOFHandler = (cur:number) => number;
const eofHandlers: { [K in keyof typeof EOFMode]: EOFHandler} = {
    ZERO: ()=> 0,
    NEGATIVE_ONE: ()=> -1,
    NOP: (i:number)=> i,
} as const;

export const DefaultRuntimeOptions = {
    memoryCellCount: 30000 as number,
    memoryCellMinValue: 0 as number,
    memoryCellMaxValue: 2**8 as number,
    eofMode: EOFMode.ZERO as keyof typeof EOFMode,
    enableOctoDebug: false as boolean,
} as const;

type RuntimeOptions = typeof DefaultRuntimeOptions;

type OptsFromDefaults<TDefaults> = { -readonly [P in keyof TDefaults]?: TDefaults[P] };

export type RuntimeOpts = OptsFromDefaults<RuntimeOptions>;

function assembleOpts(input:RuntimeOpts):RuntimeOptions {
    return Object.assign({},DefaultRuntimeOptions,input);
}

export class Runtime {
    #parseResult?:ParseResult;
	#runResult?:RunResult;
    readonly options:RuntimeOptions;

	constructor(
        readonly code:string,
        readonly input="",
        options?:RuntimeOpts
    ) {
        this.options = options != undefined ? assembleOpts(options) : DefaultRuntimeOptions;
    }

	get hasParsed() { return this.#parseResult !== undefined; }
	get hasRan() { return this.#runResult !== undefined; }

	/** no need to call this explicitly: run() will ensure it gets called */
	parse() {
        this.#parseResult = parseSource(this.code,this.options);
        return this.#parseResult;
	}

	async run():Promise<RunResult> {
		if(!this.hasParsed)
            this.parse();

        // if parse failed, build runResult from parseResult
        if(isErrorResult(this.#parseResult))
            return this.#runResult = RunResultImpl.fromParseResult(this.#parseResult);

        if(isErrorResult(this.#runResult))
			return this.#runResult;

        const engine = Engine.build(this.#parseResult!.parsed,this.input,this.options);
        this.#runResult = await engine.run();

        return this.#runResult;
		//return new RunResultImpl(false, "TODO", "not yet implemented!");
	}
}

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type SuccessResult<T> = Readonly<Expand<{ success: true } & T>>;
type FailureResult<T> = Readonly<Expand<{ success: false } & T>>;
type BaseResult<TSuccess,TFailure> = SuccessResult<TSuccess> | FailureResult<TFailure>;
type Result<TSuccess> = BaseResult<TSuccess,{errorMessage:string}>;

type SuccessPart<TResult> = TResult extends SuccessResult<unknown> ? TResult : never;
type ErrorPart<TResult> = TResult extends FailureResult<unknown> ? TResult : never;

function isErrorResult<T extends BaseResult<unknown,unknown>>(obj:T|undefined): obj is ErrorPart<T> {
    return obj !== undefined && obj.success === false;
}

export type ParseResult = Result<{parsed:ParsedCode}>
export type RunResult = Result<{output:string}>

class RunResultImpl<T extends boolean> {
	constructor(
        readonly success:T,
        readonly output:string,
        readonly errorMessage=""
    ) {	}

    static fromParseResult(pr:ErrorPart<ParseResult>): ErrorPart<RunResult> {
        //if(isErrorResult(pr))
            return new RunResultImpl(pr.success, "<parse failure!>", pr.errorMessage);
        //else
        //    return undefined;
    }

	toString() {
		return `${this.output}\n${this.success ? "SUCCESS!" : `ERROR: ${this.errorMessage}`}`
	}
}
