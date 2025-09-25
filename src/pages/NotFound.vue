<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
	<div class="p-8 text-center flex flex-col gap-4 items-center">
		<h1 class="text-3xl font-bold">Page Not Found</h1>
		<Button @click="router.push('/')">Return Home</Button>
	</div>
</template>
