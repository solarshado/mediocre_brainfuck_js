import { EOFMode } from "./RuntimeOptions.ts";

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve)=> setTimeout(resolve, ms));
}

export type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/** param is current cell value, output is new value if EOF was detected */
export type EOFHandler = (cur: number) => number;

export const eofHandlers: { [K in EOFMode]: EOFHandler } = {
    ZERO: () => 0,
    NEGATIVE_ONE: () => -1,
    NOP: (i: number) => i,
} as const;

export type OptionsFromSettings<TDefaults> = { -readonly [P in keyof TDefaults]?: TDefaults[P] };
