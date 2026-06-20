<template>
  <div class="kmap-wrapper" ref="wrapperRef">
    <div 
      class="kmap" 
      :class="`kmap-${variables}var`"
      ref="gridRef"
    >
      <!-- Headers and cells based on variables -->
      <template v-if="variables === 2">
        <div class="kmap-header"></div>
        <div class="kmap-header">B'</div>
        <div class="kmap-header">B</div>
        
        <div class="kmap-label">A'</div>
        <KMapCell 
          minterm="00" 
          :value="kmap['00'] || '0'"
          @toggle="$emit('toggle-cell', '00')"
        />
        <KMapCell 
          minterm="01" 
          :value="kmap['01'] || '0'"
          @toggle="$emit('toggle-cell', '01')"
        />
        
        <div class="kmap-label">A</div>
        <KMapCell 
          minterm="10" 
          :value="kmap['10'] || '0'"
          @toggle="$emit('toggle-cell', '10')"
        />
        <KMapCell 
          minterm="11" 
          :value="kmap['11'] || '0'"
          @toggle="$emit('toggle-cell', '11')"
        />
      </template>

      <template v-else-if="variables === 3">
        <div class="kmap-header"></div>
        <div class="kmap-header">B'C'</div>
        <div class="kmap-header">B'C</div>
        <div class="kmap-header">BC</div>
        <div class="kmap-header">BC'</div>
        
        <div class="kmap-label">A'</div>
        <KMapCell v-for="term in ['000', '001', '011', '010']" 
          :key="term"
          :minterm="term" 
          :value="kmap[term] || '0'"
          @toggle="$emit('toggle-cell', term)"
        />
        
        <div class="kmap-label">A</div>
        <KMapCell v-for="term in ['100', '101', '111', '110']" 
          :key="term"
          :minterm="term" 
          :value="kmap[term] || '0'"
          @toggle="$emit('toggle-cell', term)"
        />
      </template>

      <template v-else-if="variables === 4">
        <div class="kmap-header"></div>
        <div class="kmap-header">C'D'</div>
        <div class="kmap-header">C'D</div>
        <div class="kmap-header">CD</div>
        <div class="kmap-header">CD'</div>
        
        <template v-for="(rowLabel, i) in rowLabels" :key="i">
          <div class="kmap-label">{{ rowLabel }}</div>
          <KMapCell 
            v-for="term in cellMappings[i]" 
            :key="term"
            :minterm="term" 
            :value="kmap[term] || '0'"
            @toggle="$emit('toggle-cell', term)"
          />
        </template>
      </template>
    </div>

    <!-- Group overlay SVG -->
    <KMapGroupOverlay
      v-if="showGroups && groups.length > 0 && cellMetrics.cellW > 0"
      :groups="groups"
      :variables="variables"
      :visibleGroupIndices="visibleGroupIndices"
      :cellW="cellMetrics.cellW"
      :cellH="cellMetrics.cellH"
      :numCols="numCols"
      :numRows="numRows"
      :offsetX="cellMetrics.offsetX"
      :offsetY="cellMetrics.offsetY"
      :svgWidth="cellMetrics.svgWidth"
      :svgHeight="cellMetrics.svgHeight"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import KMapCell from './KMapCell.vue'
import KMapGroupOverlay from './KMapGroupOverlay.vue'

export default {
  name: 'KMapGrid',
  components: {
    KMapCell,
    KMapGroupOverlay
  },
  props: {
    variables: {
      type: Number,
      required: true
    },
    kmap: {
      type: Object,
      required: true
    },
    groups: {
      type: Array,
      default: () => []
    },
    showGroups: {
      type: Boolean,
      default: false
    },
    visibleGroupIndices: {
      type: Set,
      default: () => new Set()
    }
  },
  emits: ['toggle-cell'],
  setup(props) {
    const rowLabels = ["A'B'", "A'B", "AB", "AB'"]
    const cellMappings = [
      ['0000', '0001', '0011', '0010'],
      ['0100', '0101', '0111', '0110'],
      ['1100', '1101', '1111', '1110'],
      ['1000', '1001', '1011', '1010']
    ]

    const gridRef = ref(null)
    const wrapperRef = ref(null)

    const numCols = computed(() => props.variables === 2 ? 2 : 4)
    const numRows = computed(() => props.variables === 2 ? 2 : props.variables === 3 ? 2 : 4)

    const cellMetrics = ref({ cellW: 0, cellH: 0, offsetX: 0, offsetY: 0, svgWidth: 0, svgHeight: 0 })

    const measureGrid = () => {
      const grid = gridRef.value
      const wrapper = wrapperRef.value
      if (!grid || !wrapper) return

      // Find all .kmap-cell elements within the grid
      const cells = grid.querySelectorAll('.kmap-cell')
      if (cells.length === 0) return

      const gridRect = grid.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()

      // The offset from wrapper to grid
      const gridOffsetX = gridRect.left - wrapperRect.left
      const gridOffsetY = gridRect.top - wrapperRect.top

      // Get first cell to determine size
      const firstCell = cells[0]
      const firstRect = firstCell.getBoundingClientRect()
      const cellW = firstRect.width
      const cellH = firstRect.height

      // Offset from wrapper to the first data cell
      const offsetX = gridOffsetX + (firstRect.left - gridRect.left)
      const offsetY = gridOffsetY + (firstRect.top - gridRect.top)

      cellMetrics.value = {
        cellW,
        cellH,
        offsetX,
        offsetY,
        svgWidth: gridRect.width,
        svgHeight: gridRect.height
      }
    }

    let ro = null
    onMounted(() => {
      nextTick(measureGrid)
      ro = new ResizeObserver(measureGrid)
      if (gridRef.value) ro.observe(gridRef.value)
    })

    onUnmounted(() => {
      if (ro) ro.disconnect()
    })

    watch(() => props.variables, () => nextTick(measureGrid))
    watch(() => props.showGroups, (v) => { if (v) nextTick(measureGrid) })

    return {
      rowLabels,
      cellMappings,
      gridRef,
      wrapperRef,
      cellMetrics,
      numCols,
      numRows
    }
  }
}
</script>
