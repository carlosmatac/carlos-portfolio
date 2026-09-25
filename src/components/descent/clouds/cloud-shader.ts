export const cloudRaymarch = `
  precision highp sampler3D;
  uniform sampler3D cloudVolume;
  uniform sampler3D cloudDetail;
  uniform float cloudTime;
  vec2 cloudBounds(vec3 origin, vec3 direction) {
    vec3 a=(-vec3(0.5)-origin)/direction, b=(vec3(0.5)-origin)/direction;
    vec3 lo=min(a,b), hi=max(a,b);
    return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));
  }
  vec4 marchCloud(vec3 origin, vec3 direction, float strength) {
    vec2 bounds=cloudBounds(origin,direction);
    float start=max(0.0,bounds.x), end=bounds.y;
    if(start>=end) return vec4(0.0);
    float stepSize=(end-start)/float(CLOUD_STEPS);
    float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
    vec4 cloud=vec4(0.0);
    for(int i=0;i<CLOUD_STEPS;i++) {
      vec3 p=origin+direction*(start+(float(i)+0.35+jitter*0.3)*stepSize)+0.5;
      p+=vec3(sin(p.y*9.0+cloudTime),sin(p.z*8.0+cloudTime*0.7),cos(p.x*7.0+cloudTime*0.6))*0.009;
      vec2 field=texture(cloudVolume,p).rg;
      if(field.r<0.035) continue;
      vec3 coordinates=p*vec3(120.0,34.0,36.0)*0.14;
      float detail=texture(cloudDetail,coordinates).r*0.65+texture(cloudDetail,coordinates*2.35).g*0.35;
      float density=max(0.0,field.r-0.035-detail*0.055)*3.5;
      float alpha=1.0-exp(-density*stepSize*65.0*strength);
      vec3 ambient=mix(vec3(0.014,0.023,0.041),vec3(0.044,0.057,0.080),p.y);
      vec3 light=ambient+vec3(0.27,0.30,0.35)*field.g*mix(0.85,1.1,detail);
      cloud.rgb+=(1.0-cloud.a)*alpha*light;
      cloud.a+=(1.0-cloud.a)*alpha;
      if(cloud.a>0.995) break;
    }
    return cloud;
  }
`;
