import type { Cell, MachineState } from './types';

export function clamp16(v: number) {
  return ((v % 0x10000) + 0x10000) % 0x10000;
}

export function hex16(v: number) {
  return 'x' + clamp16(v).toString(16).toUpperCase().padStart(4, '0');
}

export function simulate(targetStep: number, example: {
  numParams: number;
  numLocals: number;
  argValues: string[];
  usedRegs: string[];
  returnValue: string;
}): MachineState {
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
    for (let i = example.numParams; i >= 1; i--) {
      push({ kind: 'arg', label: `arg${i}`, value: example.argValues[i - 1] ?? '' });
    }
  }

  if (targetStep >= 2) {
    R7 = clamp16(initialPC + example.numParams * 2 + 1);
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
    const locals = Math.max(0, example.numLocals | 0);
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
    for (let i = 0; i < example.usedRegs.length; i++) {
      push({ kind: 'saved-reg', label: `saved ${example.usedRegs[i]}`, value: '' });
    }
  }

  if (targetStep >= 9) {
    write(R5 + 3, { kind: 'ret-slot', label: 'return value (slot)', value: example.returnValue });
  }

  if (targetStep >= 10) {
    const numRegs = example.usedRegs.length;
    if (numRegs > 0) {
      R6 = clamp16(R6 + numRegs);
      highlightAddrs.clear();
      highlightAddrs.add(R6);
    }
  }

  if (targetStep >= 11) {
    const locals = Math.max(0, example.numLocals | 0);
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
    R6 = clamp16(R6 + Math.max(0, example.numParams | 0));
    highlightAddrs.clear();
    highlightAddrs.add(R6);
  }

  return { R6, R5, R7, memory, highlightAddrs };
}
