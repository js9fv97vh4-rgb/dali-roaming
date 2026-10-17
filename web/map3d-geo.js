// Shared geographic math. Units are kilometres, east = +X, north = -Z.
export const ORIGIN = [100.18, 25.78];
export const X_SCALE = 111.32 * Math.cos(ORIGIN[1] * Math.PI / 180);
export const RELIEF = 2.8;
export function project([longitude, latitude]) {
  return [(longitude - ORIGIN[0]) * X_SCALE, -(latitude - ORIGIN[1]) * 111.32];
}
export function unproject([x, z]) {
  return [ORIGIN[0] + x / X_SCALE, ORIGIN[1] - z / 111.32];
}
export function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i], [c, d] = ring[j];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
  }
  return inside;
}
export function elevation(dem, [longitude, latitude]) {
  const [west, south, east, north] = dem.bounds;
  const x = Math.max(0, Math.min(dem.columns - 1, (longitude - west) / (east - west) * (dem.columns - 1)));
  const y = Math.max(0, Math.min(dem.rows - 1, (north - latitude) / (north - south) * (dem.rows - 1)));
  const a = Math.min(Math.floor(x), dem.columns - 2), b = Math.min(Math.floor(y), dem.rows - 2);
  const fx = x - a, fy = y - b, n = b * dem.columns + a;
  return (dem.heights[n] * (1-fx) + dem.heights[n+1] * fx) * (1-fy)
    + (dem.heights[n+dem.columns] * (1-fx) + dem.heights[n+dem.columns+1] * fx) * fy;
}
export function reliefHeight(dem, coords) { return (elevation(dem, coords) - dem.lakeLevel) / 1000 * RELIEF; }
export function lampPositions(ring, count = 100) {
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  const left = Math.min(...xs), bottom = Math.min(...ys), width = Math.max(...xs)-left, height = Math.max(...ys)-bottom;
  let seed = 240315;
  const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  const points = [];
  for (let i = 0; points.length < count && i < count * 100; i++) {
    const p = [left + random()*width, bottom + random()*height];
    if (inRing(p, ring) && [[.0006,0],[-.0006,0],[0,.0006],[0,-.0006]].every(([x,y]) => inRing([p[0]+x,p[1]+y], ring))) points.push(p);
  }
  return points;
}

// A lake-facing camera keeps both shores in context; independent of stop index.
export function tourCamera(from,to,progress,aspect=1,reduced=false) {
  const t=Math.min(1,Math.max(0,progress)/.27),ease=reduced?1:t*t*(3-2*t);
  const at=from.map((v,i)=>v+(to[i]-v)*ease), [x,z]=project(at);
  const lake=project([100.19,25.80]);
  // Look from the lake towards each coast. Blend smoothly across lake crossings.
  const coast=Math.tanh((100.18-at[0])*28);
  const angle=.22+coast*.88+(reduced?0:Math.sin(progress*Math.PI)*.08);
  const scale=Math.min(1,1.5/Math.max(1,aspect)),distance=16*scale;
  return {at,target:[x*.85+lake[0]*.15,z*.85+lake[1]*.15],offset:[Math.sin(angle)*distance,19*scale,Math.cos(angle)*distance]};
}
