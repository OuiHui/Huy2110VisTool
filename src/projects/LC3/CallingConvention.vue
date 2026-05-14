<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type CellKind =
  | 'arg'
  | 'ret-slot'
  | 'saved-r7'
  | 'saved-r5'
  | 'local'
  | 'other';

type Cell = {
  address: number;
  label: string;
  kind: CellKind;
  value?: string;
};

type MachineState = {
  R6: number;
  R5: number;
  R7: number;
  memory: Map<number, Cell>;
  highlightAddrs: Set<number>;
};

type StepActor = 'caller' | 'callee';

type DisplayRow =
  | {
      kind: 'cell';
      addr: number;
      addrHex: string;
      cell?: Cell;
      active: boolean;
      isSP: boolean;
      isFP: boolean;
      isHighlight: boolean;
      owner?: StepActor;
    }
  | {
      kind: 'ellipsis';
      id: string;
    };

const steps: ReadonlyArray<{
  title: string;
  asm: string;
  detail: string;
  actor: StepActor;
}> = [
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
    detail: 'Save caller’s frame pointer so we can restore it before returning.',
    actor: 'callee'
  },
  {
    title: 'Callee sets frame pointer & allocates locals',
    asm: 'ADD R5, R6, #-1\nADD R6, R6, -numLocals',
    detail: 'R5 is set to point to the first local variable. Space for locals is then allocated.',
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
    detail: 'Restore caller’s R5.',
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
    detail: 'RET jumps to the address in R7 (the caller’s next instruction).',
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
  },
  {
    title: 'Caller continues',
    asm: '(continue)',
    detail: 'Stack and registers are back to the caller’s pre-call state (modulo the return value now in a register).',
    actor: 'caller'
  }
];

const examples = [
  {
    id: 'add',
    name: 'Add Two Numbers',
    cCode: `int add(int a, int b) {\n  int sum = a + b;\n  return sum;\n}\n\n// caller\nint result = add(1, 2);`,
    numParams: 2,
    numLocals: 1,
    argValues: ['x0001', 'x0002'],
    argNames: ['a', 'b'],
    localNames: ['sum'],
    returnValue: 'x0003',
    calleeName: 'add',
    usedRegs: ['R0', 'R1'],
    bodyAsm: [
      '; --- Body ---',
      'LDR R0, R5, #4    ; load a',
      'LDR R1, R5, #5    ; load b',
      'ADD R0, R0, R1    ; a + b',
      'STR R0, R5, #0    ; store sum',
      '; ------------'
    ]
  },
  {
    id: 'factorial',
    name: 'Factorial (Recursive)',
    cCode: `int fact(int n) {\n  if (n <= 1) return 1;\n  int temp = fact(n - 1);\n  return n * temp;\n}\n\n// caller\nint result = fact(4);`,
    numParams: 1,
    numLocals: 1,
    argValues: ['x0004'],
    argNames: ['n'],
    localNames: ['temp'],
    returnValue: 'x0018',
    calleeName: 'fact',
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
      '                 ; (omitted fact(n-1) call)',
      'DONE:',
      'STR R0, R5, #0    ; store temp',
      '; ------------'
    ]
  },
  {
    id: 'void_func',
    name: 'Void Function (No Return)',
    cCode: `void print_msg(int id) {\n  int status = 0;\n  // ...\n}\n\n// caller\nprint_msg(5);`,
    numParams: 1,
    numLocals: 1,
    argValues: ['x0005'],
    argNames: ['id'],
    localNames: ['status'],
    returnValue: 'x0000',
    calleeName: 'print_msg',
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
    cCode: `int sum4(int a, int b, int c, int d) {\n  int s1 = a + b;\n  int s2 = c + d;\n  return s1 + s2;\n}\n\n// caller\nint result = sum4(1, 2, 3, 4);`,
    numParams: 4,
    numLocals: 2,
    argValues: ['x0001', 'x0002', 'x0003', 'x0004'],
    argNames: ['a', 'b', 'c', 'd'],
    localNames: ['s1', 's2'],
    returnValue: 'x000A',
    calleeName: 'sum4',
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
      '; ------------'
    ]
  }
];

const selectedExampleId = ref(examples[0].id);
const selectedExample = computed(() => examples.find(e => e.id === selectedExampleId.value) || examples[0]);

