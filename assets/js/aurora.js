/* Sunmo · hero light field (WebGL 1, half resolution, pauses off-screen) */
(() => {
  const canvases = document.querySelectorAll('canvas.aurora');
  if (!canvases.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PAL = {
    home:  { a: [0.28, 0.34, 0.62], b: [0.60, 0.46, 0.96], c: [0.98, 0.64, 0.40], k: 0.85 },
    beat:  { a: [0.48, 0.30, 1.00], b: [1.00, 0.50, 0.22], c: [0.26, 0.62, 0.98], k: 0.95 },
    labs:  { a: [0.36, 0.60, 0.72], b: [0.80, 0.86, 0.94], c: [0.55, 0.05, 0.10], k: 0.70 },
    cash:  { a: [0.12, 0.70, 0.46], b: [0.62, 0.94, 0.34], c: [0.10, 0.36, 0.62], k: 0.80 },
    about: { a: [0.80, 0.64, 0.44], b: [0.46, 0.54, 0.88], c: [0.95, 0.85, 0.72], k: 0.72 },
  };

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `
precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 ca;uniform vec3 cb;uniform vec3 cc;uniform float k;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 R=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*n(p);p=R*p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(gl_FragCoord.xy-.5*r)/r.y;
  p+=m*.08;
  float T=t*.04;
  vec2 q=vec2(fbm(p*1.25+vec2(0.,T)),fbm(p*1.25+vec2(5.2,-T)));
  vec2 w=vec2(fbm(p*1.6+3.*q+vec2(1.7,9.2)+T*.7),fbm(p*1.6+3.*q+vec2(8.3,2.8)-T*.6));
  float f=fbm(p*1.15+2.4*w);
  float rib=pow(1.-abs(sin((f*3.+w.x*1.4)*3.14159)),7.);
  float body=smoothstep(.32,1.02,f);
  vec3 col=mix(ca,cb,smoothstep(.25,.85,q.x));
  col=mix(col,cc,smoothstep(.5,.98,w.y)*.85);
  vec3 c=col*(body*.62+rib*.55);
  c*=mix(.18,1.,smoothstep(-.05,1.05,uv.y));
  c*=smoothstep(1.4,.2,length(p*vec2(.72,1.05)));
  c*=k;
  float g=h(gl_FragCoord.xy+t)*.018;
  gl_FragColor=vec4(vec3(.031,.035,.039)+c+g,1.);
}`;

  canvases.forEach((cv) => {
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    const pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(pr, n);
    const ur = U('r'), ut = U('t'), um = U('m'), uca = U('ca'), ucb = U('cb'), ucc = U('cc'), uk = U('k');
    const pal = PAL[cv.dataset.palette] || PAL.home;
    gl.uniform3fv(uca, pal.a); gl.uniform3fv(ucb, pal.b); gl.uniform3fv(ucc, pal.c); gl.uniform1f(uk, pal.k);

    const scale = 0.5;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.max(2, Math.round(cv.clientWidth * dpr * scale));
      const h = Math.max(2, Math.round(cv.clientHeight * dpr * scale));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(ur, w, h);
    };
    resize();
    addEventListener('resize', resize);

    let mx = 0, my = 0, tx = 0, ty = 0;
    addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = 0.5 - e.clientY / innerHeight; }, { passive: true });

    const seed = Math.random() * 40;
    const t0 = performance.now();
    let visible = true, rafId = 0;
    const frame = (now) => {
      mx += (tx - mx) * 0.03; my += (ty - my) * 0.03;
      gl.uniform2f(um, mx, my);
      gl.uniform1f(ut, seed + (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!cv.classList.contains('is-ready')) cv.classList.add('is-ready');
      if (!reduce && visible && !document.hidden) rafId = requestAnimationFrame(frame);
      else rafId = 0;
    };
    const kick = () => { if (!rafId) rafId = requestAnimationFrame(frame); };
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    kick();
  });
})();
