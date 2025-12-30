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

type DisplayRow = {
  addr: number;
  addrHex: string;
  cell?: Cell;
  active: boolean;
  isSP: boolean;
  isFP: boolean;
  isHighlight: boolean;
};

type StepActor = 'caller' | 'callee';

const steps: ReadonlyArray<{
  title: string;
  asm: string;
  detail: string;
  actor: StepActor;
}> = [
  {
    title: 'Caller pushes arguments (right → left)',
    asm: 'PUSH argN ... PUSH arg2; PUSH arg1',
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
    asm: 'PUSH R7',
    detail: 'Save R7 on the stack so the callee can safely use R7 (if needed).',
    actor: 'callee'
  },
  {
    title: 'Callee saves old frame pointer',
    asm: 'PUSH R5',
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
    asm: 'POP R5',
    detail: 'Restore caller’s R5.',
    actor: 'callee'
  },
  {
    title: 'Callee restores return address',
    asm: 'POP R7',
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
    asm: 'POP Rv',
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
const returnValue = ref('x1234');

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
    write(R5 + 3, { kind: 'ret-slot', label: 'return value (slot)', value: returnValue.value });
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

  // Always display a window that includes BOTH pointers (R6 and R5), plus any written/touched cells.
  // Also cap the number of rendered rows so the memory window stays compact (no scrolling inside).
  const minRelevant = Math.min(state.R6, state.R5, ...(keys.length ? keys : [state.R6]), ...(highlightKeys.length ? highlightKeys : [state.R6]));
  const maxRelevant = Math.max(state.R6, state.R5, ...(keys.length ? keys : [state.R5]), ...(highlightKeys.length ? highlightKeys : [state.R5]));

  const maxRows = 26;
  const mustLow = Math.min(state.R6, state.R5);
  const mustHigh = Math.max(state.R6, state.R5);

  const fullSpan = (maxRelevant - minRelevant + 0x10000) % 0x10000;
  const mustSpan = (mustHigh - mustLow + 0x10000) % 0x10000;

  // If wrap-around happens or the span is unexpectedly huge, fall back to a small window around SP.
  const isSpanReasonable = fullSpan < 0x8000 && mustSpan < 0x8000;
  let windowLow = isSpanReasonable ? minRelevant : clamp16(state.R6 - 8);
  let windowHigh = isSpanReasonable ? maxRelevant : clamp16(state.R6 + 8);

  // First ensure the window includes both R6 and R5.
  if (isSpanReasonable) {
    windowLow = mustLow;
    windowHigh = mustHigh;

    // Expand the window (within relevant bounds) until we hit maxRows.
    const required = (windowHigh - windowLow + 0x10000) % 0x10000 + 1;
    let remaining = Math.max(0, maxRows - required);

    const addHigh = Math.min(remaining, maxRelevant - windowHigh);
    windowHigh += addHigh;
    remaining -= addHigh;

    const addLow = Math.min(remaining, windowLow - minRelevant);
    windowLow -= addLow;
    remaining -= addLow;

    // If we still have room (hit a bound on one side), try the other side again.
    if (remaining > 0) {
      const addHigh2 = Math.min(remaining, maxRelevant - windowHigh);
      windowHigh += addHigh2;
      remaining -= addHigh2;
    }
    if (remaining > 0) {
      const addLow2 = Math.min(remaining, windowLow - minRelevant);
      windowLow -= addLow2;
      remaining -= addLow2;
    }

    windowLow = clamp16(windowLow);
    windowHigh = clamp16(windowHigh);

    // If it still doesn't fit (shouldn't happen with typical inputs), clamp to maxRows while keeping R6/R5 inside.
    const finalSpan = (windowHigh - windowLow + 0x10000) % 0x10000;
    if (finalSpan >= maxRows) {
      windowLow = mustLow;
      windowHigh = clamp16(mustLow + (maxRows - 1));
      if (mustHigh > windowHigh) {
        windowHigh = mustHigh;
        windowLow = clamp16(mustHigh - (maxRows - 1));
      }
    }
  }

  const safeSpan = Math.min((windowHigh - windowLow + 0x10000) % 0x10000, maxRows - 1);

  // Render in ascending address order (addresses decrease bottom→top), so pushes visually build upward.
  const addrs: number[] = [];
  for (let i = 0; i <= safeSpan; i++) {
    addrs.push(clamp16(windowLow + i));
  }

  const stackCeiling = keys.length ? Math.max(...keys) : null;

  return addrs.map((addr) => {
    const cell = state.memory.get(addr);
    const active = stackCeiling === null ? false : (addr >= state.R6 && addr <= stackCeiling);
    return {
      addr,
      addrHex: hex16(addr),
      cell,
      active,
      isSP: addr === state.R6,
      isFP: addr === state.R5,
      isHighlight: state.highlightAddrs.has(addr)
    };
  });
});

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
  returnValue.value = 'x1234';
}
</script>