const stepIndex = ref(0);
const numParams = computed(() => selectedExample.value.numParams);
const numLocals = computed(() => selectedExample.value.numLocals);
const argValues = computed(() => selectedExample.value.argValues);
const argNames = computed(() => selectedExample.value.argNames);
const localNames = computed(() => selectedExample.value.localNames);
const calleeName = computed(() => selectedExample.value.calleeName);
const usedRegs = computed(() => selectedExample.value.usedRegs);
const bodyAsm = computed(() => selectedExample.value.bodyAsm);
const RETURN_VALUE = computed(() => selectedExample.value.returnValue);

watch(selectedExampleId, () => {
  stepIndex.value = 0;
});

function clamp16(v: number) {
  return ((v % 0x10000) + 0x10000) % 0x10000;
}

function hex16(v: number) {
  return 'x' + clamp16(v).toString(16).toUpperCase().padStart(4, '0');
}

function simulate(targetStep: number): MachineState {
  // Example starting registers (caller context)
  const initialSP = 0xFE00;
  const initialFP = 0xFE10;
  const initialPC = 0x3000;

  let R6 = initialSP;
  let R5 = initialFP;
  let R7 = 0x0000;

  const memory = new Map<number, Cell>();
  const highlightAddrs = new Set<number>();

  const push = (cell: Omit<Cell, 'address'>) => {
    R6 = clamp16(R6 - 1);
    const full: Cell = { address: R6, ...cell };
    memory.set(full.address, full);
    highlightAddrs.clear();
    highlightAddrs.add(full.address);
  };

  const write = (address: number, patch: Partial<Omit<Cell, 'address'>>) => {
    const addr = clamp16(address);
    const existing = memory.get(addr);
    const merged: Cell = {
      address: addr,
      label: patch.label ?? existing?.label ?? '(unlabeled)',
      kind: (patch.kind ?? existing?.kind ?? 'other') as CellKind,
      value: patch.value ?? existing?.value
    };
    memory.set(addr, merged);
    highlightAddrs.clear();
    highlightAddrs.add(addr);
  };

  // Step 0: caller pushes args
  if (targetStep >= 0) {
    // push right-to-left: argN first ... arg1 last
    for (let i = numParams.value; i >= 1; i--) {
      push({ kind: 'arg', label: `arg${i}`, value: argValues.value[i - 1] ?? '' });
    }
  }

  // Step 1: JSR
  if (targetStep >= 1) {
    // JSR stores the return address (PC+1) in R7. We use a concrete example PC.
    R7 = clamp16(initialPC + 1);
  }

  // Step 2: callee alloc return slot
  if (targetStep >= 2) {
    push({ kind: 'ret-slot', label: 'return value (slot)', value: '' });
  }

  // Step 3: push R7
  if (targetStep >= 3) {
    push({ kind: 'saved-r7', label: 'saved R7 (return addr)', value: hex16(R7) });
  }

  // Step 4: push old R5
  if (targetStep >= 4) {
    push({ kind: 'saved-r5', label: 'saved R5 (old FP)', value: hex16(R5) });
  }

  // Step 5: set new FP & allocate locals
  if (targetStep >= 5) {
    // After pushing old R5, R6 points to saved old R5.
    // Convention: R5 = R6 - 1 so FP points to first local.
    R5 = clamp16(R6 - 1);
    const L = Math.max(0, numLocals.value | 0);
    if (L > 0) {
      for (let i = 0; i < L; i++) {
        const addr = clamp16(R5 - i);
        memory.set(addr, { address: addr, kind: 'local', label: `local${i + 1}`, value: '' });
      }
      R6 = clamp16(R6 - L);
      highlightAddrs.clear();
      highlightAddrs.add(R6);
    }
  }

  // Step 6: save used registers
  if (targetStep >= 6) {
    // Conceptual only, visuals in HTML handle R0-R4
  }

  // Step 7: body work
  if (targetStep >= 7) {
    write(R5 + 3, { kind: 'ret-slot', label: 'return value (slot)', value: RETURN_VALUE.value });
  }

  // Step 8: restore used registers
  if (targetStep >= 8) {
    // conceptually restore registers here
  }

  // Step 9: remove locals
  if (targetStep >= 9) {
    const L = Math.max(0, numLocals.value | 0);
    if (L > 0) {
      R6 = clamp16(R6 + L);
      highlightAddrs.clear();
      highlightAddrs.add(R6);
    }
  }

  // Step 10: POP R5
  if (targetStep >= 10) {
    const cell = memory.get(R6);
    if (cell?.kind === 'saved-r5' && typeof cell.value === 'string' && cell.value.startsWith('x')) {
      const parsed = parseInt(cell.value.slice(1), 16);
      if (!Number.isNaN(parsed)) R5 = clamp16(parsed);
    } else {
      R5 = initialFP;
    }
    highlightAddrs.clear();
    highlightAddrs.add(R6);
    R6 = clamp16(R6 + 1);
  }

  // Step 11: POP R7
  if (targetStep >= 11) {
    const cell = memory.get(R6);
    if (cell?.kind === 'saved-r7' && typeof cell.value === 'string' && cell.value.startsWith('x')) {
      const parsed = parseInt(cell.value.slice(1), 16);
      if (!Number.isNaN(parsed)) R7 = clamp16(parsed);
    }
    highlightAddrs.clear();
    highlightAddrs.add(R6);
    R6 = clamp16(R6 + 1);
  }

  // Step 12: RET
  if (targetStep >= 12) {
  }

  // Step 13: caller pops return value
  if (targetStep >= 13) {
    highlightAddrs.clear();
    highlightAddrs.add(R6);
    R6 = clamp16(R6 + 1);
  }

  // Step 14: caller removes parameters
  if (targetStep >= 14) {
    R6 = clamp16(R6 + (Math.max(0, numParams.value | 0)));
    highlightAddrs.clear();
    highlightAddrs.add(R6);
  }

  // Step 15: caller continues (no-op)

  return { R6, R5, R7, memory, highlightAddrs };
}

