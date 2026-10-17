# Derive the attributed Yunnan subset; run from the repository root.
import json,math,sys
from pathlib import Path
if len(sys.argv)!=2: raise SystemExit('Usage: python3 scripts/prepare-prefectures.py /path/to/geoBoundaries-3_0_0-CHN-ADM2.topojson')
raw=json.load(open(sys.argv[1]))
items=[('kunming','昆明市','昆明','530100','Kunming'),('qujing','曲靖市','曲靖','530300','Qujing'),('yuxi','玉溪市','玉溪','530400','Yuxi'),('baoshan','保山市','保山','530500','Baoshan'),('zhaotong','昭通市','昭通','530600','Zhaotong'),('lijiang','丽江市','丽江','530700','Lijiang City'),('puer','普洱市','普洱','530800',"Pu'er City"),('lincang','临沧市','临沧','530900','Lincang'),('chuxiong','楚雄彝族自治州','楚雄州','532300','Chuxiong Yi Autonomous Prefecture'),('honghe','红河哈尼族彝族自治州','红河州','532500','Honghe Hani and Yi Autonomous Prefecture'),('wenshan','文山壮族苗族自治州','文山州','532600','Wenshan Zhuang and Miao Autonomous Prefecture'),('xishuangbanna','西双版纳傣族自治州','西双版纳','532800','Xishuangbanna Dai Autonomous Prefecture'),('dali','大理白族自治州','大理州','532900','Dali'),('dehong','德宏傣族景颇族自治州','德宏州','533100','Dehong Dai and Jingpo Autonomous Prefecture'),('nujiang','怒江傈僳族自治州','怒江州','533300','Nujiang Lisu Autonomous Prefecture'),('diqing','迪庆藏族自治州','迪庆州','533400','Dêqên Tibetan Autonomous Prefecture')]
scale=raw['transform']['scale'];trans=raw['transform']['translate'];cache={}
def d2(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))) if dx or dy else 0
 return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2
def simplify(ps,tol=.009):
 if len(ps)<3:return ps
 idx,maxd=max(enumerate((d2(p,ps[0],ps[-1]) for p in ps[1:-1]),1),key=lambda x:x[1])
 if maxd<=tol*tol:return [ps[0],ps[-1]]
 return simplify(ps[:idx+1],tol)[:-1]+simplify(ps[idx:],tol)
def arc(i):
 key=i if i>=0 else ~i
 if key not in cache:
  x=y=0;ps=[]
  for a,b in raw['arcs'][key]:x+=a;y+=b;ps.append([x*scale[0]+trans[0],y*scale[1]+trans[1]])
  cache[key]=simplify(ps)
 return cache[key] if i>=0 else list(reversed(cache[key]))
def ring(ids):
 out=[]
 for i in ids:
  ps=arc(i)
  if out and out[-1]!=ps[0]:raise ValueError('Disconnected topology')
  out.extend(ps[1:] if out else ps)
 assert out[0]==out[-1]
 return [[round(x,5),round(y,5)] for x,y in out]
def inside(p,ps):
 hit=False;x,y=p
 for a,b in zip(ps,ps[1:]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit
def representative(ps):
 xmin=min(p[0] for p in ps);xmax=max(p[0] for p in ps);ymin=min(p[1] for p in ps);ymax=max(p[1] for p in ps);best=(-1,None)
 for i in range(1,35):
  for j in range(1,35):
   p=[xmin+(xmax-xmin)*i/35,ymin+(ymax-ymin)*j/35]
   if inside(p,ps):
    score=min(d2(p,a,b) for a,b in zip(ps,ps[1:]))
    if score>best[0]:best=(score,p)
 assert best[1];return best[1]
project=lambda p:[round(65+(p[0]-97.513252)*67.9198844671,1),round(65.3+(29.223772-p[1])*67.9198844671,1)]
byname={g['properties']['shapeName']:g for g in next(iter(raw['objects'].values()))['geometries']}
features=[];regions=[]
for id,name,short,code,en in items:
 g=byname[en];assert g['type']=='Polygon'
 rings=[ring(ids) for ids in g['arcs']];pos=representative(rings[0]);label=project(pos)
 if id=='dali':label[1]-=27
 if id=='nujiang':label[0]-=8;label[1]-=17
 kind='地级市' if name.endswith('市') else '自治州'
 props={'id':id,'name':name,'short':short,'code':code,'kind':kind,'label':label,'labelCoordinate':pos,'sourceName':en,'sourceShapeId':g['properties']['shapeID']}
 features.append({'type':'Feature','properties':props,'geometry':{'type':'Polygon','coordinates':rings}})
 path=''.join('M'+'L'.join(','.join(map(str,project(p))) for p in r)+'Z' for r in rings)
 regions.append({**props,'path':path})
meta={'source':'OpenStreetMap contributors / Wambacher, via geoBoundaries 3.0.0','sourceUrl':'https://www.geoboundaries.org/data/geoBoundaries-3_0_0/CHN/ADM2/geoBoundaries-3_0_0-CHN-ADM2.topojson','boundaryYear':2017,'archiveDate':'2020-05-25','retrieved':'2026-10-16','license':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/','namesVerifiedWith':'https://ynmz.yn.gov.cn/bmfw/xzqh/xzqhsz/','note':'Simplified shared arcs; province outline remains Natural Earth. Regional exploration illustration, not an authoritative current boundary map.'}
Path('data/yunnan-prefectures.geojson').write_text(json.dumps({'type':'FeatureCollection','metadata':meta,'features':features},ensure_ascii=False,separators=(',',':'))+'\n')
Path('web/prefecture-data.js').write_text('/* Prefecture geometry: © OpenStreetMap contributors, ODbL-1.0; see data/yunnan-prefectures.geojson. */\nwindow.DALI_PREFECTURES = '+json.dumps({'metadata':meta,'regions':regions},ensure_ascii=False,separators=(',',':'))+';\n')
print(json.dumps([{r['short']:r['label']} for r in regions],ensure_ascii=False));print('regions',len(regions),'bytes',Path('web/prefecture-data.js').stat().st_size)
