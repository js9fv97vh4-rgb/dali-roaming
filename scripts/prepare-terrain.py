"""Build a bounded geographic DEM grid from the public Terrarium zoom-11 tiles.
Usage: bundled Python with Pillow; source PNG files in /tmp/dali-enrich/11-X-Y.png.
No source PNG imagery is redistributed. Elevations are rounded to metres.
"""
from pathlib import Path
from PIL import Image
import math,json
root=Path(__file__).resolve().parents[1]
bounds=[99.85,25.45,100.50,26.10]
cols,rows=401,449
images={(x,y):Image.open(f'/tmp/dali-enrich/11-{x}-{y}.png').convert('RGB') for x in range(1592,1596) for y in range(870,875)}
def pixel(x,y):
    rgb=images[x//256,y//256].getpixel((x%256,y%256))
    return rgb[0]*256+rgb[1]+rgb[2]/256-32768
def sample(lon,lat):
    x=(lon+180)/360*2048*256-.5
    y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2048*256-.5
    xi,yi=math.floor(x),math.floor(y);fx,fy=x-xi,y-yi
    return round((pixel(xi,yi)*(1-fx)+pixel(xi+1,yi)*fx)*(1-fy)+(pixel(xi,yi+1)*(1-fx)+pixel(xi+1,yi+1)*fx)*fy)
heights=[sample(bounds[0]+(bounds[2]-bounds[0])*x/(cols-1),bounds[3]-(bounds[3]-bounds[1])*y/(rows-1)) for y in range(rows) for x in range(cols)]
data={'bounds':bounds,'columns':cols,'rows':rows,'heights':heights,'lakeLevel':sample(100.19,25.81),'source':'Mapzen Terrain Tiles / AWS Open Data; SRTM and GMTED2010 courtesy of USGS','sourceUrls':[f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/11/{x}/{y}.png' for x,y in images],'attributionUrl':'https://github.com/tilezen/joerd/blob/master/docs/attribution.md','processing':'Bilinear sample in Web Mercator, geographic output grid, rounded to metres. Displayed relief exaggerated 2.8×; colours and buildings are illustrative.'}
(root/'web/terrain/erhai-dem.json').write_text(json.dumps(data,separators=(',',':')))
print('DEM:',cols,rows,'min/max',min(heights),max(heights),'lake',data['lakeLevel'])
