<template>
  <div 
    class="kmap" 
    :class="`kmap-${variables}var`"
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
</template>

<script>
import KMapCell from './KMapCell.vue'

export default {
  name: 'KMapGrid',
  components: {
    KMapCell
  },
  props: {
    variables: {
      type: Number,
      required: true
    },
    kmap: {
      type: Object,
      required: true
    }
  },
  emits: ['toggle-cell'],
  setup() {
    const rowLabels = ["A'B'", "A'B", "AB", "AB'"]
    const cellMappings = [
      ['0000', '0001', '0011', '0010'],
      ['0100', '0101', '0111', '0110'],
      ['1100', '1101', '1111', '1110'],
      ['1000', '1001', '1011', '1010']
    ]

    return {
      rowLabels,
      cellMappings
    }
  }
}
</script>