const current = computed(() => simulate(stepIndex.value));

const previous = computed(() => simulate(Math.max(0, stepIndex.value - 1)));

const registerChanged = computed(() => {
  if (stepIndex.value <= 0) return { R6: false, R5: false, R7: false };
  const a = current.value;
  const b = previous.value;
  return {
    R6: a.R6 !== b.R6,
    R5: a.R5 !== b.R5,
    R7: a.R7 !== b.R7
  };
});

const currentActor = computed<StepActor>(() => steps[stepIndex.value]?.actor ?? 'caller');

const paramIndices = computed<number[]>(() => {
  const n = Math.max(0, numParams.value | 0);
  const out: number[] = [];
  for (let i = 1; i <= n; i++) out.push(i);
  return out;
});

const displayRows = computed<DisplayRow[]>(() => {
  const state = current.value;
  const keys: number[] = [];
  state.memory.forEach((_v, k) => { keys.push(k); });

  const highlightKeys: number[] = [];
  state.highlightAddrs.forEach((a) => highlightKeys.push(a));

  // Sparse memory window: show only meaningful addresses (written cells + R6/R5),
  // and collapse gaps into a single ellipsis row.
  const addrSet = new Set<number>();
  for (const k of keys) addrSet.add(k);
  for (const k of highlightKeys) addrSet.add(k);
  addrSet.add(state.R6);
  addrSet.add(state.R5);

  const addrs = Array.from(addrSet).sort((a, b) => a - b);
  const stackCeiling = keys.length ? Math.max(...keys) : null;

  const rows: DisplayRow[] = [];
  for (let i = 0; i < addrs.length; i++) {
    const addr = addrs[i];
    const next = addrs[i + 1];

    const existingCell = state.memory.get(addr);
    const isFP = addr === state.R5;
    const isSP = addr === state.R6;
    const active = stackCeiling === null ? false : (addr >= state.R6 && addr <= stackCeiling);

    const cell: Cell | undefined = existingCell
      ? existingCell
      : (isFP
          ? {
              address: addr,
              kind: 'other',
              label: 'old R5 points here (caller frame)',
              value: ''
            }
          : undefined);

    const owner: StepActor | undefined = !cell
      ? undefined
      : (cell.kind === 'arg'
          ? 'caller'
          : cell.kind === 'ret-slot' || cell.kind === 'saved-r7' || cell.kind === 'saved-r5' || cell.kind === 'local'
              ? 'callee'
              : isFP
                  ? 'caller'
                  : undefined);

    rows.push({
      kind: 'cell',
      addr,
      addrHex: hex16(addr),
      cell,
      active,
      isSP,
      isFP,
      isHighlight: state.highlightAddrs.has(addr),
      owner
    });

    if (typeof next === 'number') {
      const gap = (next - addr + 0x10000) % 0x10000;
      if (gap > 1) rows.push({ kind: 'ellipsis', id: `${addr}-${next}` });
    }
  }

  return rows;
});

type AsmLine = { text: string; step: number };

function splitAsmComment(text: string): { code: string; comment: string } {
  const idx = text.indexOf(';');
  if (idx === -1) return { code: text, comment: '' };
  return {
    code: text.slice(0, idx).trimEnd(),
    comment: text.slice(idx)
  };
}

