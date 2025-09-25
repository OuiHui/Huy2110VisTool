<script setup lang="ts">
// Clean root shell. Home and project routes render inside <router-view />.
</script>

<template>
  <SiteNav />
  <main id="main" class="app-main">
    <router-view />
  </main>
</template>

<style scoped>
/* Shell layout */
:host { display:block; min-height:100%; }
.app-main { min-height: calc(100dvh - 56px); }
</style>

<style>
/* Global utility (not scoped) */
html, body, #app { height: 100%; }
</style>
