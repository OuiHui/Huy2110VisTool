<template>
  <div class="kmap-root">
    <div class="container">
    <header>
      <h1>Boolean Logic Simplifier</h1>
      <p class="subtitle">Advanced Karnaugh Map Visualization & Analysis Tool</p>
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
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="kmap-section">
        <h2 class="section-title">Karnaugh Map</h2>
        <KMapGrid 
          :variables="variables"
          :kmap="kmap"
          @toggle-cell="toggleCell"
        />
        <p class="kmap-instructions">
          Click cells to toggle between 0 and 1<br>
          <small>K-map groupings will automatically appear below once you add values</small>
        </p>

        <!-- K-map Groupings Section moved here -->
        <div class="groups-container" style="margin-top: 2rem;">
          <h4 class="groupings-title">K-map Groupings</h4>
          <div>
            <div 
              v-if="groups.length === 0"
              class="group-item no-groupings"
            >
              <strong>No K-map Groupings Found</strong><br>
            </div>
            <div 
              v-else
              v-for="(group, index) in groups" 
              :key="index"
              class="group-item fade-in"
            >
              <strong>Grouping {{ index + 1 }}:</strong> {{ group.terms.join(', ') }}<br>
              <em>Simplified Form: {{ group.expression }}</em>
            </div>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import KMapGrid from './components/KMapGrid.vue'
import TruthTable from './components/TruthTable.vue'
import { useKMapLogic } from './composables/useKMapLogic'

export default {
  name: 'App',
  components: {
    KMapGrid,
    TruthTable
  },
  setup() {
    const variables = ref(3)
    const kmap = reactive({})
    
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
    }

    // Watch for changes in variables to update groups
    watch(variables, () => {
      updateGroups()
    })

    return {
      variables,
      kmap,
      groups,
      simplifiedExpression,
      setVariables,
      toggleCell,
      clearKMap,
      randomFill
    }
  }
}
</script>

<style>
/* Import Kmap styles (scoped via kmap-root wrapper) */
@import url('./style.css');
</style>
