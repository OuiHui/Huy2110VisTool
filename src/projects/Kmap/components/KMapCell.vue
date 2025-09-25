<template>
  <div 
    class="kmap-cell"
    :class="{ 'value-1': value === '1', 'value-0': value === '0' }"
    @click="$emit('toggle')"
  >
    {{ value }}
  </div>
</template>

<script>
export default {
  name: 'KMapCell',
  props: {
    minterm: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  },
  emits: ['toggle']
}
</script>