const stepAsmLines = computed<string[]>(() => (steps[stepIndex.value]?.asm ?? '').split('\n'));

const callerAsm = computed<AsmLine[]>(() => {
  const pushLines: AsmLine[] = [];
  // Push arguments right-to-left (last arg pushed first)
  for (let i = argNames.value.length - 1; i >= 0; i--) {
    pushLines.push({ text: 'ADD R6, R6, #-1', step: 0 });
    // Show pushing from a register placeholder; comment labels the argument name
    pushLines.push({ text: `STR R${i}, R6, #0     ; push arg ${argNames.value[i]}`, step: 0 });
  }

  const popLines: AsmLine[] = [];
  // Caller can drop parameters by adjusting SP; no need to LDR each one
  for (let i = 0; i < numParams.value; i++) {
    popLines.push({ text: 'ADD R6, R6, #1     ; pop parameter', step: 14 });
  }

  return [
    { text: '.ORIG x3000', step: -1 },
    ...pushLines,
    { text: '', step: -1 },
    { text: `JSR ${calleeName.value}`, step: 1 },
    { text: '', step: -1 },
    { text: 'LDR R0, R6, #0     ; read return value', step: 13 },
    { text: 'ADD R6, R6, #1     ; pop return value', step: 13 },
    { text: '', step: -1 },
    ...popLines
  ];
});

const calleeAsm = computed<AsmLine[]>(() => {
  const saveRegs: AsmLine[] = [];
  const restoreRegs: AsmLine[] = [];

  // Conditionally generate save/restore for registers used by the function body
  if (usedRegs.value.length > 0) {
    for (let i = 0; i < usedRegs.value.length; i++) {
      saveRegs.push({ text: 'ADD R6, R6, #-1', step: 6 });
      saveRegs.push({ text: `STR ${usedRegs.value[i]}, R6, #0    ; save ${usedRegs.value[i]}`, step: 6 });
    }

    // Restores happen after the body; restore each register in reverse order
    for (let i = usedRegs.value.length - 1; i >= 0; i--) {
      restoreRegs.push({ text: `LDR ${usedRegs.value[i]}, R6, #0    ; restore ${usedRegs.value[i]}`, step: 8 });
      restoreRegs.push({ text: 'ADD R6, R6, #1', step: 8 });
    }
    restoreRegs.push({ text: '', step: -1 });
  }

  const lines: AsmLine[] = [
    { text: `${calleeName.value}`, step: -1 },
    { text: 'ADD R6, R6, #-1    ; reserve return slot', step: 2 },
    { text: '', step: -1 },
    { text: 'ADD R6, R6, #-1', step: 3 },
    { text: 'STR R7, R6, #0     ; save return address', step: 3 },
    { text: '', step: -1 },
    { text: 'ADD R6, R6, #-1', step: 4 },
    { text: 'STR R5, R6, #0     ; save old FP', step: 4 },
    { text: '', step: -1 },
    { text: 'ADD R5, R6, #-1    ; set new FP', step: 5 },
    { text: `ADD R6, R6, #${-numLocals.value}     ; reserve space for locals`, step: 5 },
    { text: '', step: -1 },
    ...saveRegs,
    // map body to the dedicated body step
    ...bodyAsm.value.map(line => ({ text: line, step: 7 })),
    ...restoreRegs,
    { text: `ADD R6, R6, #${numLocals.value}     ; pop locals`, step: 9 },
    { text: '', step: -1 },
    { text: 'LDR R5, R6, #0     ; restore old FP', step: 10 },
    { text: 'ADD R6, R6, #1', step: 10 },
    { text: '', step: -1 },
    { text: 'LDR R7, R6, #0     ; restore return addr', step: 11 },
    { text: 'ADD R6, R6, #1', step: 11 },
    { text: '', step: -1 },
    { text: 'RET', step: 12 }
  ];
  return lines;
});

