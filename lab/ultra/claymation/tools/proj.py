# Pinhole projector with the same maths as a three.js PerspectiveCamera (vertical fov, 1080x1920): world points -> screen px.
# python3 tools/proj.py '{"cam":[x,y,z],"look":[x,y,z],"fov":30,"pts":{"name":[x,y,z]}}'
import numpy as np, sys, json
def proj(cam, look, fov, pts):
    cam=np.array(cam,float); look=np.array(look,float)
    f=look-cam; f/=np.linalg.norm(f)
    r=np.cross(f,[0,1,0]); r/=np.linalg.norm(r)
    u=np.cross(r,f)
    t=np.tan(np.radians(fov)/2)
    out={}
    for k,p in pts.items():
        d=np.array(p,float)-cam
        z=d@f; x=d@r; y=d@u
        sx=540+ x/(z*t*0.5625)*540; sy=960 - y/(z*t)*960
        out[k]=(round(sx),round(sy))
    return out
if __name__=='__main__':
    a=json.loads(sys.argv[1])
    for k,v in proj(a['cam'],a['look'],a['fov'],a['pts']).items(): print(k,v)
