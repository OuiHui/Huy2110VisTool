<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
// Adjusted paths: all LC3 tool resources are now siblings inside projects/LC3
// Use the canonical LC3 diagram component from the shared components directory
import LC3 from '../../components/LC3.vue';
import Pseudocode from './Pseudocode.vue';
import SEQUENCE_DATA from './sequences';
import './Lc3Tool.css';

const DEFAULT_ACTIVE_WIRE_TIME = 200;
const CYCLE_BREAK = 'CYCLE_BREAK';
const speedScale = ref(50);
const activeWireTime = computed(() => {
  const scale = Math.pow(4, speedScale.value / 100) / 2;
  return DEFAULT_ACTIVE_WIRE_TIME / scale;
});
// Replace problematic template ref typing with generic HTMLElement fallback to silence TS error if vue shim not yet loaded.
const lc3Diagram = ref<any>();
const wireState = ref({
  wires: [] as string[],
  step: 0,
  stop: 0,
  cycle: 0,
  macro: undefined as string | undefined,
});
const wireActivationHistory = ref<Map<string, number[]>>(new Map());
const loopId = ref<number>();
const running = computed(() => typeof loopId.value !== 'undefined');
const isLoopDone = computed(() => wireState.value.step >= wireState.value.wires.length);
const macroCycleCount = computed(() => wireState.value.macro ? SEQUENCE_DATA[wireState.value.macro].sequence.length : undefined);
// Derive current sequence entry (typed as any fallback) to simplify template typing
const currentSequence = computed(() => wireState.value.macro ? (SEQUENCE_DATA as any)[wireState.value.macro] : undefined);
let lastWireActivate = 0;
function handleKeydown(event: KeyboardEvent) {
  if (event.code === 'Escape') (document.activeElement as HTMLElement)?.blur();
  const isArrow = event.code === 'ArrowLeft' || event.code === 'ArrowRight';
  if (!isArrow) return; // only care about horizontal arrows

  const target = event.target as HTMLElement | null;
  // If target is a slider/input we let it handle arrows (range adjustment / caret move)
  if (target && (target.closest('.p-slider') || ['INPUT','TEXTAREA','SELECT'].includes(target.tagName))) return;

  // Stop Menubar (or any other widget) from performing its own arrow navigation
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  // If focus is currently on a menubar item, blur it so it doesn't re-enter nav mode
  if (target && target.closest('.p-menubar')) (target as HTMLElement).blur();

  // Only step if a macro is active
  if (wireState.value.macro) {
    pauseDiagramLoop();
    if (event.code === 'ArrowLeft') stepBack(); else stepFwd();
  }
}
// Use capture phase so we intercept before PrimeVue Menubar key handlers
onMounted(() => window.addEventListener('keydown', handleKeydown, true));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown, true));
function stepBack() {
  if (wireState.value.step <= 0) return;
  wireState.value.step--;
  const wire = wireState.value.wires[wireState.value.step];
  if (wire == CYCLE_BREAK) wireState.value.cycle--;
  else {
    const history = wireActivationHistory.value.get(wire) || [];
    if (history.length > 0) {
      history.pop();
      if (history.length > 0) lc3Diagram.value?.activateWire(wire, history[history.length - 1]);
      else { lc3Diagram.value?.deactivateWire(wire); wireActivationHistory.value.delete(wire); }
    }
  }
}
function stepFwd() {
  if (wireState.value.step >= wireState.value.stop) return;
  const wire = wireState.value.wires[wireState.value.step];
  if (wire == CYCLE_BREAK) wireState.value.cycle++;
  else {
    if (!wireActivationHistory.value.has(wire)) wireActivationHistory.value.set(wire, []);
    wireActivationHistory.value.get(wire)!.push(wireState.value.cycle);
    lc3Diagram.value?.activateWire(wire, wireState.value.cycle);
  }
  wireState.value.step++;
}
function runTick(ts: number) {
  if (wireState.value.step >= wireState.value.stop) { pauseDiagramLoop(); return; }
  const wire = wireState.value.wires[wireState.value.step];
  const delta = ts - lastWireActivate;
  const wireCooldown = wire == CYCLE_BREAK ? 2 * activeWireTime.value : activeWireTime.value;
  if (delta >= wireCooldown) { stepFwd(); lastWireActivate = ts; }
  loopId.value = requestAnimationFrame(runTick);
}
function startDiagramLoop(pauseAt: 'end' | 'cycle' = 'end') {
  if (pauseAt == 'end') wireState.value.stop = wireState.value.wires.length;
  if (pauseAt == 'cycle') {
    let next = wireState.value.wires.indexOf(CYCLE_BREAK, wireState.value.step + 1);
    if (next == -1) next = wireState.value.wires.length;
    wireState.value.stop = next;
  }
  loopId.value = requestAnimationFrame(runTick);
}
function pauseDiagramLoop() {
  if (typeof loopId.value === 'number') {
    cancelAnimationFrame(loopId.value);
    loopId.value = undefined;
    lastWireActivate = 0;
  }
}
function resetDiagramLoop() {
  pauseDiagramLoop();
  lc3Diagram.value?.resetWires();
  wireState.value = { wires: [], step: 0, stop: 0, cycle: 0, macro: undefined };
  wireActivationHistory.value.clear();
}
function toggleDiagramLoop() { running.value ? pauseDiagramLoop() : startDiagramLoop(); }
function activateMacro(key: string) {
  if (!(key in SEQUENCE_DATA)) return;
  const { sequence } = SEQUENCE_DATA[key];
  resetDiagramLoop();
  wireState.value.macro = key;
  for (const cycle of sequence) wireState.value.wires.push(...cycle, CYCLE_BREAK);
  wireState.value.stop = wireState.value.wires.length;
  // Remove focus from the menu item so global arrow key listener handles stepping
  (document.activeElement as HTMLElement | null)?.blur();
}
</script>
<template>
  <div class="flex flex-col h-full lc3-tool-root">
    <header class="px-4 pt-2 pb-0">
      <div class="flex gap-1 items-center justify-center">
        <h1 class="text-center text-4xl">LC-3 Visualization Tool</h1>
      </div>
    </header>
  <div class="lc3-grid grow px-4" style="margin-top:0;">
      <div class="diagram-col">
        <LC3 ref="lc3Diagram" class="lc3-resized" />
      </div>
  <div class="side-col flex grow flex-col items-start justify-center">
        <Card v-if="currentSequence?.pseudocode">
          <template #title>{{ currentSequence.label }} Pseudocode</template>
          <template #content>
            <Pseudocode :pseudocode="currentSequence.pseudocode" :cycle="wireState.cycle" :running />
          </template>
        </Card>
      </div>
    </div>
  <div class="control-panel">
      <div class="flex items-stretch gap-2 py-2 justify-center">
        <div class="flex items-center gap-2">
          Speed:
          <Slider v-model="speedScale" class="w-56" />
          <div class="pl-1">
            <Button :disabled="isLoopDone" :aria-label="running ? 'Pause' : 'Play'" v-tooltip.top="running ? 'Pause' : 'Play'" @click="toggleDiagramLoop()" class="transition" icon="pi" rounded>
              <mdi-pause v-if="running" />
              <mdi-play v-else />
            </Button>
          </div>
        </div>
        <Divider layout="vertical" />
        <div class="flex gap-2 items-center">
          Step
          <div class="flex gap-0.5">
            <Button aria-label="Step Backward" v-tooltip.top="'Step Backward'" @click="() => { pauseDiagramLoop(); stepBack(); }" :dt="{ root: { borderRadius: '{form.field.border.radius} 0 0 {form.field.border.radius}' } }">
              <mdi-step-backward />
            </Button>
            <Button :disabled="isLoopDone" aria-label="Step Forward" v-tooltip.top="'Step Forward'" @click="() => { pauseDiagramLoop(); stepFwd(); }" :dt="{ root: { borderRadius: '0 {form.field.border.radius} {form.field.border.radius} 0' } }">
              <mdi-step-forward />
            </Button>
          </div>
        </div>
        <Divider layout="vertical" />
        <div class="flex items-center">
          Cycle&nbsp;
          <span class="font-mono" v-if="wireState.macro">{{ Math.min(wireState.cycle + 1, macroCycleCount ?? Infinity) }}</span>
          <span class="font-mono" v-else>-</span>
          &nbsp;of&nbsp;
          <span class="font-mono" v-if="wireState.macro">{{ macroCycleCount ?? '-' }}</span>
          <span class="font-mono" v-else>-</span>
        </div>
        <Button :disabled="isLoopDone || running" @click="startDiagramLoop('cycle')">Next Cycle</Button>
        <Divider layout="vertical" />
        <Button :disabled="wireState.wires.length == 0" @click="resetDiagramLoop()">Reset Wires</Button>
      </div>
      <Divider />
      <div class="flex justify-center">
        <Menubar :model="(Object.entries(SEQUENCE_DATA) as [string, any][]).map(([key, val]) => ({ label: val.label, key, command: (e: any) => activateMacro(e.item.key!) }))" :dt="{ root: { background: 'transparent', borderColor: 'transparent', borderRadius: '0' } }" class="px-0">
        <template #item="{ item, label, props }">
          <a v-bind="props.action" class="transition-colors rounded text-sm p-1 xl:text-base xl:p-2 inline-flex items-center border border-transparent" :class="{ 'outline outline-surface-500': wireState.macro != item.key, 'bg-primary hover:bg-primary-emphasis text-primary-contrast': wireState.macro == item.key && !isLoopDone, 'outline outline-primary-500': wireState.macro == item.key && isLoopDone }">
            {{ label }}
          </a>
        </template>
        </Menubar>
      </div>
    </div>
  </div>
</template>