// Arrow key support
import { onMounted, onUnmounted } from 'vue';

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight') {
    nextStep();
  } else if (e.key === 'ArrowLeft') {
    prevStep();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function nextStep() {
  stepIndex.value = Math.min(stepIndex.value + 1, steps.length - 1);
}

function prevStep() {
  stepIndex.value = Math.max(stepIndex.value - 1, 0);
}

function reset() {
  stepIndex.value = 0;
}
</script>

<template>
  <div class="px-4 py-3 max-w-[1600px] w-full mx-auto overflow-x-hidden">
    <header class="mb-3">
      <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
        LC-3 Calling Convention Visualizer
      </h1>
      <p class="mt-1 text-sm md:text-base text-surface-700 dark:text-surface-200 max-w-[90ch]">
        Step through the stack-frame lifecycle (caller → callee → caller) using the exact sequence you provided.
        In this view, addresses decrease upward so pushes visually build upward (R6 still decrements).
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr] gap-4">
      <div class="flex flex-col gap-3 cc-sticky">
        <Card>
          <template #title>Controls</template>
          <template #content>
            <div class="flex flex-col gap-3">
              <label class="flex flex-col gap-1">
              <span class="text-sm font-semibold text-surface-700 dark:text-surface-200">Select C Example</span>
              <Select v-model="selectedExampleId" :options="examples" optionLabel="name" optionValue="id" class="w-full text-left" />
            </label>

            <!-- Display the C code snippet -->
            <div class="cc-input font-mono cc-readonly text-xs overflow-x-auto whitespace-pre bg-surface-50 dark:bg-surface-900/50">
{{ selectedExample.cCode }}
            </div>

            <Divider />

            <div class="flex items-center gap-2">
              <Button @click="prevStep" :disabled="stepIndex === 0">Prev</Button>
              <Button @click="nextStep" :disabled="stepIndex === steps.length - 1">Next</Button>
              <Button severity="secondary" @click="reset">Reset</Button>
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex items-baseline justify-between">
                <div class="text-sm font-semibold text-surface-700 dark:text-surface-200">Step {{ stepIndex + 1 }} / {{ steps.length }}</div>
                <div class="text-xs text-surface-500 font-mono text-right">
                  <div v-for="(l, i) in stepAsmLines" :key="i" class="asm-mini-line">
                    <template v-if="l.trim().length">
                      <span class="asm-code">{{ splitAsmComment(l).code }}</span>
                      <span v-if="splitAsmComment(l).comment" class="asm-comment"> {{ splitAsmComment(l).comment }}</span>
                    </template>
                    <template v-else>
                      <span class="asm-blank">&nbsp;</span>
                    </template>
                  </div>
                </div>
              </div>
              <Slider v-model="stepIndex" :min="0" :max="steps.length - 1" :step="1" />
            </div>

            <Card class="mt-1" :dt="{ root: { background: 'transparent' } }">
              <template #title>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-base">{{ steps[stepIndex].title }}</span>
                  <span class="actor-chip" :class="currentActor">{{ currentActor }}</span>
                </div>
              </template>
              <template #content>
                <p class="text-sm text-surface-600 dark:text-surface-300">
                  {{ steps[stepIndex].detail }}
                </p>
              </template>
            </Card>
          </div>
        </template>
        </Card>

        
      </div>

      <div class="cc-right">
        <div class="flex flex-col gap-3">
          <Card>
            <template #title>Calling Convention Steps</template>
            <template #content>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 class="font-bold mb-1 border-b border-surface-200 dark:border-surface-700 pb-1">Buildup</h3>
                  <div class="mt-2 font-semibold">Caller:</div>
                  <ol class="list-decimal list-inside ml-1 space-y-1">
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 0}]">Pushes arguments right-to-left</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 1}]">JSR/JSRR to subroutine</li>
                  </ol>
                  <div class="mt-3 font-semibold">Then, Callee:</div>
                  <ol class="list-decimal list-inside ml-1 space-y-1" start="3">
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 2}]">Save space for return value</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 3}]">Save return address (R7)</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 4}]">Save old frame pointer (R5)</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 5}]">Set R5 &amp; Allocate locals</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 6}]">Saves Registers</li>
                  </ol>
                </div>
                <div>
                  <h3 class="font-bold mb-1 border-b border-surface-200 dark:border-surface-700 pb-1">Teardown</h3>
                  <div class="mt-2 font-semibold">Callee:</div>
                  <ol class="list-decimal list-inside ml-1 space-y-1" start="8">
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 7}]">Execute Body / Stores result</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 8}]">Restores Registers</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 9}]">Pops all local variables</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 10}]">Restores R5</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 11}]">Restores R7</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 12}]">RET</li>
                  </ol>
                  <div class="mt-3 font-semibold">Then, Caller:</div>
                  <ol class="list-decimal list-inside ml-1 space-y-1" start="14">
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 13}]">Loads return value</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 14}]">Pops return value and arguments</li>
                    <li :class="['transition-colors', {'font-bold text-primary dark:text-primary-400': stepIndex === 15}]">Continue</li>
                  </ol>
                </div>
              </div>
            </template>
          </Card>

          <Card>
            <template #title>Stack Frame Diagram</template>
            <template #content>
              <div class="stack-diagram w-full font-mono text-[13px] sm:text-sm shadow-sm flex flex-col mx-auto max-w-sm">
                <!-- R0-R4 -->
                <div class="transition-all duration-300 ease-in-out flex items-center border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800">
                  <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400">&nbsp;</div>
                  <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">R0-R4</div>
                  <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono text-surface-500"></div>
                </div>
                <!-- Saved Registers -->
                <template v-for="(regName, i) in [...usedRegs].reverse()" :key="'saved-reg-'+i">
                  <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 6 || stepIndex === 8 ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-50 dark:bg-surface-900']">
                    <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 6 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
                    <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">{{ regName }} Saved</div>
                    <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 6 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 6 && stepIndex <= 8 ? `Old ${regName}` : (stepIndex > 8 ? '????' : '????') }}</div>
                  </div>
                </template>
                <!-- Locals -->
                <template v-for="(localName, i) in [...localNames].reverse()" :key="'local-'+i">
                  <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 5 ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-200 dark:bg-surface-700']">
                    <div class="w-14 pr-2 py-1 text-right font-bold flex flex-col justify-center items-end gap-1">
                      <span v-if="i === 0" class="text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 5 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</span>
                      <span v-if="i === numLocals - 1" class="text-emerald-600 dark:text-emerald-400 transition-all duration-300 ease-in-out" :class="stepIndex >= 5 && stepIndex <= 10 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'">R5 &rarr;</span>
                    </div>
                    <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Local: {{ localName }}</div>
                    <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono text-surface-500">????</div>
                  </div>
                </template>
                <!-- Old R5 -->
                <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 4 || stepIndex === 10 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
                  <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="(stepIndex >= 4 && stepIndex <= 5) || stepIndex === 9 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
                  <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Old R5</div>
                  <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 4 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 4 ? 'xFE10' : '????' }}</div>
                </div>
                <!-- Return Address -->
                <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 3 || stepIndex === 11 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
                  <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 3 || stepIndex === 10 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
                  <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Return Address (old R7)</div>
                  <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 3 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 3 ? 'x3001' : '????' }}</div>
                </div>
                <!-- Return Value -->
                <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 2 || stepIndex === 13 || stepIndex === 7 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
                  <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 2 || stepIndex === 11 || stepIndex === 12 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
                  <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Return Value</div>
                  <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 7 && stepIndex <= 13 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 7 ? RETURN_VALUE : '????' }}</div>
                </div>
                <!-- Arguments -->
                <template v-for="(argName, i) in argNames" :key="'arg-'+i">
                  <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 0 || stepIndex === 14 ? 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 z-10' : 'bg-yellow-50 dark:bg-yellow-900/20']">
                    <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="(i === 0 && (stepIndex === 1 || stepIndex === 0 || stepIndex === 13)) || (stepIndex >= 14 && i === numParams - 1) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">
                      R6 &rarr;
                    </div>
                    <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Arg: {{ argName }}</div>
                    <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 0 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 0 ? (argValues[i] || 'N/A') : '????' }}</div>
                  </div>
                </template>
              </div>
            </template>
          </Card>
        </div>

        <Card>
          <template #title>LC-3 Assembly</template>
          <template #content>
            <div class="asm">
              <div class="asm-col">
                <div class="asm-head caller">Caller</div>
                <div class="asm-pre" role="list" aria-label="Caller assembly">
                  <div v-for="(line, idx) in callerAsm" :key="idx" :class="['asm-line', 'caller', { current: stepIndex === line.step }]" role="listitem">
                    <template v-if="line.text.trim().length">
                      <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
                    </template>
                    <template v-else>
                      <span class="asm-blank">&nbsp;</span>
                    </template>
                  </div>
                </div>
              </div>
              <div class="asm-col">
                <div class="asm-head callee">Callee</div>
                <div class="asm-pre" role="list" aria-label="Callee assembly">
                  <div v-for="(line, idx) in calleeAsm" :key="idx" :class="['asm-line', 'callee', { current: stepIndex === line.step && currentActor === 'callee' }]" role="listitem">
                    <template v-if="line.text.trim().length">
                      <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
                    </template>
                    <template v-else>
                      <span class="asm-blank">&nbsp;</span>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cc-input {
  border: 1px solid rgba(0,0,0,0.15);
  background: rgba(255,255,255,0.9);
  border-radius: .6rem;
  padding: .48rem .65rem;
  outline: none;
}

