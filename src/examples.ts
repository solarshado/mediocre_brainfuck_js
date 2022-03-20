export type ExampleItem = {
    name:string;
    source:string;
    expectedOutput:string;
};

const examples:ExampleItem[] = [
    {
        // from: https://esolangs.org/wiki/Brainfuck#Hello.2C_World.21
        "name": "Basic Hello World",
        "source": "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.",
        "expectedOutput": "Hello World!\n"
    },
    {
        // from: http://brainfuck.org/tests.b
        "name": "Tests for several obscure problems. Should output an H.",
        "source": "[]++++++++++[>>+>+>++++++[<<+<+++>>>-]<<<<-]\"A*$\";?@![#>>+<<]>[>>]<<<<[>++<[-]]>.>.",
        "expectedOutput": "H"
    }
];
export default examples;
