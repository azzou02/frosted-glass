import { initRain } from './rain.js';
import { initMask } from './mask.js';

// A cool-blue static background image (rainy city dusk). Swap the URL below
// for your own asset in /public and set it to e.g. '/hero.jpg'.
const BG_IMAGE =
  'https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&w=2400&q=80';

const hero = document.getElementById('hero');
const bgSharp = document.getElementById('bg-sharp');
const bgFrost = document.getElementById('bg-frost');
const frostLayer = document.getElementById('frost-layer');
const rainCanvas = document.getElementById('rain');

// Apply the same image to both the sharp and frosted layers.
bgSharp.style.backgroundImage = `url("${BG_IMAGE}")`;
bgFrost.style.backgroundImage = `url("${BG_IMAGE}")`;

// Preload so the frosted layer doesn't flash empty.
const img = new Image();
img.src = BG_IMAGE;

initRain(rainCanvas);
initMask(frostLayer, hero);
