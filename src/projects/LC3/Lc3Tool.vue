<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
// Adjusted paths: all LC3 tool resources are now siblings inside projects/LC3
// Use the canonical LC3 datapath SVG component from the projects/LC3 directory
import LC3 from './LC3.vue';
import Pseudocode from './Pseudocode.vue';
import InstructionFormat from './InstructionFormat.vue';
import SEQUENCE_DATA from './sequences';
import { INSTRUCTION_FORMATS_BY_MACRO } from './instructionFormats';
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
const canStepBack = computed(() => wireState.value.step > 0);
const macroCycleCount = computed(() => wireState.value.macro ? SEQUENCE_DATA[wireState.value.macro].sequence.length : undefined);
const showPseudocode = ref(true);
const showInstructionFormat = ref(false);
const hasSidebar = computed(() => showPseudocode.value && !!currentSequence.value?.pseudocode);

// Derive current sequence entry (typed as any fallback) to simplify template typing
const currentSequence = computed(() => wireState.value.macro ? (SEQUENCE_DATA as any)[wireState.value.macro] : undefined);
const currentFormat = computed(() => {
  if (!wireState.value.macro) return undefined;
  return INSTRUCTION_FORMATS_BY_MACRO[wireState.value.macro];
});
const cycleDescriptions = computed(() => {
  const descriptions = currentSequence.value?.cycleDescriptions;
  if (!descriptions || descriptions.length === 0) return [];
  return descriptions.map((text, index) => ({
    index: index + 1,
    text,
  }));
});
function getCycleClass(cycleIndex: number) {
  if (wireState.value.step === 0) return [];
  const isEnd = wireState.value.step >= wireState.value.wires.length;
  const currentCycle = isEnd ? wireState.value.cycle - 1 : wireState.value.cycle;
  if (cycleIndex !== currentCycle) return [];
  return ['is-current', `cycle-${cycleIndex}`];
}

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
onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true);
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true);
});

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
function resetDiagramLoop(keepMacro = false) {
  pauseDiagramLoop();
  lc3Diagram.value?.resetWires();
  if (keepMacro) {
    wireState.value.step = 0;
    wireState.value.cycle = 0;
    wireState.value.stop = wireState.value.wires.length;
  } else {
    wireState.value = { wires: [], step: 0, stop: 0, cycle: 0, macro: undefined };
  }
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
    <header class="px-4 pt-3 pb-1">
      <div class="flex gap-2 items-center justify-center">
        <h1 class="text-center text-4xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
          <span class="text-primary-600 dark:text-primary-400">LC-3</span> Visualization Tool
        </h1>
      </div>
    </header>
  <div class="lc3-grid grow px-4" style="margin-top:0;">
      <div class="diagram-col">
        <div class="instruction-format-wrap" :class="{ collapsed: !showInstructionFormat || !currentFormat }">
          <Card v-if="currentFormat" class="instruction-format-card">
            <template #title>
              <div class="w-full flex items-baseline gap-2">
                <span>Instruction Format:</span>
                <span class="font-mono text-sm text-surface-600 dark:text-surface-300">
                  {{ currentSequence?.label ?? currentFormat.title }}
                </span>
              </div>
            </template>
            <template #content>
              <div class="pt-2">
                <InstructionFormat :format="currentFormat" />
              </div>
            </template>
          </Card>
        </div>
        <div class="lc3-main">
          <div class="lc3-diagram-area">
            <LC3
              ref="lc3Diagram"
              class="lc3-resized"
              :class="{ 'lc3-resized-full': !hasSidebar }"
            />
          </div>
          <aside
            class="lc3-sidepanel"
            v-if="currentSequence?.pseudocode"
            :class="{ collapsed: !showPseudocode }"
          >
          <Card :pt="{ root: { class: 'lc3-sidepanel-card' }, body: { class: 'lc3-sidepanel-body' }, content: { class: 'lc3-sidepanel-content' } }">
            <template #title>{{ currentSequence.label }} Pseudocode</template>
            <template #content>
              <div class="lc3-codebox">
                <Pseudocode
                  v-show="showPseudocode"
                  :pseudocode="currentSequence.pseudocode"
                  :cycle="wireState.cycle"
                  :running
                />
              </div>
              <div class="lc3-cycle-list">
                <div class="lc3-cycle-title">Cycle Details</div>
                <div v-if="cycleDescriptions.length" class="flex flex-col gap-2">
                  <div v-for="cycle in cycleDescriptions" :key="cycle.index" :class="['lc3-cycle-row', getCycleClass(cycle.index - 1)]">
                    <div class="lc3-cycle-label">Cycle {{ cycle.index }}</div>
                    <div class="lc3-cycle-text">{{ cycle.text }}</div>
                  </div>
                </div>
                <div v-else class="lc3-cycle-empty">No cycle descriptions available yet.</div>
              </div>
            </template>
          </Card>
        </aside>
        </div>
      </div>
    </div>
  <div class="control-panel">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-3 py-2 justify-center lg:gap-4">
        <div class="flex items-center gap-2">
          <span class="max-sm:hidden">Panels:</span>
          <Button
            :disabled="!currentSequence?.pseudocode"
            @click="showPseudocode = !showPseudocode"
            v-tooltip.top="showPseudocode ? 'Hide pseudocode' : 'Show pseudocode'"
            :severity="showPseudocode ? 'primary' : 'secondary'"
            outlined
          >
            Pseudocode
          </Button>
          <Button
            :disabled="!currentFormat"
            @click="showInstructionFormat = !showInstructionFormat"
            v-tooltip.top="showInstructionFormat ? 'Hide instruction format' : 'Show instruction format'"
            :severity="showInstructionFormat ? 'primary' : 'secondary'"
            outlined
          >
            Format
          </Button>
        </div>
        <Divider layout="vertical" class="hidden xl:block" />
        <div class="flex items-center gap-2">
          <span class="max-sm:hidden">Speed:</span>
          <Slider v-model="speedScale" class="w-24 sm:w-32 lg:w-56" />
          <div class="pl-1">
            <Button :disabled="isLoopDone" :aria-label="running ? 'Pause' : 'Play'" v-tooltip.top="running ? 'Pause' : 'Play'" @click="toggleDiagramLoop()" class="transition" icon="pi" rounded>
              <mdi-pause v-if="running" />
              <mdi-play v-else />
            </Button>
          </div>
        </div>
        <Divider layout="vertical" class="hidden xl:block" />
        <div class="flex gap-2 items-center">
          <span class="max-sm:hidden">Step</span>
          <div class="flex gap-0.5">
            <Button :disabled="!canStepBack" aria-label="Step Backward" v-tooltip.top="'Step Backward'" @click="() => { pauseDiagramLoop(); stepBack(); }" :dt="{ root: { borderRadius: '{form.field.border.radius} 0 0 {form.field.border.radius}' } }">
              <mdi-step-backward />
            </Button>
            <Button :disabled="isLoopDone" aria-label="Step Forward" v-tooltip.top="'Step Forward'" @click="() => { pauseDiagramLoop(); stepFwd(); }" :dt="{ root: { borderRadius: '0 {form.field.border.radius} {form.field.border.radius} 0' } }">
              <mdi-step-forward />
            </Button>
          </div>
        </div>
        <Divider layout="vertical" class="hidden xl:block" />
        <div class="flex items-center gap-1 sm:gap-2">
          <div class="max-xl:text-sm">
            <span class="max-xl:hidden">Cycle&nbsp;</span>
            <span class="font-mono" v-if="wireState.macro">{{ Math.min(wireState.cycle + 1, macroCycleCount ?? Infinity) }}</span>
            <span class="font-mono" v-else>-</span>
            <span class="text-surface-500">&nbsp;/&nbsp;</span>
            <span class="font-mono" v-if="wireState.macro">{{ macroCycleCount ?? '-' }}</span>
            <span class="font-mono" v-else>-</span>
          </div>
          <Button :disabled="isLoopDone || running" @click="startDiagramLoop('cycle')" class="whitespace-nowrap px-3 py-2"><span>Next<span class="max-md:hidden">&nbsp;Cycle</span></span></Button>
        </div>
        <Divider layout="vertical" class="hidden xl:block" />
        <Button :disabled="wireState.wires.length == 0" @click="resetDiagramLoop(true)" class="whitespace-nowrap px-3 py-2"><span>Reset<span class="max-md:hidden">&nbsp;Wires</span></span></Button>
      </div>
      <Divider class="my-0 max-sm:block hidden" />
      <div class="w-full overflow-x-auto py-2 px-1 text-center" style="scrollbar-width: auto; scrollbar-color: var(--p-surface-400) transparent;">
        <div class="inline-flex gap-1.5 items-center pb-1 mb-1">
          <a
            v-for="([key, val]) in (Object.entries(SEQUENCE_DATA) as [string, any][])"
            :key="key"
            @click.prevent="activateMacro(key)"
            href="#"
            class="transition-colors rounded text-sm xl:text-base px-2.5 py-1.5 xl:p-2 inline-flex items-center border border-transparent whitespace-nowrap cursor-pointer select-none"
            :class="{ 
              'outline outline-surface-300 hover:bg-surface-200 dark:outline-surface-600 dark:hover:bg-surface-800': wireState.macro !== key, 
              'bg-primary text-primary-contrast': wireState.macro === key && !isLoopDone,
              'outline outline-primary-500 bg-surface-100 dark:bg-surface-800': wireState.macro === key && isLoopDone 
            }"
          >
            {{ val.label }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

