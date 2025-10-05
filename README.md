# CS 2110 Visualization Tool

An interactive educational platform featuring multiple visualization tools for computer organization and programming concepts.

Test it out: [https://ouihui.github.io/Huy2110VisTool/](https://ouihui.github.io/Huy2110VisTool/)

## Features

### LC-3 Datapath Visualizer
- **Interactive datapath tracing**: Step through fetch, decode, and execute cycles 
- **Instruction sequences**: Visualize how different LC-3 instructions move through the processor with different colors for every clock cycle
- **Pseudocode integration**: View corresponding pseudocode alongside datapath execution

### IEEE 754 Floating Point Converter
- **Binary representation**: Visualize how floating point numbers are stored
- **Interactive conversion**: Convert between decimal and IEEE 754 format
- **Component breakdown**: See sign bit, exponent, and mantissa separately
- **Educational explanations**: Understand the mathematics behind floating point representation

### Boolean Logic & K-Map Visualizer
- **Truth table generation**: Create truth tables from logical expressions
- **Karnaugh map visualization**: See how Boolean expressions map to K-maps
- **Logic simplification**: Visualize the process of minimizing Boolean expressions

## Technology Stack

- **Frontend Framework**: Vue 3 with TypeScript
- **Styling**: Tailwind CSS + PrimeVue UI components
- **Build Tool**: Vite
- **Graphics**: SVG-based visualizations for scalable diagrams
- **Animations**: CSS animations with Vue transitions

## Getting Started
### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/OuiHui/Huy2110VisTool.git
   cd 2110VisTool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```


## Project Structure

```
src/
├── components/          # Reusable Vue components
│   ├── LC3.vue         # LC-3 datapath SVG component
│   └── SiteNav.vue     # Navigation component
├── pages/              # Page components
│   ├── Home.vue        # Landing page with project cards
│   └── NotFound.vue    # 404 error page
├── projects/           # Individual visualization tools
│   ├── LC3/           # LC-3 datapath visualizer
│   ├── IEEE/          # IEEE 754 floating point tool
│   └── Kmap/          # K-map and Boolean logic tool
└── router.ts          # Vue Router configuration
```


## Educational Use

This tool is designed specifically for **CS 2110: Computer Organization and Programming** at Georgia Tech. It serves as a supplementary learning resource to help students visualize and understand:

- Processor datapath operation
- Floating point number representation
- Boolean algebra and digital logic design
- Computer architecture fundamentals

## Authors

- **Huy Nguyen** - *Original Creator & Designer* - hnguyen499@gatech.edu
- **Henry Bui** - *Vue.js Refactoring & Development* - hbui43@gatech.edu
- **GT CS 2110 TA Team** - *Maintenance & Updates*


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---



