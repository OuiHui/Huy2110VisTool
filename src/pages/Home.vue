<script setup lang="ts">
import { computed, ref } from 'vue';
const projects = [
  { path: '/ieee', title: 'IEEE 754 Floating Point', desc: 'Visualize the mathematics and representation of floating point conversion' },
  { path: '/kmap', title: 'Boolean Logic & K-Maps', desc: 'Visualize different logical expressions and their simplifications using Karnaugh maps.' },
   { path: '/lc3', title: 'LC-3 Datapath', desc: 'Step through the fetch / decode / execute cycles and see control & data flow.' },
];

const filtered = computed(() => projects);
const infoDialogVisible = ref(false);
</script>

<template>
  <div class="home-root">
    <!-- Hero -->
    <section class="gt-hero">
      <div class="inner">
        <div class="flex gap-2 items-center justify-center mb-4">
          <h1 class="main-title">CS 2110 Computer Organization and Programming Visualization Tool</h1>
        </div>
        <div class="accent-bar" aria-hidden="true"></div>
        <div class="flex items-center justify-center">
          <button @click="infoDialogVisible = true" class="info-btn" aria-label="About">
              About
          </button>
        </div>
      </div>
    </section>

    <!-- About Dialog -->
    <Dialog v-model:visible="infoDialogVisible" modal dismissableMask header="About">
      This visualization tool is an interactive guide on how to trace computer organization concepts including the LC-3 datapath, IEEE 754 floating point representation, and Boolean logic with K-Maps. Designed by Huy Nguyen & Henry Bui
    </Dialog>

    <!-- Project Cards -->
    <section class="projects-section">
      <div class="projects-row">
        <RouterLink
          v-for="p in filtered"
          :key="p.path"
          :to="p.path"
          class="project-card"
        >
          <div class="card-body">
            <h3 class="card-title">{{ p.title }}</h3>
            <p class="card-desc">{{ p.desc }}</p>
            <span class="open-btn" aria-hidden="true">Open →</span>
          </div>
        </RouterLink>
        <p v-if="!filtered.length" class="empty">No matches – try a different term.</p>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* Layout wrappers */
.home-root { display: flex; flex-direction: column; gap: 3.5rem; padding-bottom: 4rem; }

/* Hero */
.gt-hero { background: linear-gradient(140deg, #003057 0%, #00243f 55%, #001729 100%); color: #fff; padding: 4.5rem 1.25rem 3.5rem; position: relative; /* overflow removed to prevent card hover clipping */ }
.gt-hero::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 75% 35%, rgba(255,255,255,0.08), transparent 70%); pointer-events: none; }
.gt-hero .inner { max-width: 1080px; margin: 0 auto; position: relative; z-index: 1; }
.gt-hero h1.main-title { font-size: clamp(1.6rem, 2.6vw, 2.4rem); line-height: 1.05; margin: 0; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; position: relative; }
.gt-hero .info-btn { 
  color: rgba(255,255,255,0.8); 
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
  backdrop-filter: blur(4px);
}
.gt-hero .info-btn:hover { 
  color: #B3A369; 
  background: rgba(179,163,105,0.15);
  border-color: rgba(179,163,105,0.3);
}
.gt-hero .accent-bar { width: 150px; height: 6px; background: linear-gradient(90deg, #B3A369, #d2c48c); border-radius: 999px; margin: 0 auto 1.25rem; box-shadow: 0 0 0 3px rgba(255,255,255,0.08); position: relative; }
.gt-hero .tagline { max-width: 760px; font-size: clamp(1.05rem, 2vw, 1.25rem); opacity: 0.92; margin: 0 0 1.75rem; }

/* Search */
.search-wrap { display: flex; }
.search { width: min(420px, 100%); background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.35); color: #fff; padding: 0.75rem 1rem; border-radius: 0.75rem; font-size: 0.95rem; backdrop-filter: blur(4px); transition: background 0.25s, border-color 0.25s; }
.search::placeholder { color: rgba(255,255,255,0.65); }
.search:focus { outline: none; background: rgba(255,255,255,0.18); border-color: #B3A369; box-shadow: 0 0 0 3px rgba(179,163,105,0.35); }

/* Projects section */
.projects-section { padding: 0 1.25rem; max-width: 1300px; margin: 0 auto; }
.projects-row { display: flex; flex-wrap: nowrap; gap: 1.4rem; overflow-x: auto; overflow-y: visible; padding: 0.25rem 0 0.75rem; }
.projects-row::-webkit-scrollbar { height: 10px; }
.projects-row::-webkit-scrollbar-track { background: #e6e9ec; border-radius: 20px; }
.projects-row::-webkit-scrollbar-thumb { background: #b3a369; border-radius: 20px; }
.projects-row::-webkit-scrollbar-thumb:hover { background: #9c8f57; }

/* Card */
.project-card { position: relative; text-decoration: none; border-radius: 1rem; background: #ffffff; color: #00243f; border: 1px solid #d9dfe3; box-shadow: 0 2px 4px rgba(0,0,0,0.06); overflow: hidden; transition: box-shadow 0.3s, border-color 0.3s; display: flex; flex: 0 0 300px; max-width: 300px; }
.project-card:focus-visible { outline: 3px solid #B3A369; outline-offset: 3px; }
.project-card::before { content: ""; position: absolute; inset: 0; background: linear-gradient(125deg, rgba(179,163,105,0.12), rgba(255,255,255,0)); opacity: 0; transition: opacity 0.35s; }
.project-card:hover::before { opacity: 1; }
.project-card:hover { box-shadow: 0 4px 14px -2px rgba(0,0,0,0.18), 0 2px 6px -1px rgba(0,0,0,0.12); border-color: #c9d2d8; }
.card-body { padding: 1.3rem 1.25rem 1.4rem; display: flex; flex-direction: column; gap: 0.65rem; }
.card-title { font-size: 1.05rem; font-weight: 600; line-height: 1.2; letter-spacing: 0.3px; }
.card-desc { font-size: 0.85rem; line-height: 1.35; flex: 1; color: #30414f; }
.open-btn { align-self: flex-start; background: #003057; color: #fff; font-size: 0.7rem; letter-spacing: 0.5px; padding: 0.4rem 0.65rem 0.38rem; border-radius: 0.5rem; font-weight: 600; transition: background 0.3s, transform 0.3s; }
.project-card:hover .open-btn { background: #00223c; }
.project-card:active .open-btn { transform: translateY(1px); }

/* Empty state */
.empty { grid-column: 1 / -1; text-align: center; padding: 2rem 0 1rem; font-size: 0.95rem; color: #4b5c68; }

/* Removed support blurb */

@media (max-width: 640px) {
  .gt-hero { padding: 3.5rem 1rem 2.75rem; }
  .card-body { padding: 1.05rem 1rem 1.1rem; }
  .gt-hero .tagline { font-size: 1rem; }
}

/* Dark mode tweak (if user system dark, keep hero; adjust cards) */
@media (prefers-color-scheme: dark) {
  .project-card { background: #0f1f28; border-color: #1f2f3a; color: #d9e2e8; }
  .card-desc { color: #b0c1cc; }
  .blurb { background: linear-gradient(90deg, #14242d, #162c37); border-color: #243842; color: #c7d3da; }
  .blurb strong { color: #B3A369; }
}
</style>
