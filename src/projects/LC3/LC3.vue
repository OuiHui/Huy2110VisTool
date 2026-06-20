<script setup lang="ts">
import Lc3SvgContent from './Lc3SvgContent.vue';

import { useTemplateRef, onMounted, nextTick, onUnmounted, ref } from 'vue';

    const top = useTemplateRef<HTMLDivElement>("top");
    const { topInset = 0 } = defineProps<{ topInset?: number }>();
    const svgEl = useTemplateRef<SVGSVGElement>('lc3Svg');
    const panZoomEl = useTemplateRef<HTMLDivElement>('panZoom');
    const scale = ref(1);
    const translateX = ref(0);
    const translateY = ref(0);
    const isPanning = ref(false);
    const baseWidth = ref(0);
    const baseHeight = ref(0);
    const minScale = 0.6;
    const maxScale = 2.5;
    defineExpose({
        /**
         * Activates the wire with the given ID, causing it to light up.
         * @param wireId ID of the wire to activate.
         */
        activateWire(wireId: string, cycle: number) {
                // Activate selected wire
            const wire = document.getElementById(wireId);
            if (wire) {
                wire.classList.remove(
                    ...Array.from(wire.classList.values())
                        .filter(cls => cls.startsWith("active-"))
                );
                wire.classList.add("active", `active-${cycle}`);
            } else {
                console.warn("Failed to activate missing wire:", wireId);
            }
        },
        /**
         * Deactivates the wire with the given ID, causing it to turn off.
         * @param wireId ID of the wire to activate.
         */
        deactivateWire(wireId: string) {
            const wire = document.getElementById(wireId);
            if (wire) {
                wire.classList.remove(
                    'active',
                    ...Array.from(wire.classList.values())
                        .filter(cls => cls.startsWith("active-"))
                );
            } else {
                console.warn("Failed to deactivate missing wire:", wireId);
            }
        },

        /**
         * Resets all wires, removing their light-up status.
         */
        resetWires() {
            document.querySelectorAll('.wire').forEach(wire => {
                wire.classList.remove('active');
            });
        },

        scrollIntoView() {
            top.value?.scrollIntoView();
        }
    })

    function syncBaseSize() {
        const svg = svgEl.value;
        if (!svg) return;
        const viewBox = svg.viewBox?.baseVal;
        if (viewBox && viewBox.width && viewBox.height) {
            baseWidth.value = viewBox.width;
            baseHeight.value = viewBox.height;
            return;
        }
        const rect = svg.getBoundingClientRect();
        baseWidth.value = rect.width;
        baseHeight.value = rect.height;
    }

    function clampTranslate(nextX: number, nextY: number) {
        const container = panZoomEl.value;
        if (!container || baseWidth.value === 0 || baseHeight.value === 0) {
            return { x: nextX, y: nextY };
        }
        const scaledWidth = baseWidth.value * scale.value;
        const scaledHeight = baseHeight.value * scale.value;
        const pad = 80;
        const padTop = pad + topInset;
        let minX, maxX;
        if (scaledWidth < container.clientWidth) {
            minX = -pad;
            maxX = container.clientWidth - scaledWidth + pad;
        } else {
            minX = container.clientWidth - scaledWidth - pad;
            maxX = pad;
        }
        nextX = Math.min(Math.max(nextX, minX), maxX);

        let minY, maxY;
        if (scaledHeight < container.clientHeight) {
            minY = -pad;
            maxY = container.clientHeight - scaledHeight + padTop;
        } else {
            minY = container.clientHeight - scaledHeight - pad;
            maxY = padTop;
        }
        nextY = Math.min(Math.max(nextY, minY), maxY);

        return { x: nextX, y: nextY };
    }

    function applyClampedTranslate(nextX: number, nextY: number) {
        const clamped = clampTranslate(nextX, nextY);
        translateX.value = clamped.x;
        translateY.value = clamped.y;
    }

    function resetPanZoom() {
        scale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        requestAnimationFrame(() => {
            syncBaseSize();
            applyClampedTranslate(translateX.value, translateY.value);
        });
    }

    function onWheel(event: WheelEvent) {
        event.preventDefault();
        const container = panZoomEl.value;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        const direction = event.deltaY > 0 ? -1 : 1;
        const zoomFactor = direction > 0 ? 1.12 : 0.89;
        const nextScale = Math.min(Math.max(scale.value * zoomFactor, minScale), maxScale);

        if (nextScale === scale.value) return;
        const localX = (cursorX - translateX.value) / scale.value;
        const localY = (cursorY - translateY.value) / scale.value;
        const nextX = cursorX - localX * nextScale;
        const nextY = cursorY - localY * nextScale;
        scale.value = nextScale;
        applyClampedTranslate(nextX, nextY);
    }

    let panStartX = 0;
    let panStartY = 0;
    let panOriginX = 0;
    let panOriginY = 0;

    function onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        const container = panZoomEl.value;
        if (!container) return;
        isPanning.value = true;
        panStartX = event.clientX;
        panStartY = event.clientY;
        panOriginX = translateX.value;
        panOriginY = translateY.value;
        container.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
        if (!isPanning.value) return;
        const deltaX = event.clientX - panStartX;
        const deltaY = event.clientY - panStartY;
        applyClampedTranslate(panOriginX + deltaX, panOriginY + deltaY);
    }

    function stopPan(event: PointerEvent) {
        if (!isPanning.value) return;
        isPanning.value = false;
        const container = panZoomEl.value;
        if (container) container.releasePointerCapture(event.pointerId);
    }

    function handleResize() {
        syncBaseSize();
        applyClampedTranslate(translateX.value, translateY.value);
    }

    onMounted(async () => {
        const attemptCrop = (tries = 0) => {
            const svg = svgEl.value;
            if (!svg) return;
            try {
                const bbox = svg.getBBox();
                if ((bbox.width === 0 || bbox.height === 0) && tries < 10) {
                    requestAnimationFrame(() => attemptCrop(tries + 1));
                    return;
                }
                // Use asymmetric padding so we trim tight on the right while keeping a tiny left gutter
                const padLeft = 2;   // minimal breathing room
                const padRight = 0;  // trim flush on the right per user request
                const padTop = 50;
                const padBottom = 0;
                const x = Math.floor(bbox.x - padLeft);
                const y = Math.floor(bbox.y - padTop);
                const w = Math.ceil(bbox.width + padLeft + padRight);
                const h = Math.ceil(bbox.height + padTop + padBottom);
                svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
                svg.removeAttribute('height'); // allow responsive height
                resetPanZoom();
            } catch (e) {
                if (tries < 10) requestAnimationFrame(() => attemptCrop(tries + 1));
            }
        };
        await nextTick();
        attemptCrop();
        window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', handleResize);
    });
