<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
// Static nav model (keep light; could be derived from router if needed)
const links = [
  { to: '/', label: 'Home' },
  { to: '/ieee', label: 'IEEE 754' },
  { to: '/kmap', label: 'K-Map' },
  { to: '/lc3', label: 'LC-3' },
];
</script>

<template>
  <nav class="site-nav" aria-label="Main navigation">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="nav-inner">
      <RouterLink to="/" class="brand" aria-label="Home">
        <span class="logo">2110</span>
        <span class="brand-text">Vis Tool</span>
      </RouterLink>
      <ul class="nav-links" role="list">
        <li v-for="l in links" :key="l.to">
          <RouterLink :to="l.to" :class="['nav-link', { active: route.path === l.to }]">{{ l.label }}</RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.site-nav { position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: linear-gradient(90deg, rgba(0,48,87,0.88), rgba(0,30,54,0.88)); border-bottom: 1px solid rgba(255,255,255,0.08); }
.nav-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; gap: 2rem; padding: 0.65rem 1.15rem; }
.brand { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; letter-spacing: .5px; text-decoration: none; color: #fff; font-size: 1rem; }
.logo { background: #B3A369; color: #00243f; padding: 0.25rem .55rem; border-radius: .5rem; font-weight: 700; font-size: .8rem; letter-spacing: .5px; }
.brand-text { display: none; }
@media (min-width: 480px) { .brand-text { display: inline; } }
.nav-links { display: flex; gap: .35rem; margin: 0; padding: 0; flex-wrap: wrap; }
.nav-link { position: relative; display: inline-flex; align-items: center; text-decoration: none; padding: .55rem .85rem; font-size: .75rem; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: #c7d8e4; border-radius: .6rem; transition: background .25s, color .25s; }
.nav-link:hover { background: rgba(255,255,255,0.08); color: #fff; }
.nav-link.active { background: #B3A369; color: #00243f; }
.nav-link.active:hover { background: #d2c48c; }
.skip-link { position: absolute; left: -999px; top: -999px; padding: .75rem 1rem; background: #fff; color: #00243f; border-radius: .5rem; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
.skip-link:focus { left: 0.75rem; top: 0.75rem; z-index: 200; }
</style>
