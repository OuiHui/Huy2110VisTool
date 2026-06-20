<template>
  <svg
    class="kmap-group-overlay"
    :width="svgWidth"
    :height="svgHeight"
    :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
    xmlns="http://www.w3.org/2000/svg"
  >
    <template v-for="(rects, gi) in groupRects" :key="gi">
      <template v-if="visibleGroupIndices.has(gi)">
        <rect
          v-for="(r, ri) in rects"
          :key="ri"
          :x="r.x + INSET"
          :y="r.y + INSET"
          :width="Math.max(0, r.w - INSET * 2)"
          :height="Math.max(0, r.h - INSET * 2)"
          :rx="RADIUS"
          :ry="RADIUS"
          :fill="GROUP_COLORS[gi % GROUP_COLORS.length] + '22'"
          :stroke="GROUP_COLORS[gi % GROUP_COLORS.length]"
          stroke-width="2.5"
          :stroke-dasharray="r.dashes || ''"
        />
      </template>
    </template>
  </svg>
</template>

<script>
import { computed } from 'vue'

const GROUP_COLORS = [
  '#e06c75', // red
  '#61afef', // blue
  '#98c379', // green
  '#e5c07b', // yellow
  '#c678dd', // purple
  '#56b6c2', // cyan
  '#d19a66', // orange
  '#abb2bf', // grey
]

// Inset so borders don't overlap adjacent cells; corner radius
const INSET = 3
const RADIUS = 7

export default {
  name: 'KMapGroupOverlay',
  props: {
    groups: {
      type: Array,
      default: () => []
    },
    variables: {
      type: Number,
      required: true
    },
    // Cell metrics passed in from parent after measuring
    cellW: { type: Number, default: 0 },
    cellH: { type: Number, default: 0 },
    // Number of data rows/cols (excluding headers)
    numCols: { type: Number, default: 0 },
    numRows: { type: Number, default: 0 },
    // Pixel offset of the first data cell from top-left of SVG
    offsetX: { type: Number, default: 0 },
    offsetY: { type: Number, default: 0 },
    svgWidth: { type: Number, default: 0 },
    svgHeight: { type: Number, default: 0 },
    visibleGroupIndices: {
      type: Set,
      default: () => new Set()
    },
  },
  setup(props) {
    // Gray code position maps:
    // For cols/rows: gray index 00→0, 01→1, 11→2, 10→3
    const grayToPos = { '00': 0, '01': 1, '11': 2, '10': 3 }

    const mintermsToGridCoords = (terms) => {
      const v = props.variables
      return terms.map(term => {
        if (v === 2) {
          // term = 'AB'  row=A, col=B  (2-var has no gray coding — just 0/1)
          const r = parseInt(term[0], 10)
          const c = parseInt(term[1], 10)
          return { r, c }
        } else if (v === 3) {
          // term = 'ABC'  row=A, cols in gray order of BC
          const r = parseInt(term[0], 10)
          const bc = term[1] + term[2]
          const c = grayToPos[bc]
          return { r, c }
        } else {
          // term = 'ABCD'  rows in gray order of AB, cols in gray of CD
          const ab = term[0] + term[1]
          const cd = term[2] + term[3]
          const r = grayToPos[ab]
          const c = grayToPos[cd]
          return { r, c }
        }
      })
    }

    // Given a set of (r,c) coords, compute bounding rects accounting for wraparound.
    // Returns array of {x, y, w, h, dashes?} pixel rects.
    const coordsToRects = (coords) => {
      if (coords.length === 0) return []
      const rows = [...new Set(coords.map(c => c.r))].sort((a, b) => a - b)
      const cols = [...new Set(coords.map(c => c.c))].sort((a, b) => a - b)
      const { cellW, cellH, offsetX, offsetY, numCols, numRows } = props

      // Check for wraparound: a group wraps if it includes both first and last row/col
      // and the gap means it's a border-wrap group (rows not contiguous in the middle)
      const rowWrap = rows.includes(0) && rows.includes(numRows - 1) && !isContiguous(rows, numRows)
      const colWrap = cols.includes(0) && cols.includes(numCols - 1) && !isContiguous(cols, numCols)

      // For wrapped axis: split into two segments
      const rowSegments = rowWrap ? splitWrap(rows, numRows) : [rows]
      const colSegments = colWrap ? splitWrap(cols, numCols) : [cols]

      const rects = []
      for (const rs of rowSegments) {
        for (const cs of colSegments) {
          const minR = Math.min(...rs)
          const maxR = Math.max(...rs)
          const minC = Math.min(...cs)
          const maxC = Math.max(...cs)
          // Edge dashes for wrapped segments to signal they're "cut"
          const isWrappedRow = rowWrap && rowSegments.length > 1
          const isWrappedCol = colWrap && colSegments.length > 1

          rects.push({
            x: offsetX + minC * cellW,
            y: offsetY + minR * cellH,
            w: (maxC - minC + 1) * cellW,
            h: (maxR - minR + 1) * cellH,
            // dashed stroke on the cut edge
            dashes: (isWrappedRow || isWrappedCol) ? '6,4' : ''
          })
        }
      }
      return rects
    }

    // Check if the sorted array of indices is contiguous
    const isContiguous = (sortedArr, _total) => {
      for (let i = 1; i < sortedArr.length; i++) {
        if (sortedArr[i] !== sortedArr[i - 1] + 1) return false
      }
      return true
    }

    // Split a wrapped axis into two contiguous segments:
    // e.g. [0,3] in a 4-element axis → [[3],[0]]
    const splitWrap = (sortedArr, total) => {
      // Find the break point
      let breakIdx = -1
      for (let i = 1; i < sortedArr.length; i++) {
        if (sortedArr[i] !== sortedArr[i - 1] + 1) {
          breakIdx = i
          break
        }
      }
      if (breakIdx === -1) return [sortedArr]
      const high = sortedArr.slice(0, breakIdx) // high indices (e.g. 3)
      const low = sortedArr.slice(breakIdx)     // low indices (e.g. 0)
      return [high, low]
    }

    const groupRects = computed(() => {
      if (!props.cellW || !props.cellH) return []
      return props.groups.map(group => {
        const coords = mintermsToGridCoords(group.terms)
        return coordsToRects(coords)
      })
    })

    return {
      groupRects,
      GROUP_COLORS,
      INSET,
      RADIUS
    }
  }
}
</script>

<style scoped>
.kmap-group-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: visible;
}
</style>
