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

    if (targetStep >= 1) {
      for (let i = numParams.value; i >= 1; i--) {
        push({ kind: 'arg', label: `arg${i}`, value: argValues.value[i - 1] ?? '' });
      }
    }

    if (targetStep >= 2) {
      R7 = clamp16(initialPC + numParams.value * 2 + 1);
    }

    if (targetStep >= 3) {
      push({ kind: 'ret-slot', label: 'return value (slot)', value: '' });
    }

    if (targetStep >= 4) {
      push({ kind: 'saved-r7', label: 'saved R7 (return addr)', value: hex16(R7) });
    }

    if (targetStep >= 5) {
      push({ kind: 'saved-r5', label: 'saved R5 (old FP)', value: hex16(R5) });
    }

    if (targetStep >= 6) {
      R5 = clamp16(R6 - 1);
    }

    if (targetStep >= 7) {
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

    if (targetStep >= 8) {
      for (let i = 0; i < usedRegs.value.length; i++) {
        push({ kind: 'saved-reg', label: `saved ${usedRegs.value[i]}`, value: '' });
      }
    }

    if (targetStep >= 9) {
      write(R5 + 3, { kind: 'ret-slot', label: 'return value (slot)', value: returnValue.value });
    }

    if (targetStep >= 10) {
      const numRegs = usedRegs.value.length;
      if (numRegs > 0) {
        R6 = clamp16(R6 + numRegs);
        highlightAddrs.clear();
        highlightAddrs.add(R6);
      }
    }

    if (targetStep >= 11) {
      const locals = Math.max(0, numLocals.value | 0);
      if (locals > 0) {
        R6 = clamp16(R6 + locals);
        highlightAddrs.clear();
        highlightAddrs.add(R6);
      }
    }

    if (targetStep >= 12) {
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

    if (targetStep >= 13) {
      const cell = memory.get(R6);
      if (cell?.kind === 'saved-r7' && typeof cell.value === 'string' && cell.value.startsWith('x')) {
        const parsed = Number.parseInt(cell.value.slice(1), 16);
        if (!Number.isNaN(parsed)) R7 = clamp16(parsed);
      }
      highlightAddrs.clear();
      highlightAddrs.add(R6);
      R6 = clamp16(R6 + 1);
    }

    if (targetStep >= 15) {
      highlightAddrs.clear();
      highlightAddrs.add(R6);
      R6 = clamp16(R6 + 1);
    }

    if (targetStep >= 16) {
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
    let currentAddr = 0x3000;
    const formatAddr = (addr: number) => 'x' + clamp16(addr).toString(16).toUpperCase().padStart(4, '0');

    const lines: AsmLine[] = [{ text: '.ORIG x3000', step: -1 }];

    // Push args right-to-left
    for (let i = argNames.value.length - 1; i >= 0; i--) {
      lines.push({ text: 'ADD R6, R6, #-1', step: 1, addr: formatAddr(currentAddr++) });
      lines.push({ text: `STR R${i}, R6, #0     ; push arg ${argNames.value[i]}`, step: 1, addr: formatAddr(currentAddr++) });
    }

    lines.push({ text: '', step: -1 });
    lines.push({ text: `JSR ${calleeName.value}`, step: 2, addr: formatAddr(currentAddr++) });
    lines.push({ text: '', step: -1 });
    lines.push({ text: 'LDR R0, R6, #0     ; read return value', step: 15, addr: formatAddr(currentAddr++) });
    lines.push({ text: 'ADD R6, R6, #1     ; pop return value', step: 15, addr: formatAddr(currentAddr++) });
    lines.push({ text: '', step: -1 });

    for (let i = 0; i < numParams.value; i++) {
      lines.push({ text: 'ADD R6, R6, #1     ; pop parameter', step: 16, addr: formatAddr(currentAddr++) });
    }

    return lines;
  });

  // Return address is the instruction right after JSR: 0x3000 + (numParams * 2 instructions) + 1 (for JSR)
  const returnAddr = computed(() => {
    const jsrAddr = 0x3000 + numParams.value * 2;
    return 'x' + clamp16(jsrAddr + 1).toString(16).toUpperCase().padStart(4, '0');
  });

  const calleeAsm = computed<AsmLine[]>(() => {
    let currentAddr = 0x3300;
    const formatAddr = (addr: number) => 'x' + clamp16(addr).toString(16).toUpperCase().padStart(4, '0');

    const saveRegs: AsmLine[] = [];
    const restoreRegs: AsmLine[] = [];

    if (usedRegs.value.length > 0) {
      for (let i = 0; i < usedRegs.value.length; i++) {
        saveRegs.push({ text: 'ADD R6, R6, #-1', step: 8, addr: formatAddr(currentAddr++) });
        saveRegs.push({ text: `STR ${usedRegs.value[i]}, R6, #0    ; save ${usedRegs.value[i]}`, step: 8, addr: formatAddr(currentAddr++) });
      }

      for (let i = usedRegs.value.length - 1; i >= 0; i--) {
        restoreRegs.push({ text: `LDR ${usedRegs.value[i]}, R6, #0    ; restore ${usedRegs.value[i]}`, step: 10, addr: formatAddr(currentAddr++) });
        restoreRegs.push({ text: 'ADD R6, R6, #1', step: 10, addr: formatAddr(currentAddr++) });
      }
      restoreRegs.push({ text: '', step: -1 });
    }

    const prologue: AsmLine[] = [
      { text: 'ADD R6, R6, #-1    ; reserve return slot', step: 3, addr: formatAddr(currentAddr++) },
      { text: '', step: -1 },
      { text: 'ADD R6, R6, #-1', step: 4, addr: formatAddr(currentAddr++) },
      { text: 'STR R7, R6, #0     ; save return address', step: 4, addr: formatAddr(currentAddr++) },
      { text: '', step: -1 },
      { text: 'ADD R6, R6, #-1', step: 5, addr: formatAddr(currentAddr++) },
      { text: 'STR R5, R6, #0     ; save old FP', step: 5, addr: formatAddr(currentAddr++) },
      { text: '', step: -1 },
      { text: 'ADD R5, R6, #-1    ; set new FP', step: 6, addr: formatAddr(currentAddr++) },
      { text: `ADD R6, R6, #${-numLocals.value}     ; reserve space for locals`, step: 7, addr: formatAddr(currentAddr++) },
      { text: '', step: -1 },
    ];

    const bodyLines: AsmLine[] = [];
    for (const line of bodyAsm.value) {
      if (line.trim() === '' || line.trim().startsWith(';')) {
        bodyLines.push({ text: line, step: 9 });
      } else if (line.endsWith(':')) {
        bodyLines.push({ text: line, step: 9 });
      } else {
        bodyLines.push({ text: line, step: 9, addr: formatAddr(currentAddr++) });
      }
    }

    const epilogue: AsmLine[] = [
      { text: `ADD R6, R6, #${numLocals.value}     ; pop locals`, step: 11, addr: formatAddr(currentAddr++) },
      { text: '', step: -1 },
      { text: 'LDR R5, R6, #0     ; restore old FP', step: 12, addr: formatAddr(currentAddr++) },
      { text: 'ADD R6, R6, #1', step: 12, addr: formatAddr(currentAddr++) },
      { text: '', step: -1 },
      { text: 'LDR R7, R6, #0     ; restore return addr', step: 13, addr: formatAddr(currentAddr++) },
      { text: 'ADD R6, R6, #1', step: 13, addr: formatAddr(currentAddr++) },
      { text: '', step: -1 },
      { text: 'RET', step: 14, addr: formatAddr(currentAddr++) }
    ];

    return [
      { text: `${calleeName.value}`, step: -1 },
      ...prologue,
      ...saveRegs,
      ...bodyLines,
      ...restoreRegs,
      ...epilogue
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
    returnAddr,
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