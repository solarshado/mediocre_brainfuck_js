import { Engine, EngineBuilder, RunResult } from "./common_types.ts";
import { ParsedCode } from "./Parser.ts";
import { RuntimeSettings } from "./RuntimeOptions.ts";
import { EOFHandler, eofHandlers, sleep } from "./_util.ts";

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

class _BasicEngine implements Engine {
    #isRunning = false;
    #stdout = "";
    #instructionPointer = 0;
    #memoryPointer = 0;
    #stdinPointer = 0;
    readonly #memory: Int8Array;
    readonly #eofFunc: EOFHandler;
    readonly #srcCode: string;

    constructor(
        parserOutput: ParsedCode,
        private readonly options: RuntimeSettings,
        private readonly stdin: string,
    ) {
        this.#srcCode = parserOutput.cleanedSource;
        this.#memory = new Int8Array(options.memoryCellCount);
        this.#eofFunc = eofHandlers[options.eofMode];
    }

    async run(): Promise<RunResult> {
        if(this.#isRunning)
            throw new Error("already running!");

        this.#isRunning = true;

        const memPointerMax = this.#memory.length - 1;
        const stdinPointerMax = this.stdin.length - 1;

        while(this.#instructionPointer < this.#srcCode.length) {
            await sleep(0);

            const curInst = this.#srcCode[this.#instructionPointer] as "<" | ">" | "," | "." | "+" | "-" | "[" | "]";
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
                            const inst = this.#srcCode[this.#instructionPointer];
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
                            const inst = this.#srcCode[this.#instructionPointer];
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
        return { success: true, output: this.#stdout };
    }
}

export const BasicEngine: EngineBuilder<ParsedCode> = _BasicEngine;
