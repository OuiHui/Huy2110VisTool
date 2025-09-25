# 2110 LC-3 Datapath Visualizer

This interactive visualizer was created for educational purposes for demonstrating how the LC3 instructions can be traced during their "Execute Phase". 
Currently, the clock cycles are differentiated by color and a very simple bar allows you to select the instruction to run. The "Fetch" and "Decode" macrostates are also included,
 while the AND and RTI instruction is currently not implemented.<br />

Additional features of the visualizer are currently in the works (as well as other planned visualizers for 2110)


## Description

Every component making up the LC3 is an SVG (Scalable Vector Graphic) that was converted through Figma: https://www.figma.com/design/n7pDo1cotmBlgZB02SF8K8/2110-Vis-Tool?node-id=0-1&t=2E0biyAyEhnxR92p-1 <br />
The components (arrows, text, shapes, etc.) were given a unique id within HTML and grouped accordingly in 'LC3.vue'. A CSS state called "wire" was created (originally intended for the wires hence the name)
that would allow the component to flash a color. The pulse animation can be also be found in the same file above the SVG. <br />

In the 'sequences.json' file, each instruction has a sequence that maps to an array of arrays (seperated by clock cycle) that hold the sequence of components that become highlighted when run.
Refactoring using Vue.js and Tailwind was done by Henry Bui: Vue components can be found in 'components.d.ts' 


## Running the Visualization Tool

Currently, the visualization tool is hosted online using GitHub Pages. Run it here:<br /> https://gt-cs2110.github.io/2110VisTool/ 

To run locally, run the following in the terminal: <br />
npm install --dev <br />
npm run dev

## Authors

Huy Nguyen - hnguyen499@gatech.edu <br />
Henry Bui - hbui43@gatech.edu


## License

This project is licensed under the MIT License - see the LICENSE.md file for details

