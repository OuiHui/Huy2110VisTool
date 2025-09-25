import { createApp } from 'vue';
import router from './router';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import './style.css';
import { definePreset } from '@primevue/themes';
import type { PrimeVueConfiguration } from 'primevue';

createApp(App)
    .use(router)
    .use(PrimeVue, {
        theme: {
            preset: definePreset(Aura, {
                semantic: {
                    colorScheme: {
                        light: {
                            primary: {
                                0: '{blue.0}',
                                50: '{blue.50}',
                                100: '{blue.100}',
                                200: '{blue.200}',
                                300: '{blue.300}',
                                400: '{blue.400}',
                                500: '{blue.500}',
                                600: '{blue.600}',
                                700: '{blue.700}',
                                800: '{blue.800}',
                                900: '{blue.900}',
                                950: '{blue.950}'
                            },
                            surface: {
                                0: '{stone.0}',
                                50: '{stone.50}',
                                100: '{stone.100}',
                                200: '{stone.200}',
                                300: '{stone.300}',
                                400: '{stone.400}',
                                500: '{stone.500}',
                                600: '{stone.600}',
                                700: '{stone.700}',
                                800: '{stone.800}',
                                900: '{stone.900}',
                                950: '{stone.950}'
                            },
                            content: {
                                background: '{surface.0}',
                                borderColor: '{surface.300}'
                            }
                        },
                        dark: {
                            primary: {
                                0: '{blue.0}',
                                50: '{blue.50}',
                                100: '{blue.100}',
                                200: '{blue.200}',
                                300: '{blue.300}',
                                400: '{blue.400}',
                                500: '{blue.500}',
                                600: '{blue.600}',
                                700: '{blue.700}',
                                800: '{blue.800}',
                                900: '{blue.900}',
                                950: '{blue.950}'
                            },
                            surface: {
                                0: '{stone.0}',
                                50: '{stone.50}',
                                100: '{stone.100}',
                                200: '{stone.200}',
                                300: '{stone.300}',
                                400: '{stone.400}',
                                500: '{stone.500}',
                                600: '{stone.600}',
                                700: '{stone.700}',
                                800: '{stone.800}',
                                900: '{stone.900}',
                                950: '{stone.950}'
                            },
                            content: {
                                background: '{surface.900}'
                            }
                        }
                    },
                    navigation: {
                        item: {
                            padding: "0.5rem 0.5rem"
                        }
                    }
                },
                components: {
                    divider: {
                        vertical: {
                            margin: "0 0.1rem"
                        },
                        horizontal: {
                            margin: "0.1rem 0"
                        },
                    },
                    menubar: {
                        colorScheme: {
                            light: {
                                item: {
                                    focusBackground: '{surface.50}'
                                }
                            },
                            dark: {
                                item: {
                                    focusBackground: '{surface.700}'
                                }
                            }
                        }
                    },
                    card: {
                        colorScheme: {
                            light: {
                                root: {
                                    background: '{surface.200}',
                                }
                            },
                            dark: {
                                root: {
                                    background: '{surface.800}',
                                }
                            }
                        }
                    }
                }
            }),
            options: {
                cssLayer: {
                    name: 'primevue',
                    order: 'theme, base, primevue'
                }
            }
        },
    } satisfies PrimeVueConfiguration)
    .mount("#app");