import * as Path from "https://deno.land/std@0.202.0/path/mod.ts";
import { parse as parseArgs } from "https://deno.land/std@0.202.0/flags/mod.ts";

import * as esbuild from "https://deno.land/x/esbuild@v0.19.6/wasm.js";

import denoConf from "./deno.json" with {type: "json"};

const args = parseArgs(Deno.args, {
    string: [ "outDir", /*"outFile",*/ "i" ],
    collect: "i",
    default: {
        outDir: "./dist",
        i: ["./src/index.ts"],
    }
});

const wasmFileSystemAccess: esbuild.Plugin = {
    name: "wasmFileSystemAccess",
    setup(build) {
        const namespace = "wasmFsAdapter";

        build.onResolve({ filter: /^https?:\/\// }, args => {
            return { path: args.path, external: true }
        });

        build.onResolve({ filter: /.*/, }, (args) => {
            //console.log(`resolving ${JSON.stringify(args)}`);
            if (args.kind === "entry-point") {
                return { path: args.path, namespace }
            }

            if (args.kind === "import-statement") {
                const dirname = Path.dirname(args.importer)
                const path = Path.join(dirname, args.path)
                return { path, namespace }
            }

            throw Error("not resolvable")
        });

        build.onLoad({ filter: /.*/, namespace }, async (args) => {
            //console.log(`loading: ${JSON.stringify(args)}`);
            const contents = await Deno.readTextFile(args.path)

            const ext = args.path.split(".").reverse()[0];
            const loader =
                (ext == "ts" || ext == "tsx" || ext == "json") ?
                ext : "text";

            return { contents, loader }
        });
    },
}

const result = await esbuild.build({
    plugins: [wasmFileSystemAccess],
    write: false,
    //entryPoints: ["src/index.ts",],
    entryPoints: args.i,
    bundle: true,
    format: "esm",
//    splitting: true,
    minify: true,
//    sourcemap: true,
//    sourcemap: "inline",
//    target: ["chrome58", "firefox57", "safari11", "edge16"],

    jsx: "automatic",
//    jsxImportSource: "https://esm.sh/preact",
    jsxImportSource: denoConf.compilerOptions.jsxImportSource,

    outdir: args.outDir,
    //outdir: "./build",
    metafile: true,
//    logLevel: "verbose"
})

//console.log(result);

const {errors, warnings, outputFiles} = result;

esbuild.stop()

if(errors.length > 0) {
    console.log(warnings.join("\n"));
    console.log(errors.join("\n"));
}
else {
    for(const {path, text} of outputFiles) {
        // strip leading (back)slashes -> (should) ensure path isn't absolute
        const relPath = path.replace(/^[\/\\]+/, "");
        // probaly unnecessary...
        const destPath = Path.normalize(relPath);
        console.log(`Writing ${path} to ${destPath}...`);
        await Deno.writeTextFile(destPath, text);
    }
}
