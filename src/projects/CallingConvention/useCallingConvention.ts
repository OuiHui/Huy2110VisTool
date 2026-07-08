import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { examples, steps } from './data';
import type { AsmLine, CallingConventionExample, MicroOp, StepActor } from './types';
import { clamp16, hex16, simulateMicro } from './simulator';

export function splitAsmComment(text: string): { code: string; comment: string } {
  const idx = text.indexOf(';');
  if (idx === -1) return { code: text, comment: '' };
  return {
    code: text.slice(0, idx).trimEnd(),
    comment: text.slice(idx)
  };
}

type AsmWithOp = AsmLine & { microOp?: MicroOp };

export function useCallingConvention() {
  const selectedExampleId = ref(examples[0].id);
  const selectedExample = computed<CallingConventionExample>(
    () => examples.find((e) => e.id === selectedExampleId.value) ?? examples[0]
  );

  // instrIndex: -1 = initial state (block 0), 0..n-1 = instruction position
  const instrIndex = ref(-1);

  watch(selectedExampleId, () => {
    instrIndex.value = -1;
  });

  const numParams = computed(() => selectedExample.value.numParams);
  const numLocals = computed(() => selectedExample.value.numLocals);
  const argValues = computed(() => selectedExample.value.argValues);
  const argNames = computed(() => selectedExample.value.argNames);
  const localNames = computed(() => selectedExample.value.localNames);
  const calleeName = computed(() => selectedExample.value.calleeName);
  const usedRegs = computed(() => selectedExample.value.usedRegs);
  const bodyAsm = computed(() => selectedExample.value.bodyAsm);
  const returnValue = computed(() => selectedExample.value.returnValue);

  // Return address is the instruction right after JSR
  const returnAddr = computed(() => {
    const jsrAddr = 0x3000 + numParams.value * 2;
    return 'x' + clamp16(jsrAddr + 1).toString(16).toUpperCase().padStart(4, '0');
  });

  // ── Assembly builders (display lines + parallel micro-ops) ──────────────────

  const callerAsmWithOps = computed<AsmWithOp[]>(() => {
    let currentAddr = 0x3000;
    const fmt = (a: number) => 'x' + clamp16(a).toString(16).toUpperCase().padStart(4, '0');

    const lines: AsmWithOp[] = [{ text: '.ORIG x3000', step: -1 }];

    for (let i = argNames.value.length - 1; i >= 0; i--) {
      const argLabel = `arg${i + 1}`;
      const argVal = argValues.value[i] ?? '';
      lines.push({
        text: 'ADD R6, R6, #-1',
        step: 1,
        addr: fmt(currentAddr++),
        microOp: { op: 'dec-sp' }
      });
      lines.push({
        text: `STR R${i}, R6, #0     ; push arg ${argNames.value[i]}`,
        step: 1,
        addr: fmt(currentAddr++),
        microOp: { op: 'str-at-sp', kind: 'arg', label: argLabel, value: argVal }
      });
    }

    lines.push({ text: '', step: -1 });
    lines.push({
      text: `JSR ${calleeName.value}`,
      step: 2,
      addr: fmt(currentAddr++),
      microOp: { op: 'jsr', returnAddr: 0x3000 + numParams.value * 2 + 1 }
    });
    lines.push({ text: '', step: -1 });
    lines.push({
      text: 'LDR R0, R6, #0     ; read return value',
      step: 15,
      addr: fmt(currentAddr++),
      microOp: { op: 'noop' }
    });
    lines.push({
      text: 'ADD R6, R6, #1     ; pop return value',
      step: 15,
      addr: fmt(currentAddr++),
      microOp: { op: 'inc-sp', count: 1 }
    });
    lines.push({ text: '', step: -1 });

    for (let i = 0; i < numParams.value; i++) {
      lines.push({
        text: 'ADD R6, R6, #1     ; pop parameter',
        step: 16,
        addr: fmt(currentAddr++),
        microOp: { op: 'inc-sp', count: 1 }
      });
    }

    return lines;
  });

  const calleeAsmWithOps = computed<AsmWithOp[]>(() => {
    let currentAddr = 0x3300;
    const fmt = (a: number) => 'x' + clamp16(a).toString(16).toUpperCase().padStart(4, '0');

    const saveRegs: AsmWithOp[] = [];
    const restoreRegs: AsmWithOp[] = [];

    for (let i = 0; i < usedRegs.value.length; i++) {
      const reg = usedRegs.value[i];
      saveRegs.push({
        text: 'ADD R6, R6, #-1',
        step: 8,
        addr: fmt(currentAddr++),
        microOp: { op: 'dec-sp' }
      });
      saveRegs.push({
        text: `STR ${reg}, R6, #0    ; save ${reg}`,
        step: 8,
        addr: fmt(currentAddr++),
        microOp: { op: 'str-at-sp', kind: 'saved-reg', label: `saved ${reg}`, value: '' }
      });
    }

    for (let i = usedRegs.value.length - 1; i >= 0; i--) {
      const reg = usedRegs.value[i];
      restoreRegs.push({
        text: `LDR ${reg}, R6, #0    ; restore ${reg}`,
        step: 10,
        addr: fmt(currentAddr++),
        microOp: { op: 'noop' }
      });
      restoreRegs.push({
        text: 'ADD R6, R6, #1',
        step: 10,
        addr: fmt(currentAddr++),
        microOp: { op: 'inc-sp', count: 1 }
      });
    }
    if (restoreRegs.length) restoreRegs.push({ text: '', step: -1 });

    const prologue: AsmWithOp[] = [
      { text: 'ADD R6, R6, #-1    ; reserve return slot', step: 3, addr: fmt(currentAddr++), microOp: { op: 'push-empty', kind: 'ret-slot', label: 'return value (slot)' } },
      { text: '', step: -1 },
      { text: 'ADD R6, R6, #-1', step: 4, addr: fmt(currentAddr++), microOp: { op: 'dec-sp' } },
      { text: 'STR R7, R6, #0     ; save return address', step: 4, addr: fmt(currentAddr++), microOp: { op: 'str-at-sp', kind: 'saved-r7', label: 'saved R7 (return addr)', value: hex16(0x3000 + numParams.value * 2 + 1) } },
      { text: '', step: -1 },
      { text: 'ADD R6, R6, #-1', step: 5, addr: fmt(currentAddr++), microOp: { op: 'dec-sp' } },
      { text: 'STR R5, R6, #0     ; save old FP', step: 5, addr: fmt(currentAddr++), microOp: { op: 'str-at-sp', kind: 'saved-r5', label: 'saved R5 (old FP)', value: hex16(0xFE10) } },
      { text: '', step: -1 },
      { text: 'ADD R5, R6, #-1    ; set new FP', step: 6, addr: fmt(currentAddr++), microOp: { op: 'set-fp' } },
      { text: `ADD R6, R6, #${-numLocals.value}     ; reserve space for locals`, step: 7, addr: fmt(currentAddr++), microOp: { op: 'alloc-locals', count: numLocals.value, names: localNames.value } },
      { text: '', step: -1 },
    ];

    const bodyLines: AsmWithOp[] = [];
    for (const line of bodyAsm.value) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';') || trimmed.endsWith(':')) {
        bodyLines.push({ text: line, step: 9 });
        continue;
      }
      const addr = fmt(currentAddr++);
      // Detect the store-to-return-value instruction (STR Rx, R5, #3)
      const isReturnStore = /^STR\s+\w+,\s*R5,\s*#3\b/i.test(trimmed);
      bodyLines.push({
        text: line,
        step: 9,
        addr,
        microOp: isReturnStore
          ? { op: 'write-ret-val', value: returnValue.value }
          : { op: 'noop' }
      });
    }

    const epilogue: AsmWithOp[] = [
      { text: `ADD R6, R6, #${numLocals.value}     ; pop locals`, step: 11, addr: fmt(currentAddr++), microOp: { op: 'inc-sp', count: numLocals.value } },
      { text: '', step: -1 },
      { text: 'LDR R5, R6, #0     ; restore old FP', step: 12, addr: fmt(currentAddr++), microOp: { op: 'ldr-r5' } },
      { text: 'ADD R6, R6, #1', step: 12, addr: fmt(currentAddr++), microOp: { op: 'inc-sp', count: 1 } },
      { text: '', step: -1 },
      { text: 'LDR R7, R6, #0     ; restore return addr', step: 13, addr: fmt(currentAddr++), microOp: { op: 'ldr-r7' } },
      { text: 'ADD R6, R6, #1', step: 13, addr: fmt(currentAddr++), microOp: { op: 'inc-sp', count: 1 } },
      { text: '', step: -1 },
      { text: 'RET', step: 14, addr: fmt(currentAddr++), microOp: { op: 'noop' } }
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

  const callerAsm = computed<AsmLine[]>(() => callerAsmWithOps.value);
  const calleeAsm = computed<AsmLine[]>(() => calleeAsmWithOps.value);

  // ── Flat executable instruction sequence ────────────────────────────────────

  type ExecInstr = { blockIndex: number; addr: string; microOp: MicroOp };

  const executableInstrs = computed<ExecInstr[]>(() => {
    const result: ExecInstr[] = [];
    const addLines = (lines: AsmWithOp[], stepFilter?: (s: number) => boolean) => {
      for (const line of lines) {
        if (line.addr && line.step >= 0 && line.microOp) {
          if (!stepFilter || stepFilter(line.step)) {
            result.push({ blockIndex: line.step, addr: line.addr, microOp: line.microOp });
          }
        }
      }
    };
    // Execution order: caller setup → callee → caller teardown
    addLines(callerAsmWithOps.value, (s) => s <= 2);
    addLines(calleeAsmWithOps.value);
    addLines(callerAsmWithOps.value, (s) => s >= 15);
    return result;
  });

  const allMicroOps = computed<MicroOp[]>(() => executableInstrs.value.map((e) => e.microOp));

  const totalInstrs = computed(() => executableInstrs.value.length);

  // ── Derived state ───────────────────────────────────────────────────────────

  const blockIndex = computed(() => {
    if (instrIndex.value < 0) return 0;
    return executableInstrs.value[instrIndex.value]?.blockIndex ?? 0;
  });

  const activeLineAddr = computed<string | undefined>(() => {
    if (instrIndex.value < 0) return undefined;
    return executableInstrs.value[instrIndex.value]?.addr;
  });

  const current = computed(() => simulateMicro(allMicroOps.value, instrIndex.value));
  const previous = computed(() => simulateMicro(allMicroOps.value, instrIndex.value - 1));

  const registerChanged = computed(() => {
    const a = current.value;
    const b = previous.value;
    return {
      R6: a.R6 !== b.R6,
      R5: a.R5 !== b.R5,
      R7: a.R7 !== b.R7
    };
  });

  const currentActor = computed<StepActor>(() => steps[blockIndex.value]?.actor ?? 'caller');

  // ── Navigation ──────────────────────────────────────────────────────────────

  function instrNext() {
    instrIndex.value = Math.min(instrIndex.value + 1, totalInstrs.value - 1);
  }

  function instrPrev() {
    instrIndex.value = Math.max(instrIndex.value - 1, -1);
  }

  function blockNext() {
    const current = blockIndex.value;
    const next = current + 1;
    // Find last instruction of next block
    let lastIdx = -1;
    for (let i = 0; i < executableInstrs.value.length; i++) {
      if (executableInstrs.value[i].blockIndex === next) lastIdx = i;
    }
    if (lastIdx >= 0) instrIndex.value = lastIdx;
    else instrIndex.value = totalInstrs.value - 1;
  }

  function blockPrev() {
    const current = blockIndex.value;
    const prev = Math.max(0, current - 1);
    if (prev === 0) {
      instrIndex.value = -1;
      return;
    }
    // Find first instruction of prev block
    for (let i = 0; i < executableInstrs.value.length; i++) {
      if (executableInstrs.value[i].blockIndex === prev) {
        instrIndex.value = i;
        return;
      }
    }
    instrIndex.value = -1;
  }

  function reset() {
    instrIndex.value = -1;
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') instrNext();
    else if (event.key === 'ArrowLeft') instrPrev();
  };

  onMounted(() => window.addEventListener('keydown', handleKeydown));
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

  return {
    examples,
    steps,
    selectedExampleId,
    selectedExample,
    instrIndex,
    blockIndex,
    totalInstrs,
    activeLineAddr,
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
    callerAsm,
    calleeAsm,
    instrNext,
    instrPrev,
    blockNext,
    blockPrev,
    reset,
    splitAsmComment
  };
}