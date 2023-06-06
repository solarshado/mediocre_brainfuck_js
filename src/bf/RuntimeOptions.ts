import { OptionsFromSettings } from "./_util.ts";

/* const NewlineMode = { } as const; */

export const EOFModes = {
    ZERO: "ZERO",
    NEGATIVE_ONE: "NEGATIVE_ONE",
    NOP: "NOP",
} as const;

export type EOFMode = keyof typeof EOFModes;

export type RuntimeSettings = {
    readonly memoryCellCount: number;
    readonly memoryCellMinValue: number;
    readonly memoryCellMaxValue: number;
    readonly eofMode: EOFMode;
    readonly enableOctoDebug: boolean;
};

export const DefaultRuntimeSettings: RuntimeSettings = {
    memoryCellCount: 30000,
    memoryCellMinValue: 0,
    memoryCellMaxValue: 2 ** 8,
    eofMode: EOFModes.ZERO,
    enableOctoDebug: true,
};

export type RuntimeOptions = OptionsFromSettings<RuntimeSettings>;

export function buildRuntimeSettings(input: RuntimeOptions): RuntimeSettings {
    //return Object.assign({},DefaultRuntimeSettings,input);
    return buildSettingsFromOptions(input, DefaultRuntimeSettings);
}

function buildSettingsFromOptions<TSettings, TOptions extends OptionsFromSettings<TSettings>>(
    input: TOptions,
    defaults: TSettings
): TSettings {
    return Object.assign({}, defaults, input);
}
