/* Decorative AI-assisted paintings; borders, anchors and labels remain vector geography. */
window.PaperAtlas = {
  defs(prefix) { return `<defs>
    <symbol id="${prefix}-compass" viewBox="0 0 70 90"><circle cx="35" cy="48" r="25" fill="none" stroke="#9b8966" stroke-width=".7"/><path d="M35 19 42 48 35 77 28 48Z" fill="#728879" stroke="#647566" stroke-width="1"/><path d="m35 23 0 25 7 0Z" fill="#eadbb9"/><path d="M8 48h54M35 13v8m0 54v8" stroke="#9b8966" stroke-width=".7"/><text x="35" y="9" text-anchor="middle" fill="#716c54" font-size="10">N</text></symbol>
  </defs>`; },
  destinationEmblem(kind) {
    const landscape=kind==='lijiang'
      ? '<path class="destination-pigment" d="M-15 11-4-11 2-2 8-14 17 11Z"/><path class="destination-ink" d="M-15 11-4-11 2-2 8-14 17 11M-8-3-4-1-1-5M4-6 8-3 11-7M-12 14h25"/>'
      : '<path class="destination-pigment" d="M-16 4-7-8 0 0 7-9 16 4Z"/><path class="destination-ink" d="M-16 4-7-8 0 0 7-9 16 4M-14 9q4-3 9 0t9 0t9 0M-11 14q4-3 9 0t10 0"/><circle class="destination-sun" cx="-10" cy="-12" r="2"/>';
    return `<g class="destination-emblem" aria-hidden="true" pointer-events="none"><circle class="destination-badge-back" r="24"/><circle class="destination-badge-ring" r="20.5"/>${landscape}</g>`;
  },
  art(prefix,kind,x,y,w=100,h=65) {
    if(kind==='compass') return `<use href="#${prefix}-compass" x="${x}" y="${y}" width="${w}" height="${h}" aria-hidden="true" pointer-events="none"/>`;
    const file={mountain:'mountain',town:'village',forest:'forest',woodland:'woodland',water:'lake',indigo:'indigo',pottery:'pottery'}[kind];
    if(!file)return '';
    return `<image class="atlas-painting" href="assets/atlas-art/${file}.webp" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" pointer-events="none"/>`;
  }
};