<template>
  <div class="px-4 py-3 max-w-[1400px] mx-auto">
    <header class="mb-3">
      <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
        LC-3 Calling Convention Visualizer
      </h1>
      <p class="mt-1 text-sm md:text-base text-surface-700 dark:text-surface-200 max-w-[90ch]">
        Step through the stack-frame lifecycle (caller → callee → caller) using the exact sequence you provided.
        In this view, addresses decrease upward so pushes visually build upward (R6 still decrements).
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-3">
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
                  <input v-model="argValues[i - 1]" class="cc-input font-mono" placeholder="x0000" />
                </label>
              </div>
            </div>

            <label class="flex flex-col gap-1">
              <span class="text-sm font-semibold text-surface-700 dark:text-surface-200">Return value (written at R5 + 3)</span>
              <input v-model="returnValue" class="cc-input font-mono" placeholder="x1234" />
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
                <div class="text-xs text-surface-500 font-mono">{{ steps[stepIndex].asm }}</div>
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

      <div class="flex flex-col gap-3">
        <Card>
          <template #title>Registers</template>
          <template #content>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div class="reg">
                <div class="reg-k">R6 (SP)</div>
                <div class="reg-v font-mono">{{ hex16(current.R6) }}</div>
              </div>
              <div class="reg">
                <div class="reg-k">R5 (FP)</div>
                <div class="reg-v font-mono">{{ hex16(current.R5) }}</div>
              </div>
              <div class="reg">
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
                <div>Ptrs</div>
                <div>Addr</div>
                <div>Contents</div>
              </div>

              <div class="stack-body" role="table" aria-label="Stack memory window">
                <div
                  v-for="row in displayRows"
                  :key="row.addr"
                  :class="[
                    'stack-row',
                    {
                      inactive: !row.active,
                      highlight: row.isHighlight,
                      'highlight-caller': row.isHighlight && currentActor === 'caller',
                      'highlight-callee': row.isHighlight && currentActor === 'callee',
                      sp: row.isSP,
                      fp: row.isFP
                    }
                  ]"
                >
                  <div class="ptrs font-mono">
                    <span v-if="row.isSP" class="ptr ptr-sp">R6→</span>
                    <span v-if="row.isFP" class="ptr ptr-fp">R5→</span>
                  </div>
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

@media (prefers-color-scheme: dark) {
  .reg { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }
  .reg-k { color: rgba(255,255,255,0.78); }
}

.cc-sticky { align-self: start; }
@media (min-width: 1024px) {
  .cc-sticky { position: sticky; top: 76px; }
}

.stack { display: flex; flex-direction: column; gap: .25rem; }
.stack-head { display: grid; grid-template-columns: 84px 120px 1fr; padding: .35rem .6rem; font-size: .75rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: rgba(0,0,0,0.75); }

@media (prefers-color-scheme: dark) {
  .stack-head { color: rgba(255,255,255,0.88); }
}

.stack-body {
  overflow: visible;
}

.stack-row {
  display: grid;
  grid-template-columns: 84px 120px 1fr;
  gap: .25rem;
  align-items: center;
  padding: .38rem .6rem;
  border-radius: .7rem;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.86);
}

@media (prefers-color-scheme: dark) {
  .stack-row { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }
}

.stack-row.inactive { opacity: .52; filter: grayscale(0.1); }
.stack-row.highlight { outline: 2px solid rgba(179, 163, 105, 0.55); }
.stack-row.highlight.highlight-caller { outline-color: rgba(0, 96, 168, 0.85); }
.stack-row.highlight.highlight-callee { outline-color: rgba(0, 160, 96, 0.85); }
.stack-row.sp { box-shadow: inset 3px 0 0 rgba(0, 96, 168, 0.85); }
.stack-row.fp { box-shadow: inset 3px 0 0 rgba(0, 160, 96, 0.85); }

.addr { color: rgba(0,0,0,0.82); }

.ptrs { display: flex; flex-direction: column; gap: .28rem; }
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
</style>
