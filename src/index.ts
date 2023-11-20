import * as BF from "./bf/mod.ts";
//import examples from "./examples.json" assert { type: "json" };
import examples from "./examples.ts";

const codeTextArea = document.getElementById("txtCode") as HTMLTextAreaElement;
const inputTextArea = document.getElementById("txtInput") as HTMLTextAreaElement;
const outputTextArea = document.getElementById("txtOutput") as HTMLElement;
const runButton = document.getElementById("btnRun") as HTMLButtonElement;
const clearButton = document.getElementById("btnClear") as HTMLButtonElement;

(function addExamples() {
    const exampleList = document.getElementById("exampleList") as HTMLUListElement;

    function mkListener(content: string) {
        return () => codeTextArea.value = content;
    }

    for(const { name, source } of examples) {
        const ex = document.createElement("li");
        ex.innerText = name;
        ex.addEventListener("click", mkListener(source));
        exampleList.appendChild(ex);
    }
})();

function getCode() { return codeTextArea.value; }
function getInput() { return inputTextArea.value; }

function appendToOutput(string: string, linebreak = false) {
    if(linebreak) string += "\n";
    outputTextArea.append(string);
}

function clearOutput() {
    //const o = outputTextArea;
    //Array.prototype.forEach.call(o.childNodes,n=>o.removeChild(n))
    for(const child of outputTextArea.childNodes)
        outputTextArea.removeChild(child); // TODO dis not work. plx fx
}
clearButton.addEventListener("click", clearOutput);

async function runClick() {
    const code = getCode();
    const input = getInput();
    const runtime = BF.Runtime.withDefaultParserAndEngine(code, input);

    const previously = runButton.textContent;
    runButton.textContent = "Running...";
    runButton.disabled = true;

    const output = BF.util.stringifyResult(await runtime.run());

    runButton.textContent = previously;
    runButton.disabled = false;

    appendToOutput(output, true);
}
runButton.addEventListener("click", runClick);
