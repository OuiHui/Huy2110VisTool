<script setup lang="ts">
import { computed } from 'vue';
import FeedbackForm from '../components/FeedbackForm.vue';

const projects = [
  { path: '/ieee', title: 'IEEE 754 Floating Point', desc: 'Visualize the mathematics and representation of floating point conversion' },
  { path: '/kmap', title: 'Boolean Logic & K-Maps', desc: 'Visualize different logical expressions and their simplifications using Karnaugh maps.' },
  { path: '/lc3', title: 'LC-3 Datapath', desc: 'Step through the fetch / decode / execute cycles and see control & data flow.' },
  { path: '/calling-convention', title: 'Calling Convention', desc: 'Visualize stack frames: arguments, saved R7/R5, locals, return value slot, and cleanup.' },
];

const filtered = computed(() => projects);
</script>

<template>
  <div class="home-root">
    <section class="gt-hero">
      <div class="inner">
        <div class="flex gap-2 items-center justify-center mb-4">
          <h1 class="main-title">CS 2110 Computer Organization and Programming Visualization Tool</h1>
        </div>
        <div class="accent-bar" aria-hidden="true"></div>
      </div>
    </section>

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

    <!-- Feedback Modal & Floating Trigger -->
    <FeedbackForm />

  </div>
</template>

<style scoped>
/* Layout wrappers */
.home-root {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding-bottom: 4rem;
  height: calc(100dvh - 56px);
  overflow-y: auto;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(179, 163, 105, 0.35) rgba(0, 26, 51, 0.5);
}

.home-root::-webkit-scrollbar {
  width: 8px;
}

.home-root::-webkit-scrollbar-thumb {
  background: rgba(179, 163, 105, 0.35);
  border-radius: 4px;
}

.home-root::-webkit-scrollbar-thumb:hover {
  background: rgba(179, 163, 105, 0.55);
}

.home-root::-webkit-scrollbar-track {
  background: rgba(0, 26, 51, 0.5);
}

/* Hero */
.gt-hero {
  background: linear-gradient(140deg, #003057 0%, #00243f 55%, #001729 100%);
  color: #fff;
  padding: 3rem 1.25rem 2.25rem;
  position: relative;
}
.gt-hero::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 75% 35%, rgba(255,255,255,0.08), transparent 70%); pointer-events: none; }
.gt-hero .inner { max-width: 1080px; margin: 0 auto; position: relative; z-index: 1; text-align: center; }
.gt-hero h1.main-title { font-size: clamp(1.4rem, 2.4vw, 2.2rem); line-height: 1.1; margin: 0; font-weight: 700; letter-spacing: 0.3px; white-space: normal; position: relative; }
.gt-hero .accent-bar { width: 150px; height: 6px; background: linear-gradient(90deg, #B3A369, #d2c48c); border-radius: 999px; margin: 0 auto 1.25rem; box-shadow: 0 0 0 3px rgba(255,255,255,0.08); position: relative; }

/* Projects section */
.projects-section { padding: 0 1.25rem; max-width: 1300px; margin: 0 auto; width: 100%; box-sizing: border-box; }
.projects-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;
  padding: 0.25rem 0 0.75rem;
}

/* Card */
.project-card { position: relative; text-decoration: none; border-radius: 1rem; background: #ffffff; color: #00243f; border: 1px solid #d9dfe3; box-shadow: 0 2px 4px rgba(0,0,0,0.06); overflow: hidden; transition: box-shadow 0.3s, border-color 0.3s; display: flex; width: 100%; }
.project-card:focus-visible { outline: 3px solid #B3A369; outline-offset: 3px; }
.project-card::before { content: ""; position: absolute; inset: 0; background: linear-gradient(125deg, rgba(179,163,105,0.12), rgba(255,255,255,0)); opacity: 0; transition: opacity 0.35s; }
.project-card:hover::before { opacity: 1; }
.project-card:hover { box-shadow: 0 4px 14px -2px rgba(0,0,0,0.18), 0 2px 6px -1px rgba(0,0,0,0.12); border-color: #c9d2d8; }
.card-body { padding: 1.2rem 1.1rem 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; width: 100%; }
.card-title { font-size: 1rem; font-weight: 600; line-height: 1.25; letter-spacing: 0.2px; }
.card-desc { font-size: 0.82rem; line-height: 1.35; flex: 1; color: #30414f; }
.open-btn { align-self: flex-start; background: #003057; color: #fff; font-size: 0.7rem; letter-spacing: 0.5px; padding: 0.4rem 0.65rem 0.38rem; border-radius: 0.5rem; font-weight: 600; transition: background 0.3s, transform 0.3s; margin-top: auto; }
.project-card:hover .open-btn { background: #00223c; }
.project-card:active .open-btn { transform: translateY(1px); }

/* Responsive adjustments */
@media (max-width: 1080px) {
  .projects-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 600px) {
  .home-root { gap: 1.75rem; }
  .gt-hero { padding: 2rem 0.75rem 1.5rem; }
  .gt-hero h1.main-title { font-size: 1.15rem; line-height: 1.25; }
  .gt-hero .accent-bar { width: 80px; margin: 0 auto 0.75rem; height: 4px; }
  .projects-section { padding: 0 0.75rem; }
  .projects-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 0;
  }
  .card-body { padding: 0.95rem; gap: 0.4rem; }
  .card-title { font-size: 0.95rem; }
  .card-desc { font-size: 0.8rem; }
}

/* Empty state */
.empty { grid-column: 1 / -1; text-align: center; padding: 2rem 0 1rem; font-size: 0.95rem; color: #4b5c68; }

/* Dark mode tweak (if user system dark, keep hero; adjust cards) */
@media (prefers-color-scheme: dark) {
  .project-card { background: #0f1f28; border-color: #1f2f3a; color: #d9e2e8; }
  .card-desc { color: #b0c1cc; }
}
</style>
