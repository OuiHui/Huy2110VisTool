import type { Cell, MachineState, MicroOp } from './types';

export function clamp16(v: number) {
  return ((v % 0x10000) + 0x10000) % 0x10000;
}

export function hex16(v: number) {
  return 'x' + clamp16(v).toString(16).toUpperCase().padStart(4, '0');
}

function parseHex(s: string): number | null {
  if (typeof s === 'string' && s.startsWith('x')) {
    const n = Number.parseInt(s.slice(1), 16);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function simulateMicro(ops: MicroOp[], instrIndex: number): MachineState {
  const initialSP = 0xFE00;
  const initialFP = 0xFE10;

  let R6 = initialSP;
  let R5 = initialFP;
  let R7 = 0x0000;

  const memory = new Map<number, Cell>();
  const highlightAddrs = new Set<number>();

  const limit = Math.min(instrIndex + 1, ops.length);

  for (let i = 0; i < limit; i++) {
    const op = ops[i];
    highlightAddrs.clear();

    switch (op.op) {
      case 'dec-sp':
        R6 = clamp16(R6 - 1);
        highlightAddrs.add(R6);
        break;

      case 'push-empty':
        R6 = clamp16(R6 - 1);
        memory.set(R6, { address: R6, kind: op.kind, label: op.label, value: '' });
        highlightAddrs.add(R6);
        break;

      case 'str-at-sp':
        memory.set(R6, { address: R6, kind: op.kind, label: op.label, value: op.value });
        highlightAddrs.add(R6);
        break;

      case 'jsr':
        R7 = clamp16(op.returnAddr);
        break;

      case 'set-fp':
        R5 = clamp16(R6 - 1);
        break;

      case 'alloc-locals': {
        for (let j = 0; j < op.count; j++) {
          const addr = clamp16(R5 - j);
          memory.set(addr, { address: addr, kind: 'local', label: op.names[j] ?? `local${j + 1}`, value: '' });
        }
        R6 = clamp16(R6 - op.count);
        highlightAddrs.add(R6);
        break;
      }

      case 'inc-sp':
        R6 = clamp16(R6 + op.count);
        highlightAddrs.add(R6);
        break;

      case 'ldr-r5': {
        const cell = memory.get(R6);
        const parsed = cell?.value ? parseHex(cell.value) : null;
        R5 = parsed !== null ? clamp16(parsed) : initialFP;
        highlightAddrs.add(R6);
        break;
      }

      case 'ldr-r7': {
        const cell = memory.get(R6);
        const parsed = cell?.value ? parseHex(cell.value) : null;
        if (parsed !== null) R7 = clamp16(parsed);
        highlightAddrs.add(R6);
        break;
      }

      case 'write-ret-val': {
        const addr = clamp16(R5 + 3);
        const existing = memory.get(addr);
        memory.set(addr, {
          address: addr,
          kind: 'ret-slot',
          label: existing?.label ?? 'return value (slot)',
          value: op.value
        });
        highlightAddrs.add(addr);
        break;
      }

      case 'noop':
        break;
    }
  }

  return { R6, R5, R7, memory, highlightAddrs };
}
