<template>
  <div class="truth-table-container">
    <table class="truth-table">
      <thead>
        <tr>
          <th v-for="variable in variableNames" :key="variable">
            {{ variable }}
          </th>
          <th>F</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in truthTableRows" :key="index">
          <td v-for="bit in row.inputs" :key="bit">{{ bit }}</td>
          <td 
            :style="{ 
              fontWeight: '600', 
              color: row.output === '1' ? '#059669' : '#dc2626' 
            }"
          >
            {{ row.output }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'TruthTable',
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
  setup(props) {
    const variableNames = computed(() => {
      return ['A', 'B', 'C', 'D'].slice(0, props.variables)
    })

    const truthTableRows = computed(() => {
      const numRows = Math.pow(2, props.variables)
      const rows = []
      
      for (let i = 0; i < numRows; i++) {
        const binary = i.toString(2).padStart(props.variables, '0')
        const inputs = binary.split('')
        const output = props.kmap[binary] || '0'
        
        rows.push({
          inputs,
          output
        })
      }
      
      return rows
    })

    return {
      variableNames,
      truthTableRows
    }
  }
}
</script>
