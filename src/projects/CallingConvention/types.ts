export type CellKind =
  | 'arg'
  | 'ret-slot'
  | 'saved-r7'
  | 'saved-r5'
  | 'saved-reg'
  | 'local'
  | 'other';

export type Cell = {
  address: number;
  label: string;
  kind: CellKind;
  value?: string;
};

export type MachineState = {
  R6: number;
  R5: number;
  R7: number;
  memory: Map<number, Cell>;
  highlightAddrs: Set<number>;
};

export type StepActor = 'caller' | 'callee';

export type StepDefinition = {
  title: string;
  asm: string;
  detail: string;
  actor: StepActor;
};

export type CallingConventionExample = {
  id: string;
  name: string;
  cCode: string;
  numParams: number;
  numLocals: number;
  argValues: string[];
  argNames: string[];
  localNames: string[];
  returnValue: string;
  calleeName: string;
  usedRegs: string[];
  bodyAsm: string[];
};

export type AsmLine = {
  text: string;
  step: number;
  addr?: string;
};

export type MicroOp =
  | { op: 'dec-sp' }
  | { op: 'push-empty'; kind: CellKind; label: string }
  | { op: 'str-at-sp'; kind: CellKind; label: string; value: string }
  | { op: 'jsr'; returnAddr: number }
  | { op: 'set-fp' }
  | { op: 'alloc-locals'; count: number; names: string[] }
  | { op: 'inc-sp'; count: number }
  | { op: 'ldr-r5' }
  | { op: 'ldr-r7' }
  | { op: 'write-ret-val'; value: string }
  | { op: 'noop' };