</script>

<style scoped>
    .lc3-container {
        /* Default (light mode): draw wires dark so they show on light background */
        --lc3-wire-color: var(--p-surface-700, #444444);
    }

    @media (prefers-color-scheme: dark) {
        .lc3-container {
            /* Dark mode: draw wires light so they show on dark background */
            --lc3-wire-color: var(--p-surface-200, #dddddd);
        }
    }

    /* Only override wires that were authored as white. This avoids recoloring boxes/text that have their own colors. */
    .wire[stroke="white"],
    .wire[stroke="#fff"],
    .wire[stroke="#FFF"],
    .wire[stroke="#ffffff"],
    .wire[stroke="#FFFFFF"] {
        stroke: var(--lc3-wire-color);
    }

    .wire[fill="white"],
    .wire[fill="#fff"],
    .wire[fill="#FFF"],
    .wire[fill="#ffffff"],
    .wire[fill="#FFFFFF"] {
        fill: var(--lc3-wire-color);
    }

    .wire.active {
        fill: var(--p-surface-500, #888888);
        stroke: var(--p-surface-500, #888888);
        animation: wire-pulse 1s infinite;
    }
    .wire.active.active-0 { /* red-500 */
        fill: #ef4444; stroke: #ef4444;
    }
    .wire.active.active-1 { /* orange-500 */
        fill: #f97316; stroke: #f97316;
    }
    .wire.active.active-2 { /* yellow-500 */
        fill: #eab308; stroke: #eab308;
    }
    .wire.active.active-3 { /* green-500 */
        fill: #22c55e; stroke: #22c55e;
    }
    .wire.active.active-4 { /* blue-500 */
        fill: #3b82f6; stroke: #3b82f6;
    }
    .wire.active.active-5 { /* purple-500 */
        fill: #a855f7; stroke: #a855f7;
    }
    .wire.active.active-6 { /* pink-500 */
        fill: #ec4899; stroke: #ec4899;
    }
/*
    @keyframes wire-pulse {
        0% { stroke-opacity: 1; }
        50% { stroke-opacity: 0.5; }
        100% { stroke-opacity: 1; }
    }
        */
    .lc3-container {
        padding: 0;
        line-height: 0;
        display: flex;
        align-items: stretch;
        justify-content: stretch;
        flex: 1;
        min-height: 0;
        width: 100%;
        height: 100%;
    }
    .lc3-panzoom {
        width: 100%;
        height: 100%;
        overflow: hidden;
        touch-action: none;
        cursor: grab;
    }
    .lc3-panzoom.is-panning {
        cursor: grabbing;
    }
    .lc3-svg { display:block; width:100%; height:100%; transform-origin: 0 0; }
</style>

<template>
    <div ref="top" class="bg-surface-0 dark:bg-surface-950 lc3-container">
        <div
            ref="panZoom"
            class="lc3-panzoom"
            :class="{ 'is-panning': isPanning }"
            @wheel="onWheel"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="stopPan"
            @pointerleave="stopPan"
        >
            <svg
                ref="lc3Svg"
                class="lc3-svg"
                :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }"
                width="100%"
                viewBox="0 0 1650 1671"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
            <Lc3SvgContent />
            </svg>
        </div>
    </div>
</template>