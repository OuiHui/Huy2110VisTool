const fs = require('fs');
const file = 'src/projects/LC3/Lc3Tool.vue';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div class=""control-panel"">[\s\S]*?<\/template>/;

const newHTML = \<div class="control-panel">
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
          <div class="max-sm:text-xs">
            <span class="max-xl:hidden">Cycle&nbsp;</span>
            <span class="font-mono" v-if="wireState.macro">{{ Math.min(wireState.cycle + 1, macroCycleCount ?? Infinity) }}</span>
            <span class="font-mono" v-else>-</span>
            <span class="text-surface-500">&nbsp;/&nbsp;</span>
            <span class="font-mono" v-if="wireState.macro">{{ macroCycleCount ?? '-' }}</span>
            <span class="font-mono" v-else>-</span>
          </div>
          <Button :disabled="isLoopDone || running" @click="startDiagramLoop('cycle')" class="whitespace-nowrap px-2 py-2 sm:px-3">Next<span class="max-md:hidden">&nbsp;Cycle</span></Button>
        </div>
        <Divider layout="vertical" class="hidden lg:block lg:ml-auto" />
        <Button :disabled="wireState.wires.length == 0" @click="resetDiagramLoop()" class="whitespace-nowrap max-sm:p-2" outlined>Reset<span class="max-md:hidden">&nbsp;Wires</span></Button>
      </div>
      <Divider class="my-0 max-sm:block" />
      <div class="flex justify-start xl:justify-center overflow-x-auto w-full py-2 px-1 align-middle" style="scrollbar-width: none;">
        <div class="flex gap-1.5 items-center w-max pb-1">
          <a
            v-for="([key, val]) in (Object.entries(SEQUENCE_DATA) as [string, any][])"
            :key="key"
            @click.prevent="activateMacro(key)"
            href="#"
            class="transition-colors rounded text-sm xl:text-base px-2.5 py-1.5 xl:p-2 inline-flex items-center border border-transparent whitespace-nowrap cursor-pointer select-none"
            :class="{ 
              'outline outline-surface-400 hover:bg-surface-200 dark:outline-surface-600 dark:hover:bg-surface-800': wireState.macro !== key, 
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
</template>\;

content = content.replace(regex, newHTML);
fs.writeFileSync(file, content);