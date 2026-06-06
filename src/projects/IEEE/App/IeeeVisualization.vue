<template>
  <div class="visualization" v-html="html"></div>
</template>

<script setup>
defineProps({ html: { type: String, default: '' } })
</script>
