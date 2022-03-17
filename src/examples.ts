export type ExampleItem = {
    name:string;
    source:string;
    expectedOutput:string;
};

const examples:ExampleItem[] = [
    {
        "name": "Basic Hello World",
        "source": "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.",
        "expectedOutput": "Hello World!\\n"
    },
    {
        "name": "Tests for several obscure problems. Should output an H.",
        "source": "[]++++++++++[>>+>+>++++++[<<+<+++>>>-]<<<<-]\"A*$\";?@![#>>+<<]>[>>]<<<<[>++<[-]]>.>.",
        "expectedOutput": "H"
    }
];
export default examples;
