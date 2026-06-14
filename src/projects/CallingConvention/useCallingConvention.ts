import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { examples, steps } from './data';
import type { AsmLine, CallingConventionExample, Cell, MachineState, StepActor } from './types';

export function splitAsmComment(text: string): { code: string; comment: string } {
  const idx = text.indexOf(';');
  if (idx === -1) return { code: text, comment: '' };
  return {
    code: text.slice(0, idx).trimEnd(),
    comment: text.slice(idx)
  };
}

function clamp16(v: number) {
  return ((v % 0x10000) + 0x10000) % 0x10000;
}

function hex16(v: number) {
  return 'x' + clamp16(v).toString(16).toUpperCase().padStart(4, '0');
}

export function useCallingConvention() {
  const selectedExampleId = ref(examples[0].id);
  const selectedExample = computed<CallingConventionExample>(() => examples.find((entry) => entry.id === selectedExampleId.value) || examples[0]);

  const stepIndex = ref(0);
  const numParams = computed(() => selectedExample.value.numParams);
  const numLocals = computed(() => selectedExample.value.numLocals);
  const argValues = computed(() => selectedExample.value.argValues);
  const argNames = computed(() => selectedExample.value.argNames);
  const localNames = computed(() => selectedExample.value.localNames);
  const calleeName = computed(() => selectedExample.value.calleeName);
  const usedRegs = computed(() => selectedExample.value.usedRegs);
  const bodyAsm = computed(() => selectedExample.value.bodyAsm);
  const returnValue = computed(() => selectedExample.value.returnValue);

  watch(selectedExampleId, () => {
    stepIndex.value = 0;
  });

  function simulate(targetStep: number): MachineState {
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
        kind: (patch.kind ?? existing?.kind ?? 'other') as Cell['kind'],
        value: patch.value ?? existing?.value
      };
      memory.set(addr, merged);
      highlightAddrs.clear();
      highlightAddrs.add(addr);
    };

    if (targetStep >= 0) {
      for (let i = numParams.value; i >= 1; i--) {
        push({ kind: 'arg', label: `arg${i}`, value: argValues.value[i - 1] ?? '' });
      }
    }

    if (targetStep >= 1) {
      R7 = clamp16(initialPC + 1);
    }

    if (targetStep >= 2) {
      push({ kind: 'ret-slot', label: 'return value (slot)', value: '' });
    }

    if (targetStep >= 3) {
      push({ kind: 'saved-r7', label: 'saved R7 (return addr)', value: hex16(R7) });
    }

    if (targetStep >= 4) {
      push({ kind: 'saved-r5', label: 'saved R5 (old FP)', value: hex16(R5) });
    }

    if (targetStep >= 5) {
      R5 = clamp16(R6 - 1);
    }

    if (targetStep >= 6) {
      const locals = Math.max(0, numLocals.value | 0);
      if (locals > 0) {
        for (let i = 0; i < locals; i++) {
          const addr = clamp16(R5 - i);
          memory.set(addr, { address: addr, kind: 'local', label: `local${i + 1}`, value: '' });
        }
        R6 = clamp16(R6 - locals);
        highlightAddrs.clear();
        highlightAddrs.add(R6);
      }
    }

    if (targetStep >= 7) {
      for (let i = 0; i < usedRegs.value.length; i++) {
        push({ kind: 'saved-reg', label: `saved ${usedRegs.value[i]}`, value: '' });
      }
    }

    if (targetStep >= 8) {
      write(R5 + 3, { kind: 'ret-slot', label: 'return value (slot)', value: returnValue.value });
    }

    if (targetStep >= 9) {
      const numRegs = usedRegs.value.length;
      if (numRegs > 0) {
        R6 = clamp16(R6 + numRegs);
        highlightAddrs.clear();
        highlightAddrs.add(R6);
      }
    }

    if (targetStep >= 10) {
      const locals = Math.max(0, numLocals.value | 0);
      if (locals > 0) {
        R6 = clamp16(R6 + locals);
        highlightAddrs.clear();
        highlightAddrs.add(R6);
      }
    }

    if (targetStep >= 11) {
      const cell = memory.get(R6);
      if (cell?.kind === 'saved-r5' && typeof cell.value === 'string' && cell.value.startsWith('x')) {
        const parsed = Number.parseInt(cell.value.slice(1), 16);
        if (!Number.isNaN(parsed)) R5 = clamp16(parsed);
      } else {
        R5 = initialFP;
      }
      highlightAddrs.clear();
      highlightAddrs.add(R6);
      R6 = clamp16(R6 + 1);
    }

    if (targetStep >= 12) {
      const cell = memory.get(R6);
      if (cell?.kind === 'saved-r7' && typeof cell.value === 'string' && cell.value.startsWith('x')) {
        const parsed = Number.parseInt(cell.value.slice(1), 16);
        if (!Number.isNaN(parsed)) R7 = clamp16(parsed);
      }
      highlightAddrs.clear();
      highlightAddrs.add(R6);
      R6 = clamp16(R6 + 1);
    }

    if (targetStep >= 14) {
      highlightAddrs.clear();
      highlightAddrs.add(R6);
      R6 = clamp16(R6 + 1);
    }

    if (targetStep >= 15) {
      R6 = clamp16(R6 + Math.max(0, numParams.value | 0));
      highlightAddrs.clear();
      highlightAddrs.add(R6);
    }

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
  const stepAsmLines = computed(() => (steps[stepIndex.value]?.asm ?? '').split('\n'));

  const callerAsm = computed<AsmLine[]>(() => {
    const pushLines: AsmLine[] = [];
    for (let i = argNames.value.length - 1; i >= 0; i--) {
      pushLines.push({ text: 'ADD R6, R6, #-1', step: 0 });
      pushLines.push({ text: `STR R${i}, R6, #0     ; push arg ${argNames.value[i]}`, step: 0 });
    }

    const popLines: AsmLine[] = [];
    for (let i = 0; i < numParams.value; i++) {
      popLines.push({ text: 'ADD R6, R6, #1     ; pop parameter', step: 15 });
    }

    return [
      { text: '.ORIG x3000', step: -1 },
      ...pushLines,
      { text: '', step: -1 },
      { text: `JSR ${calleeName.value}`, step: 1 },
      { text: '', step: -1 },
      { text: 'LDR R0, R6, #0     ; read return value', step: 14 },
      { text: 'ADD R6, R6, #1     ; pop return value', step: 14 },
      { text: '', step: -1 },
      ...popLines
    ];
  });

  const calleeAsm = computed<AsmLine[]>(() => {
    const saveRegs: AsmLine[] = [];
    const restoreRegs: AsmLine[] = [];

    if (usedRegs.value.length > 0) {
      for (let i = 0; i < usedRegs.value.length; i++) {
        saveRegs.push({ text: 'ADD R6, R6, #-1', step: 7 });
        saveRegs.push({ text: `STR ${usedRegs.value[i]}, R6, #0    ; save ${usedRegs.value[i]}`, step: 7 });
      }

      for (let i = usedRegs.value.length - 1; i >= 0; i--) {
        restoreRegs.push({ text: `LDR ${usedRegs.value[i]}, R6, #0    ; restore ${usedRegs.value[i]}`, step: 9 });
        restoreRegs.push({ text: 'ADD R6, R6, #1', step: 9 });
      }
      restoreRegs.push({ text: '', step: -1 });
    }

    return [
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
      { text: `ADD R6, R6, #${-numLocals.value}     ; reserve space for locals`, step: 6 },
      { text: '', step: -1 },
      ...saveRegs,
      ...bodyAsm.value.map((line) => ({ text: line, step: 8 })),
      ...restoreRegs,
      { text: `ADD R6, R6, #${numLocals.value}     ; pop locals`, step: 10 },
      { text: '', step: -1 },
      { text: 'LDR R5, R6, #0     ; restore old FP', step: 11 },
      { text: 'ADD R6, R6, #1', step: 11 },
      { text: '', step: -1 },
      { text: 'LDR R7, R6, #0     ; restore return addr', step: 12 },
      { text: 'ADD R6, R6, #1', step: 12 },
      { text: '', step: -1 },
      { text: 'RET', step: 13 }
    ];
  });

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      nextStep();
    } else if (event.key === 'ArrowLeft') {
      prevStep();
    }
  };

  function nextStep() {
    stepIndex.value = Math.min(stepIndex.value + 1, steps.length - 1);
  }

  function prevStep() {
    stepIndex.value = Math.max(stepIndex.value - 1, 0);
  }

  function reset() {
    stepIndex.value = 0;
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  return {
    examples,
    steps,
    selectedExampleId,
    selectedExample,
    stepIndex,
    numParams,
    numLocals,
    argValues,
    argNames,
    localNames,
    calleeName,
    usedRegs,
    bodyAsm,
    returnValue,
    current,
    previous,
    registerChanged,
    currentActor,
    stepAsmLines,
    callerAsm,
    calleeAsm,
    nextStep,
    prevStep,
    reset,
    splitAsmComment
  };
}