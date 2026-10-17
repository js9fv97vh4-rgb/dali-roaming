"""Download a bounded OSM snapshot; derived JSON remains ODbL 1.0."""
from pathlib import Path
import urllib.request,concurrent.futures,xml.etree.ElementTree as ET,json
root=Path(__file__).resolve().parents[1];cache=Path('/tmp/dali-enrich');cache.mkdir(exist_ok=True)
regions={'south-west':[100.17,25.625,100.21,25.655],'longkan':[100.185,25.665,100.215,25.705],'town':[100.15,25.685,100.175,25.71],'xizhou':[100.12,25.84,100.15,25.87],'shuanglang':[100.18,25.90,100.21,25.93],'caicun':[100.18,25.70,100.20,25.73],'panxi':[100.15,25.75,100.17,25.78],'panxi-shore':[100.14,25.765,100.155,25.782],'zhoucheng':[100.095,25.89,100.12,25.91],'wase':[100.21,25.81,100.24,25.85]}
def fetch(item):
 name,b=item;p=cache/(name+'.xml');url='https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str,b))
 if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=45).read())
 print(name,p.stat().st_size,flush=True);return p
paths=list(concurrent.futures.ThreadPoolExecutor(max_workers=3).map(fetch,regions.items()))
nodes={};ways={}
for path in paths:
 e=ET.fromstring(path.read_bytes())
 for n in e.findall('node'):nodes[n.attrib['id']]=[float(n.attrib['lon']),float(n.attrib['lat'])]
 for w in e.findall('way'):ways[w.attrib['id']]=w
roads=[];buildings=[];islands=[];landcover=[]
for id,w in ways.items():
 tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')};coords=[nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes]
 if not coords:continue
 if tags.get('highway') in ['primary','secondary','tertiary','residential','pedestrian','cycleway','footway','path','unclassified']:
  roads.append(dict(id=id,kind=tags['highway'],name=tags.get('name',''),coords=coords))
 if len(coords)>=4 and coords[0]==coords[-1]:
  if tags.get('place') in ['islet','island']:islands.append(dict(id=id,name=tags.get('name','湖中岛屿'),coords=coords))
  if tags.get('landuse') in ['farmland','orchard','forest','meadow']:landcover.append(dict(id=id,kind=tags['landuse'],coords=coords))
 if tags.get('building') and coords[0]==coords[-1]:
  try:levels=float(tags.get('building:levels',2))
  except:levels=2
  buildings.append(dict(id=id,levels=levels,coords=coords))
 if tags.get('name') in ['南门','五华楼','小普陀','南诏风情岛']:print(tags,coords[0])
data=dict(source='© OpenStreetMap contributors',license='ODbL 1.0',sourceUrl='https://www.openstreetmap.org/copyright',snapshotDate='2026-10-17',bounds=list(regions.values()),roads=roads,buildings=buildings,islands=islands,landcover=landcover)
(root/'web/terrain/erhai-details.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('roads',len(roads),'buildings',len(buildings),flush=True)