.cc-readonly {
  user-select: text;
}

@media (prefers-color-scheme: dark) {
  .cc-input {
    border-color: rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.92);
  }
}

.reg { padding: .65rem .75rem; border-radius: .8rem; border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.75); }
.reg-k { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: rgba(0,0,0,0.68); font-weight: 800; }
.reg-v { font-size: 1.05rem; font-weight: 700; }

.reg.changed {
  outline: 2px solid rgba(179, 163, 105, 0.55);
  box-shadow: 0 0 0 4px rgba(179, 163, 105, 0.12);
}

@media (prefers-color-scheme: dark) {
  .reg { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }
  .reg-k { color: rgba(255,255,255,0.78); }
  .reg.changed {
    outline-color: rgba(179, 163, 105, 0.55);
    box-shadow: 0 0 0 4px rgba(179, 163, 105, 0.12);
  }
}

.cc-right { display: grid; grid-template-columns: 1fr; gap: .75rem; }
@media (min-width: 1280px) {
  .cc-right { grid-template-columns: 420px 1fr; align-items: start; }
}

.cc-sticky { align-self: start; }
@media (min-width: 1024px) {
  .cc-sticky { position: sticky; top: 76px; }
}

.stack { display: flex; flex-direction: column; gap: .25rem; }
.stack-head {
  display: grid;
  grid-template-columns: 84px 1fr;
  padding: .35rem .6rem;
  font-size: .75rem;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(0,0,0,0.75);
}

