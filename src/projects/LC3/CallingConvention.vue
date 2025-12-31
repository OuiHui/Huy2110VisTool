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
    title: 'Callee sets new frame pointer',
    asm: 'ADD R5, R6, #-1',
    detail: 'R5 now points at the first local. After locals are removed, the saved old R5 will be on top of the stack for an easy POP.',
    actor: 'callee'
  },
  {
    title: 'Callee allocates locals',
    asm: 'ADD R6, R6, #-numLocals',
    detail: 'Space for locals is made by decrementing the stack pointer.',
    actor: 'callee'
  },
  {
    title: 'Callee does work (stores return value)',
    asm: 'STR Rx, R5, #3',
    detail: 'Return value is written into the reserved slot at address (R5 + 3).',
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

const stepIndex = ref(0);
const numParams = ref(2);
const numLocals = ref(2);

const argValues = ref<string[]>(['x0001', 'x0002']);
const RETURN_VALUE = 'x1234';

watch(numParams, (n: number) => {
  const next = [...argValues.value];
  // grow
  while (next.length < n) next.push(`x${(next.length + 1).toString(16).toUpperCase().padStart(4, '0')}`);
  // shrink
  next.length = n;
  argValues.value = next;
  // keep step index valid
  if (stepIndex.value > steps.length - 1) stepIndex.value = steps.length - 1;
});

watch(numLocals, (n: number) => {
  if (n < 0) numLocals.value = 0;
  if (stepIndex.value > steps.length - 1) stepIndex.value = steps.length - 1;
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

  // Step 5: set new FP
  if (targetStep >= 5) {
    // After pushing old R5, R6 points to saved old R5.
    // Convention: R5 = R6 - 1 so FP points to first local.
    R5 = clamp16(R6 - 1);
  }

  // Step 6: allocate locals
  if (targetStep >= 6) {
    const L = Math.max(0, numLocals.value | 0);
    if (L > 0) {
      // Locals live at addresses: R5, R5-1, ..., R5-(L-1)
      for (let i = 0; i < L; i++) {
        const addr = clamp16(R5 - i);
        memory.set(addr, {
          address: addr,
          kind: 'local',
          label: `local${i + 1}`,
          value: ''
        });
      }
      R6 = clamp16(R6 - L);
      highlightAddrs.clear();
      highlightAddrs.add(R6);
    }
  }

  // Step 7: do work / store return value at R5 + 3
  if (targetStep >= 7) {
    write(R5 + 3, { kind: 'ret-slot', label: 'return value (slot)', value: RETURN_VALUE });
  }

  // Step 8: remove locals
  if (targetStep >= 8) {
    const L = Math.max(0, numLocals.value | 0);
    if (L > 0) {
      R6 = clamp16(R6 + L);
      highlightAddrs.clear();
      highlightAddrs.add(R6);
    }
  }

  // Step 9: POP R5
  if (targetStep >= 9) {
    const cell = memory.get(R6);
    if (cell?.kind === 'saved-r5' && typeof cell.value === 'string' && cell.value.startsWith('x')) {
      const parsed = parseInt(cell.value.slice(1), 16);
      if (!Number.isNaN(parsed)) R5 = clamp16(parsed);
    } else {
      // fallback to the known initial FP label/value
      R5 = initialFP;
    }
    highlightAddrs.clear();
    highlightAddrs.add(R6);
    R6 = clamp16(R6 + 1);
  }

  // Step 10: POP R7
  if (targetStep >= 10) {
    const cell = memory.get(R6);
    if (cell?.kind === 'saved-r7' && typeof cell.value === 'string' && cell.value.startsWith('x')) {
      const parsed = parseInt(cell.value.slice(1), 16);
      if (!Number.isNaN(parsed)) R7 = clamp16(parsed);
    }
    highlightAddrs.clear();
    highlightAddrs.add(R6);
    R6 = clamp16(R6 + 1);
  }

  // Step 11: RET (no stack change)
  if (targetStep >= 11) {
    // no-op for visualization
  }

  // Step 12: caller pops return value
  if (targetStep >= 12) {
    highlightAddrs.clear();
    highlightAddrs.add(R6);
    R6 = clamp16(R6 + 1);
  }

  // Step 13: caller removes parameters
  if (targetStep >= 13) {
    R6 = clamp16(R6 + (Math.max(0, numParams.value | 0)));
    highlightAddrs.clear();
    highlightAddrs.add(R6);
  }

  // Step 14: caller continues (no-op)

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

const callerAsm: AsmLine[] = [
  { text: 'ADD R6, R6, #-1', step: 0 },
  { text: 'STR argN, R6, #0', step: 0 },
  { text: '', step: -1 },
  { text: '...            ; repeat down to arg1', step: 0 },
  { text: 'JSR callee', step: 1 },
  { text: '', step: -1 },
  { text: 'LDR Rv, R6, #0  ; read return value', step: 12 },
  { text: 'ADD R6, R6, #1  ; pop return value', step: 12 },
  { text: 'ADD R6, R6, #numParams', step: 13 }
];

const calleeAsm: AsmLine[] = [
  { text: 'ADD R6, R6, #-1    ; reserve return slot', step: 2 },
  { text: '', step: -1 },
  { text: 'ADD R6, R6, #-1', step: 3 },
  { text: 'STR R7, R6, #0    ; save return address', step: 3 },
  { text: '', step: -1 },
  { text: 'ADD R6, R6, #-1', step: 4 },
  { text: 'STR R5, R6, #0    ; save old FP', step: 4 },
  { text: '', step: -1 },
  { text: 'ADD R5, R6, #-1   ; set new FP', step: 5 },
  { text: 'ADD R6, R6, #-numLocals', step: 6 },
  { text: '...              ; body', step: 7 },
  { text: 'STR Rx, R5, #3    ; write return value', step: 7 },
  { text: 'ADD R6, R6, #numLocals', step: 8 },
  { text: '', step: -1 },
  { text: 'LDR R5, R6, #0    ; restore old FP', step: 9 },
  { text: 'ADD R6, R6, #1', step: 9 },
  { text: '', step: -1 },
  { text: 'LDR R7, R6, #0    ; restore return addr', step: 10 },
  { text: 'ADD R6, R6, #1', step: 10 },
  { text: '', step: -1 },
  { text: 'RET', step: 11 }
];

function nextStep() {
  stepIndex.value = Math.min(stepIndex.value + 1, steps.length - 1);
}

function prevStep() {
  stepIndex.value = Math.max(stepIndex.value - 1, 0);
}

function reset() {
  stepIndex.value = 0;
  numParams.value = 2;
  numLocals.value = 2;
  argValues.value = ['x0001', 'x0002'];
}
</script>

<template>
  <div class="px-4 py-3 max-w-350 mx-auto">
    <header class="mb-3">
      <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
        LC-3 Calling Convention Visualizer
      </h1>
      <p class="mt-1 text-sm md:text-base text-surface-700 dark:text-surface-200 max-w-[90ch]">
        Step through the stack-frame lifecycle (caller → callee → caller) using the exact sequence you provided.
        In this view, addresses decrease upward so pushes visually build upward (R6 still decrements).
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-3">
      <Card class="cc-sticky">
        <template #title>Controls</template>
        <template #content>
          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-3">
              <label class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-surface-700 dark:text-surface-200"># Params</span>
                <input v-model.number="numParams" type="number" min="0" max="8" class="cc-input" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-surface-700 dark:text-surface-200"># Locals</span>
                <input v-model.number="numLocals" type="number" min="0" max="8" class="cc-input" />
              </label>
            </div>

            <div class="flex flex-col gap-2">
              <div class="text-sm font-semibold text-surface-700 dark:text-surface-200">Arguments (arg1..argN)</div>
              <div v-if="numParams === 0" class="text-sm text-surface-500">No parameters.</div>
              <div v-else class="grid grid-cols-2 gap-2">
                <label v-for="i in paramIndices" :key="i" class="flex flex-col gap-1">
                  <span class="text-xs text-surface-600 dark:text-surface-300">arg{{ i }}</span>
                  <div class="cc-input font-mono cc-readonly">{{ argValues[i - 1] }}</div>
                </label>
              </div>
            </div>

            <label class="flex flex-col gap-1">
              <span class="text-sm font-semibold text-surface-700 dark:text-surface-200">Return value (written at R5 + 3)</span>
              <div class="cc-input font-mono cc-readonly">{{ RETURN_VALUE }}</div>
            </label>

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

      <div class="cc-right">
        <div class="flex flex-col gap-3">
          <Card>
            <template #title>Registers</template>
            <template #content>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="reg" :class="{ changed: registerChanged.R6 }">
                  <div class="reg-k">R6 (SP)</div>
                  <div class="reg-v font-mono">{{ hex16(current.R6) }}</div>
                </div>
                <div class="reg" :class="{ changed: registerChanged.R5 }">
                  <div class="reg-k">R5 (FP)</div>
                  <div class="reg-v font-mono">{{ hex16(current.R5) }}</div>
                </div>
                <div class="reg" :class="{ changed: registerChanged.R7 }">
                  <div class="reg-k">R7</div>
                  <div class="reg-v font-mono">{{ hex16(current.R7) }}</div>
                </div>
              </div>
              <div class="mt-3 text-xs text-surface-600 dark:text-surface-300">
                Convention-specific: return value slot is at <span class="font-mono">R5 + 3</span>, and locals live at
                <span class="font-mono">R5, R5-1, ...</span>.
              </div>
            </template>
          </Card>

          <Card>
            <template #title>Stack (memory window)</template>
            <template #content>
              <div class="stack">
                <div class="stack-head">
                  <div class="ptr-head">Ptrs</div>
                  <div class="row-head">
                    <div>Addr</div>
                    <div>Contents</div>
                  </div>
                </div>

                <div class="stack-body" role="table" aria-label="Stack memory window">
                  <div v-for="row in displayRows" :key="row.kind === 'ellipsis' ? row.id : row.addr" class="stack-line">
                    <div class="ptr-gutter font-mono">
                      <template v-if="row.kind === 'cell'">
                        <span v-if="row.isSP" class="ptr ptr-sp">R6→</span>
                        <span v-if="row.isFP" class="ptr ptr-fp">R5→</span>
                      </template>
                    </div>
                    <div
                      v-if="row.kind === 'cell'"
                      :class="[
                        'stack-row',
                        {
                          inactive: !row.active,
                          highlight: row.isHighlight,
                          'highlight-caller': row.isHighlight && currentActor === 'caller',
                          'highlight-callee': row.isHighlight && currentActor === 'callee',
                          'owner-caller': row.owner === 'caller',
                          'owner-callee': row.owner === 'callee',
                          sp: row.isSP,
                          fp: row.isFP
                        }
                      ]"
                    >
                      <div class="addr font-mono">{{ row.addrHex }}</div>
                      <div class="contents">
                        <div v-if="row.cell" class="flex items-baseline justify-between gap-3">
                          <div class="label">
                            <span class="font-semibold">{{ row.cell.label }}</span>
                            <span class="kind">({{ row.cell.kind }})</span>
                          </div>
                          <div class="value font-mono" v-if="row.cell.value">{{ row.cell.value }}</div>
                        </div>
                        <div v-else class="empty">(empty)</div>
                      </div>
                    </div>
                    <div v-else class="stack-ellipsis" aria-hidden="true">
                      <div class="ellipsis-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="legend">
                  <div><span class="dot active"></span> active stack range</div>
                  <div><span class="dot inactive"></span> not in stack (popped / above SP)</div>
                  <div><span class="dot highlight-caller"></span> touched this step (caller)</div>
                  <div><span class="dot highlight-callee"></span> touched this step (callee)</div>
                </div>
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
  .cc-right { grid-template-columns: 560px 1fr; align-items: start; }
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

.asm { display: grid; grid-template-columns: 1fr; gap: .75rem; }
@media (min-width: 640px) {
  .asm { grid-template-columns: 1fr 1fr; }
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
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
