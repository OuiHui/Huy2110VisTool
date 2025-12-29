import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, RouteLocationNormalized } from 'vue-router';

// Lazy pages
const Home = () => import('./pages/Home.vue');
const Lc3Tool = () => import('./projects/LC3/Lc3Tool.vue');
const Lc3CallingConvention = () => import('./projects/LC3/CallingConvention.vue');
const IeeeApp = () => import('./projects/IEEE/App.vue');
const KmapApp = () => import('./projects/Kmap/App.vue');

const routes: RouteRecordRaw[] = [
  { path: '/', component: Home, meta: { title: 'Home' } },
  { path: '/lc3', component: Lc3Tool, meta: { title: 'LC-3 Datapath' } },
  { path: '/calling-convention', component: Lc3CallingConvention, meta: { title: 'LC-3 Calling Convention' } },
  // Back-compat: old nested path
  { path: '/lc3/calling-convention', redirect: '/calling-convention' },
  { path: '/ieee', component: IeeeApp, meta: { title: 'IEEE' } },
  { path: '/kmap', component: KmapApp, meta: { title: 'Kmap' } },
  { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFound.vue'), meta: { title: 'Not Found' } }
];

// IMPORTANT: use Vite's configured base (import.meta.env.BASE_URL) so that when the app
// is served under a sub-path like /2110VisTool/ the root route '/' still resolves
// correctly instead of appearing as an unknown '/2110VisTool/' path and hitting 404.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() { return { top: 0 }; }
});

router.afterEach((to: RouteLocationNormalized) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} | 2110 Visualization Tool`;
  }
});

export default router;