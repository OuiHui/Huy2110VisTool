export type Bit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface InstructionFormatSegment {
  /** Inclusive bit index (MSB side). Example: opcode is 15. */
  startBit: Bit;
  /** Inclusive bit index (LSB side). Example: opcode is 12. */
  endBit: Bit;
  /** Text to display inside this bit-field block (e.g. "0001", "DR", "PCoffset9"). */
  text: string;
}

export interface InstructionFormatSpec {
  /** Short label shown above the diagram. */
  title: string;
  /** Bit-field segments laid out left-to-right (15 -> 0). */
  segments: InstructionFormatSegment[];
}

function bitsLiteral(msb: Bit, bits: string): InstructionFormatSegment[] {
  const cleaned = bits.replace(/\s+/g, '');
  const out: InstructionFormatSegment[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const bit = (msb - i) as Bit;
    const ch = cleaned[i];
    if (ch !== '0' && ch !== '1') {
      throw new Error(`bitsLiteral expected only 0/1, got '${bits}'`);
    }
    out.push({ startBit: bit, endBit: bit, text: ch });
  }
  return out;
}

function bitLabels(msb: Bit, labels: string[]): InstructionFormatSegment[] {
  const out: InstructionFormatSegment[] = [];
  for (let i = 0; i < labels.length; i++) {
    const bit = (msb - i) as Bit;
    out.push({ startBit: bit, endBit: bit, text: labels[i] });
  }
  return out;
}

export const INSTRUCTION_FORMATS_BY_MACRO: Record<string, InstructionFormatSpec> = {
  ADD_REG: {
    title: 'ADD (reg)',
    segments: [
      ...bitsLiteral(15, '0001'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 6, text: 'SR1' },
      ...bitsLiteral(5, '0'),
      ...bitsLiteral(4, '00'),
      { startBit: 2, endBit: 0, text: 'SR2' },
    ],
  },
  ADD_IMM: {
    title: 'ADD (imm)',
    segments: [
      ...bitsLiteral(15, '0001'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 6, text: 'SR1' },
      ...bitsLiteral(5, '1'),
      { startBit: 4, endBit: 0, text: 'imm5' },
    ],
  },

  AND_REG: {
    title: 'AND (reg)',
    segments: [
      ...bitsLiteral(15, '0101'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 6, text: 'SR1' },
      ...bitsLiteral(5, '0'),
      ...bitsLiteral(4, '00'),
      { startBit: 2, endBit: 0, text: 'SR2' },
    ],
  },
  AND_IMM: {
    title: 'AND (imm)',
    segments: [
      ...bitsLiteral(15, '0101'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 6, text: 'SR1' },
      ...bitsLiteral(5, '1'),
      { startBit: 4, endBit: 0, text: 'imm5' },
    ],
  },

  NOT: {
    title: 'NOT',
    segments: [
      ...bitsLiteral(15, '1001'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 6, text: 'SR' },
      ...bitsLiteral(5, '111111'),
    ],
  },

  LD: {
    title: 'LD',
    segments: [
      ...bitsLiteral(15, '0010'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 0, text: 'PCoffset9' },
    ],
  },
  LDI: {
    title: 'LDI',
    segments: [
      ...bitsLiteral(15, '1010'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 0, text: 'PCoffset9' },
    ],
  },
  LDR: {
    title: 'LDR',
    segments: [
      ...bitsLiteral(15, '0110'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 6, text: 'BaseR' },
      { startBit: 5, endBit: 0, text: 'offset6' },
    ],
  },

  ST: {
    title: 'ST',
    segments: [
      ...bitsLiteral(15, '0011'),
      { startBit: 11, endBit: 9, text: 'SR' },
      { startBit: 8, endBit: 0, text: 'PCoffset9' },
    ],
  },
  STI: {
    title: 'STI',
    segments: [
      ...bitsLiteral(15, '1011'),
      { startBit: 11, endBit: 9, text: 'SR' },
      { startBit: 8, endBit: 0, text: 'PCoffset9' },
    ],
  },
  STR: {
    title: 'STR',
    segments: [
      ...bitsLiteral(15, '0111'),
      { startBit: 11, endBit: 9, text: 'SR' },
      { startBit: 8, endBit: 6, text: 'BaseR' },
      { startBit: 5, endBit: 0, text: 'offset6' },
    ],
  },

  LEA: {
    title: 'LEA',
    segments: [
      ...bitsLiteral(15, '1110'),
      { startBit: 11, endBit: 9, text: 'DR' },
      { startBit: 8, endBit: 0, text: 'PCoffset9' },
    ],
  },

  BR: {
    title: 'BR',
    segments: [
      ...bitsLiteral(15, '0000'),
      ...bitLabels(11, ['n', 'z', 'p']),
      { startBit: 8, endBit: 0, text: 'PCoffset9' },
    ],
  },

  JMP: {
    title: 'JMP',
    segments: [
      ...bitsLiteral(15, '1100'),
      ...bitsLiteral(11, '000'),
      { startBit: 8, endBit: 6, text: 'BaseR' },
      ...bitsLiteral(5, '000000'),
    ],
  },

  JSR: {
    title: 'JSR',
    segments: [
      ...bitsLiteral(15, '0100'),
      ...bitsLiteral(11, '1'),
      { startBit: 10, endBit: 0, text: 'PCoffset11' },
    ],
  },

  JSRR: {
    title: 'JSRR',
    segments: [
      ...bitsLiteral(15, '0100'),
      ...bitsLiteral(11, '0'),
      ...bitsLiteral(10, '00'),
      { startBit: 8, endBit: 6, text: 'BaseR' },
      ...bitsLiteral(5, '000000'),
    ],
  },

  TRAP: {
    title: 'TRAP',
    segments: [
      ...bitsLiteral(15, '1111'),
      ...bitsLiteral(11, '0000'),
      { startBit: 7, endBit: 0, text: 'trapvect8' },
    ],
  },
};
