import type { CallingConventionExample, StepDefinition } from './types';

export const steps: ReadonlyArray<StepDefinition> = [
  {
    title: 'Initial State',
    asm: '',
    detail: 'The stack pointer (R6) sits below the caller\'s current frame. The calling convention begins when the caller starts pushing arguments.',
    actor: 'caller'
  },
  {
    title: 'Caller pushes arguments (right → left)',
    asm: 'ADD/STR args (right→left)',
    detail: 'Right-to-left means the last argument is pushed first, so arg1 ends up closest to the callee.',
    actor: 'caller'
  },
  {
    title: 'Caller executes JSR',
    asm: 'JSR callee',
    detail: 'JSR stores the return address in R7 and jumps to the callee.',
    actor: 'caller'
  },
  {
    title: 'Callee makes space for return value',
    asm: 'ADD R6, R6, #-1',
    detail: 'The callee reserves a 1-word slot where it will later store the return value.',
    actor: 'callee'
  },
  {
    title: 'Callee saves return address',
    asm: 'ADD R6, R6, #-1\nSTR R7, R6, #0',
    detail: 'Save R7 on the stack so the callee can safely use R7 (if needed).',
    actor: 'callee'
  },
  {
    title: 'Callee saves old frame pointer',
    asm: 'ADD R6, R6, #-1\nSTR R5, R6, #0',
    detail: 'Save caller\u2019s frame pointer so we can restore it before returning.',
    actor: 'callee'
  },
  {
    title: 'Callee sets frame pointer',
    asm: 'ADD R5, R6, #-1',
    detail: 'R5 is set to point to the first local variable.',
    actor: 'callee'
  },
  {
    title: 'Callee allocates locals',
    asm: 'ADD R6, R6, -numLocals',
    detail: 'Space for locals is allocated on the stack.',
    actor: 'callee'
  },
  {
    title: 'Callee saves registers',
    asm: 'STR Rx, R6, #0',
    detail: 'Registers used by the function body are saved so they can be restored later.',
    actor: 'callee'
  },
  {
    title: 'Callee does work (function body)',
    asm: 'STR Rx, R5, #3',
    detail: 'Return value is written into the reserved slot at address (R5 + 3).',
    actor: 'callee'
  },
  {
    title: 'Callee restores registers',
    asm: 'LDR Rx, R6, #0',
    detail: 'Saved registers are restored.',
    actor: 'callee'
  },
  {
    title: 'Callee removes locals',
    asm: 'ADD R6, R6, #numLocals',
    detail: 'Locals are deallocated by incrementing the stack pointer.',
    actor: 'callee'
  },
  {
    title: 'Callee restores old frame pointer',
    asm: 'LDR R5, R6, #0\nADD R6, R6, #1',
    detail: 'Restore caller\u2019s R5.',
    actor: 'callee'
  },
  {
    title: 'Callee restores return address',
    asm: 'LDR R7, R6, #0\nADD R6, R6, #1',
    detail: 'Restore the return address into R7.',
    actor: 'callee'
  },
  {
    title: 'Callee returns',
    asm: 'RET',
    detail: 'RET jumps to the address in R7 (the caller\u2019s next instruction).',
    actor: 'callee'
  },
  {
    title: 'Caller pops return value',
    asm: 'LDR Rv, R6, #0\nADD R6, R6, #1',
    detail: 'Caller reads the return value from the top of the stack (the slot the callee reserved).',
    actor: 'caller'
  },
  {
    title: 'Caller removes parameters',
    asm: 'ADD R6, R6, #numParams',
    detail: 'Caller cleans up parameters by incrementing SP past them.',
    actor: 'caller'
  }
];

export const examples: CallingConventionExample[] = [
  {
    id: 'add',
    name: 'Add Two Numbers',
    cCode: `int ADD_FUNCTION(int a, int b) {\n  int sum = a + b;\n  return sum;\n}\n\n// caller\nint result = ADD_FUNCTION(1, 2);`,
    numParams: 2,
    numLocals: 1,
    argValues: ['x0001', 'x0002'],
    argNames: ['a', 'b'],
    localNames: ['sum'],
    returnValue: 'x0003',
    calleeName: 'ADD_FUNCTION',
    usedRegs: ['R0', 'R1'],
    bodyAsm: [
      '; --- Body ---',
      'LDR R0, R5, #4    ; load a',
      'LDR R1, R5, #5    ; load b',
      'ADD R0, R0, R1    ; a + b',
      'STR R0, R5, #3    ; store sum',
      '; ------------'
    ]
  },
  {
    id: 'factorial',
    name: 'Factorial (Recursive)',
    cCode: `int FACTORIAL(int n) {\n  if (n <= 1) return 1;\n  int temp = FACTORIAL(n - 1);\n  return n * temp;\n}\n\n// caller\nint result = FACTORIAL(4);`,
    numParams: 1,
    numLocals: 1,
    argValues: ['x0004'],
    argNames: ['n'],
    localNames: ['temp'],
    returnValue: 'x0018',
    calleeName: 'FACTORIAL',
    usedRegs: ['R0', 'R1'],
    bodyAsm: [
      '; --- Body ---',
      'LDR R0, R5, #4    ; load n',
      'ADD R1, R0, #-1',
      'BRp RECURSE',
      'AND R0, R0, #0',
      'ADD R0, R0, #1    ; base case return 1',
      'BRnzp DONE',
      'RECURSE:',
      '                 ; (omitted FACTORIAL(n-1) call)',
      'DONE:',
      'STR R0, R5, #3    ; store temp',
      '; ------------'
    ]
  },
  {
    id: 'void_func',
    name: 'Void Function (No Return)',
    cCode: `void PRINT_MSG(int id) {\n  int status = 0;\n  // ...\n}\n\n// caller\nPRINT_MSG(5);`,
    numParams: 1,
    numLocals: 1,
    argValues: ['x0005'],
    argNames: ['id'],
    localNames: ['status'],
    returnValue: 'x0000',
    calleeName: 'PRINT_MSG',
    usedRegs: ['R0'],
    bodyAsm: [
      '; --- Body ---',
      'AND R0, R0, #0    ; status = 0',
      'STR R0, R5, #0    ; store status',
      '                 ; (omitted print)',
      '; ------------'
    ]
  },
  {
    id: 'many_args',
    name: 'Many Arguments',
    cCode: `int SUM(int a, int b, int c, int d) {\n  int s1 = a + b;\n  int s2 = c + d;\n  return s1 + s2;\n}\n\n// caller\nint result = SUM(1, 2, 3, 4);`,
    numParams: 4,
    numLocals: 2,
    argValues: ['x0001', 'x0002', 'x0003', 'x0004'],
    argNames: ['a', 'b', 'c', 'd'],
    localNames: ['s1', 's2'],
    returnValue: 'x000A',
    calleeName: 'SUM',
    usedRegs: ['R0', 'R1'],
    bodyAsm: [
      '; --- Body ---',
      'LDR R0, R5, #4    ; load a',
      'LDR R1, R5, #5    ; load b',
      'ADD R0, R0, R1    ; a + b',
      'STR R0, R5, #0    ; store s1',
      'LDR R0, R5, #6    ; load c',
      'LDR R1, R5, #7    ; load d',
      'ADD R0, R0, R1    ; c + d',
      'STR R0, R5, #-1   ; store s2',
      'LDR R0, R5, #0    ; load s1',
      'LDR R1, R5, #-1   ; load s2',
      'ADD R0, R0, R1    ; s1 + s2',
      'STR R0, R5, #3    ; store return value',
      '; ------------'
    ]
  }
];