.row-head { display: grid; grid-template-columns: 120px 1fr; }
.ptr-head { padding-left: .15rem; }

@media (prefers-color-scheme: dark) {
  .stack-head { color: rgba(255,255,255,0.88); }
}

.stack-body {
  overflow: visible;
}

.stack-line {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: .25rem;
  align-items: stretch;
}

.stack-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: .25rem;
  align-items: center;
  padding: .38rem .6rem;
  border-radius: .7rem;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.86);
}

.stack-ellipsis {
  display: grid;
  place-items: center;
  border-radius: .7rem;
  border: 1px dashed rgba(0,0,0,0.14);
  background: rgba(0,0,0,0.02);
  padding: .38rem .6rem;
}

.ellipsis-dots {
  display: flex;
  flex-direction: column;
  gap: .22rem;
}

.ellipsis-dots .dot {
  width: .28rem;
  height: .28rem;
  border-radius: 999px;
  background: rgba(0,0,0,0.35);
}

@media (prefers-color-scheme: dark) {
  .stack-row { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }
  .stack-ellipsis { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.03); }
  .ellipsis-dots .dot { background: rgba(255,255,255,0.42); }
}

.stack-row.inactive { opacity: .52; filter: grayscale(0.1); }
.stack-row.highlight { outline: 2px solid rgba(179, 163, 105, 0.55); }
.stack-row.highlight.highlight-caller { outline-color: rgba(0, 96, 168, 0.85); }
.stack-row.highlight.highlight-callee { outline-color: rgba(0, 160, 96, 0.85); }
.stack-row.sp { box-shadow: inset 3px 0 0 rgba(0, 96, 168, 0.85); }
.stack-row.fp { box-shadow: inset 3px 0 0 rgba(0, 160, 96, 0.85); }

.stack-row.owner-caller { background: rgba(0, 96, 168, 0.06); border-color: rgba(0, 96, 168, 0.16); }
.stack-row.owner-callee { background: rgba(0, 160, 96, 0.06); border-color: rgba(0, 160, 96, 0.16); }

.addr { color: rgba(0,0,0,0.82); }

.ptr-gutter { display: flex; flex-direction: column; gap: .28rem; align-items: flex-start; padding: .38rem 0 0 .6rem; }
.ptr {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: .12rem .35rem;
  border-radius: .5rem;
  font-weight: 950;
  letter-spacing: .02em;
  border: 1px solid rgba(0,0,0,0.12);
  color: rgba(0,0,0,0.78);
  background: rgba(0,0,0,0.04);
}
.ptr.ptr-sp { border-color: rgba(0, 96, 168, 0.35); background: rgba(0, 96, 168, 0.12); }
.ptr.ptr-fp { border-color: rgba(0, 160, 96, 0.35); background: rgba(0, 160, 96, 0.12); }

.contents .label { display: inline-flex; align-items: baseline; gap: .5rem; }
.contents .kind { font-size: .75rem; color: rgba(0,0,0,0.45); }
.contents .value { color: rgba(0,0,0,0.75); font-weight: 800; }
.empty { color: rgba(0,0,0,0.35); font-style: italic; }

