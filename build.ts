import * as Path from "https://deno.land/std@0.202.0/path/mod.ts";
import { parse as parseArgs } from "https://deno.land/std@0.202.0/flags/mod.ts";

import * as esbuild from "https://deno.land/x/esbuild@v0.19.6/wasm.js";

import denoConf from "./deno.json" with {type: "json"};

const args = parseArgs(Deno.args, {
    boolean: ["watch", "serve"],
    string: [ "outDir", "inFile" ],
    collect: "inFile",
    alias: { watch: "w", inFile: "i" },
    default: {
        outDir: "./dist",
        inFile: ["./src/index.ts"],
    }
});

const importMapPlugin = ((map): esbuild.Plugin =>({
    name: "importMapHandler",
    setup(build) {

        const pathToRegexp = (mapFrom:string) =>
            new RegExp(mapFrom.endsWith("/") ?`^${mapFrom}` : `^${mapFrom}$`);

        const entries = Object.entries(map)
            .sort(([l,],[r,])=> r.length - l.length)
            .map(([mapFrom, mapTo]):[RegExp,string]=>([ pathToRegexp(mapFrom), mapTo ]));

        const filter = new RegExp(entries.map(([r,])=> r.source).join("|"));

        //console.log(`big filter: ${filter}`);

        build.onResolve({ filter }, async (args) => {
            if (args.kind !== "import-statement")
                return null;
            if (args.pluginData?.alreadyMapped == true)
                return null;

            //console.log(`resolving ${JSON.stringify(args)} in importMapHandler`);

            const { path: srcPath } = args;

            for(const [ matcher, mapTo ] of entries) {
                if (!matcher.test(srcPath))
                    continue;

                const path = srcPath.replace(matcher, mapTo);
                console.log(`import map transformed ${srcPath} to ${path}`)

                const opts = (({namespace, kind, importer, resolveDir}): esbuild.ResolveOptions =>{
                    return {
                        namespace, kind, importer, resolveDir,
                        pluginData: {alreadyMapped: true}
                    };
                })(args);
                //console.log(`re-resolving ${path} with ${JSON.stringify(opts)}`)

                const otherResult = await build.resolve(path,opts);

                return otherResult;
            }
        });
    }
}))(denoConf.imports);

const wasmFileSystemAccess: esbuild.Plugin = {
    name: "wasmFileSystemAccess",
    setup(build) {
        const namespace = "wasmFsAdapter";

        // shunt local (./) stuff into our namespace
        build.onResolve({ filter: /^\.\//, }, (args) => {
            //console.log(`resolving ${JSON.stringify(args)} in wasmFileSystemAccess}`);
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

        // grab the stuff in our namespace and load it from the filesystem
        build.onLoad({ filter: /.*/, namespace }, async (args) => {
            // TOOD? cache with the help of Deno.stat(path).mtime
            //console.log(`loading: ${JSON.stringify(args)}`);
            const contents = await Deno.readTextFile(args.path)

            const ext = args.path.split(".").reverse()[0];
            const loader =
                (ext == "ts" || ext == "tsx" || ext == "json") ?
                ext : "text";

            return { contents, loader }
        });

        // fixup ouput paths
        build.onEnd((result) => {
            const {outputFiles, metafile} = result;

            // ensure output file paths are relative
            if(outputFiles)
                for(const file of outputFiles) {
                    const {path} = file;
                    // strip leading (back)slashes -> (should) ensure path isn't absolute
                    const relPath = path.replace(/^[\/\\]+/, "");
                    // probaly unnecessary...
                    const destPath = Path.normalize(relPath);

                    //console.log(`Fixup path ${path} to ${destPath}...`);
                    file.path = destPath;
                }

            // clean references to our namespace out of the metafile
            // (may have missed some deeper occurances; I'll deal
            // with those if they become relevant)
            if(metafile) {
                const rmNS = (s:string) => s.replace(new RegExp(`^${namespace}:`),"");

                // oh, TypeScript... so silly sometimes
                type InObj<T> = Parameters<typeof Object.entries<T>>[0];
                const cleanObjKeys = <T>(o:InObj<T>) => Object.fromEntries(
                    Object.entries(o).map(([k,v])=>[rmNS(k),v])
                );

                metafile.inputs = cleanObjKeys(metafile.inputs);

                for(const outFile of Object.values(metafile.outputs)) {
                    if(outFile.entryPoint !== undefined)
                        outFile.entryPoint = rmNS(outFile.entryPoint);

                    outFile.inputs = cleanObjKeys(outFile.inputs);
                }
            }
        });
    },
};

const buildConfig = {
    plugins: [importMapPlugin, wasmFileSystemAccess],
    write: false as const,

    entryPoints: args.i,

    bundle: true as const,
    format: "esm" as const,
    metafile: true as const,
    minify: true,
    //    splitting: true,
    //    sourcemap: true,
    //    sourcemap: "inline",
    //    target: ["chrome58", "firefox57", "safari11", "edge16"],

    jsx: "automatic" as const,
    jsxImportSource: denoConf.compilerOptions.jsxImportSource,

    external: ["http://*", "https://*"],

    outdir: args.outDir,
    //    logLevel: "verbose"
};

const buildContext = await esbuild.context(buildConfig);

async function doBuild() {
    const result = await buildContext.rebuild();

    //console.log(result);

    const {errors, warnings, outputFiles} = result;
    const toWatch = Object.keys(result.metafile.inputs);

    if(warnings.length > 0)
        console.log(warnings.join("\n"));

    if(errors.length > 0) {
        console.log(errors.join("\n"));
        console.log("Not writing to output!!");
    }
    else {
        // should this be done in the plugin? probably?
        for(const {path, text} of outputFiles) {
            console.log(`Writing ${path}...`);
            await Deno.writeTextFile(path, text);
        }
    }
    return toWatch;
}

let toWatch = await doBuild();

//import archaeopteryx from "https://deno.land/x/archaeopteryx@1.1.0/mod.ts";
if(args.serve) {
    const {default: archaeopteryx} = await import("https://deno.land/x/archaeopteryx@1.1.0/mod.ts");

    await archaeopteryx({
        root: args.outDir,
        disableReload: true,
        dontList: true,
    });
}

if(args.watch) {
    while(true) {
        console.log(`Watching ${toWatch.length} files...`);
        const watcher = Deno.watchFs(toWatch);

        for await (const event of watcher) {
            if(event.kind === "access")
                continue;

            console.log(`fsWatcher got: ${JSON.stringify(event)}, rebuilding...`)
            break;
        }

        toWatch = await doBuild();
    }
}

esbuild.stop()
