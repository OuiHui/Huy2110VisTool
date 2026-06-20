<template>
  <div class="kmap-root">
    <div class="container">
    <header>
      <h1>Karnaugh Map Simplifier</h1>
      <p class="subtitle">Click cells to toggle values — groupings and expressions update automatically.</p>
    </header>

    <div class="controls">
      <div class="control-group">
        <label>Number of Variables</label>
        <div class="variable-controls">
          <Button 
            v-for="num in [2, 3, 4]" 
            :key="num"
            :class="{ active: variables === num }"
            @click="setVariables(num)"
            :severity="variables === num ? 'primary' : 'secondary'"
          >
            {{ num }} Variables
          </Button>
        </div>
      </div>
      <div class="control-group">
        <label>Actions</label>
        <div class="action-controls">
          <Button @click="clearKMap">Clear K-Map</Button>
          <Button @click="randomFill">Random Fill</Button>
          <Button 
            @click="showGroups = !showGroups"
            :class="{ active: showGroups }"
            :severity="showGroups ? 'primary' : 'secondary'"
          >{{ showGroups ? 'Hide Groups' : 'Show Groups' }}</Button>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="kmap-section">
        <h2 class="section-title">Karnaugh Map</h2>
        <KMapGrid 
          :variables="variables"
          :kmap="kmap"
          :groups="groups"
          :show-groups="showGroups"
          :visible-group-indices="visibleGroupIndices"
          @toggle-cell="toggleCell"
        />
        <p class="kmap-instructions">
          Click any cell to toggle between 0 and 1.
        </p>

        <!-- K-map Groupings Section -->
        <div class="groups-container" style="margin-top: 2rem;">
          <h4 class="groupings-title">K-map Groupings</h4>
          <div>
            <div 
              v-if="groups.length === 0"
              class="group-item no-groupings"
            >
              <strong>No K-map Groupings Found</strong><br>
            </div>
            <button 
              v-else
              v-for="(group, index) in groups" 
              :key="index"
              class="group-item group-item-btn fade-in"
              :class="{ 
                'group-item--hidden': showGroups && !visibleGroupIndices.has(index),
                'group-item--visible': showGroups && visibleGroupIndices.has(index)
              }"
              @click="toggleGroupVisibility(index)"
              :title="showGroups && visibleGroupIndices.has(index) ? 'Hide this group' : 'Show this group'"
            >
              <div class="group-item-header">
                <span 
                  class="group-color-dot"
                  :style="{ background: GROUP_COLORS[index % GROUP_COLORS.length] }"
                ></span>
                <span class="group-item-title">
                  <strong>Grouping {{ index + 1 }}:</strong> {{ group.terms.join(', ') }}
                </span>
                <span 
                  class="group-eye-icon"
                >
                  <!-- Eye open: only when actively shown on the map -->
                  <svg v-if="showGroups && visibleGroupIndices.has(index)" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <!-- Eye closed: when hidden or overlay is off -->
                  <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 1 12 1 12a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </div>
              <em>Simplified Form: {{ group.expression }}</em>
            </button>
          </div>
        </div>
      </div>

      <div class="analysis-section">
        <h2 class="section-title">Analysis</h2>
        
        <TruthTable 
          :variables="variables"
          :kmap="kmap"
        />

        <div>
          <h4 class="expression-title">Simplified Expression</h4>
          <div class="expression-display">
            {{ simplifiedExpression }}
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'
import KMapGrid from './components/KMapGrid.vue'
import TruthTable from './components/TruthTable.vue'
import { useKMapLogic } from './composables/useKMapLogic'

export const GROUP_COLORS = [
  '#e06c75',
  '#61afef',
  '#98c379',
  '#e5c07b',
  '#c678dd',
  '#56b6c2',
  '#d19a66',
  '#abb2bf',
]

export default {
  name: 'App',
  components: {
    KMapGrid,
    TruthTable
  },
  setup() {
    const variables = ref(3)
    const kmap = reactive({})
    const showGroups = ref(false)
    const visibleGroupIndices = ref(new Set())
    
    const { 
      findGroups, 
      generateSimplifiedExpression 
    } = useKMapLogic()

    const groups = ref([])
    
    const simplifiedExpression = computed(() => {
      return generateSimplifiedExpression(kmap, groups.value, variables.value)
    })

    const setVariables = (num) => {
      variables.value = num
      clearKMap()
    }

    const toggleCell = (minterm) => {
      if (kmap[minterm] === '1') {
        delete kmap[minterm]
      } else {
        kmap[minterm] = '1'
      }
      updateGroups()
    }

    const clearKMap = () => {
      Object.keys(kmap).forEach(key => delete kmap[key])
      groups.value = []
      visibleGroupIndices.value = new Set()
    }

    const randomFill = () => {
      clearKMap()
      const numCells = Math.pow(2, variables.value)
      
      for (let i = 0; i < numCells; i++) {
        const binary = i.toString(2).padStart(variables.value, '0')
        if (Math.random() > 0.5) {
          kmap[binary] = '1'
        }
      }
      updateGroups()
    }

    const updateGroups = () => {
      const ones = Object.keys(kmap).filter(key => kmap[key] === '1')
      groups.value = findGroups(ones, variables.value)
      // Reset visibility — all groups visible by default
      visibleGroupIndices.value = new Set(groups.value.map((_, i) => i))
    }

    const toggleGroupVisibility = (index) => {
      // Auto-enable the overlay when clicking a group item while it's off
      if (!showGroups.value) {
        showGroups.value = true
        visibleGroupIndices.value = new Set([index])  // show only clicked group
        return
      }
      const next = new Set(visibleGroupIndices.value)
      if (next.has(index)) {
        // Already visible — hide it
        next.delete(index)
      } else {
        // Hidden — make it visible
        next.add(index)
      }
      visibleGroupIndices.value = next
    }

    // Watch for changes in variables to update groups
    watch(variables, () => {
      updateGroups()
    })

    // When showGroups is turned on from the master button, make all groups visible
    watch(showGroups, (v) => {
      if (v && visibleGroupIndices.value.size === 0) {
        visibleGroupIndices.value = new Set(groups.value.map((_, i) => i))
      }
    })

    return {
      variables,
      kmap,
      groups,
      showGroups,
      visibleGroupIndices,
      simplifiedExpression,
      setVariables,
      toggleCell,
      clearKMap,
      randomFill,
      toggleGroupVisibility,
      GROUP_COLORS,
    }
  }
}
</script>

<style>
@import url('./style.css');
</style>