@media (prefers-color-scheme: dark) {
  .addr { color: rgba(255,255,255,0.92); }
  .ptr { border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.92); background: rgba(255,255,255,0.06); }
  .ptr.ptr-sp { border-color: rgba(0, 96, 168, 0.55); background: rgba(0, 96, 168, 0.22); }
  .ptr.ptr-fp { border-color: rgba(0, 160, 96, 0.55); background: rgba(0, 160, 96, 0.22); }
  .stack-row.owner-caller { background: rgba(0, 96, 168, 0.14); border-color: rgba(0, 96, 168, 0.22); }
  .stack-row.owner-callee { background: rgba(0, 160, 96, 0.14); border-color: rgba(0, 160, 96, 0.22); }
  .contents .kind { color: rgba(255,255,255,0.62); }
  .contents .value { color: rgba(255,255,255,0.92); }
  .empty { color: rgba(255,255,255,0.5); }
}

.legend { margin-top: .45rem; display: flex; gap: .9rem; flex-wrap: wrap; font-size: .8rem; color: rgba(0,0,0,0.7); }
.dot { width: .65rem; height: .65rem; border-radius: 999px; display: inline-block; margin-right: .45rem; vertical-align: middle; }
.dot.active { background: rgba(0, 96, 168, 0.75); }
.dot.inactive { background: rgba(0,0,0,0.25); }
.dot.highlight-caller { background: rgba(0, 96, 168, 0.85); }
.dot.highlight-callee { background: rgba(0, 160, 96, 0.85); }

@media (prefers-color-scheme: dark) {
  .legend { color: rgba(255,255,255,0.78); }
  .dot.inactive { background: rgba(255,255,255,0.28); }
}

.actor-chip {
  font-size: .72rem;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: .22rem .5rem;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.12);
  color: rgba(0,0,0,0.75);
  background: rgba(0,0,0,0.04);
}

.actor-chip.caller { border-color: rgba(0, 96, 168, 0.35); background: rgba(0, 96, 168, 0.12); }
.actor-chip.callee { border-color: rgba(0, 160, 96, 0.35); background: rgba(0, 160, 96, 0.12); }

@media (prefers-color-scheme: dark) {
  .actor-chip { border-color: rgba(255,255,255,0.16); color: rgba(255,255,255,0.92); background: rgba(255,255,255,0.06); }
  .actor-chip.caller { border-color: rgba(0, 96, 168, 0.55); background: rgba(0, 96, 168, 0.22); }
  .actor-chip.callee { border-color: rgba(0, 160, 96, 0.55); background: rgba(0, 160, 96, 0.22); }
}

.asm { display: grid; grid-template-columns: 1fr; gap: .75rem; min-width: 0; }
@media (min-width: 640px) {
  .asm { grid-template-columns: 0.85fr 1.15fr; }
}

.asm-col {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.asm-head {
  font-size: .75rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  font-weight: 950;
  margin-bottom: .4rem;
}
.asm-head.caller { color: rgba(0, 96, 168, 0.9); }
.asm-head.callee { color: rgba(0, 160, 96, 0.9); }

.asm-pre {
  border-radius: .75rem;
  border: 1px solid rgba(0,0,0,0.12);
  background: rgba(255,255,255,0.7);
  padding: .6rem .7rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 550px;
}

.asm-line {
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: .85rem;
  color: rgba(0,0,0,0.72);
  padding: .2rem .3rem;
  border-radius: .45rem;
}

.asm-code { color: inherit; }
.asm-comment { color: rgba(0,0,0,0.48); }
.asm-blank { display: inline-block; min-width: 1px; }

.asm-mini-line { line-height: 1.2; }

.asm-line.current.caller { background: rgba(0, 96, 168, 0.14); outline: 1px solid rgba(0, 96, 168, 0.22); }
.asm-line.current.callee { background: rgba(0, 160, 96, 0.14); outline: 1px solid rgba(0, 160, 96, 0.22); }

@media (prefers-color-scheme: dark) {
  .asm-pre { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }
  .asm-line { color: rgba(255,255,255,0.88); }
  .asm-comment { color: rgba(255,255,255,0.58); }
  .asm-head.caller { color: rgba(0, 96, 168, 0.85); }
  .asm-head.callee { color: rgba(0, 160, 96, 0.85); }
  .asm-line.current.caller { background: rgba(0, 96, 168, 0.22); outline-color: rgba(0, 96, 168, 0.35); }
  .asm-line.current.callee { background: rgba(0, 160, 96, 0.22); outline-color: rgba(0, 160, 96, 0.35); }
}
</style>
