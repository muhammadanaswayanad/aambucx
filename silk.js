(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "silk";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return;

  const vsSource = `
    attribute vec2 a;
    void main() {
      gl_Position = vec4(a, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_ptr;
    uniform float u_scroll;

    float fold(vec2 p) {
      float sway = sin(p.y * 1.6 + u_time * 0.16) * 0.42;
      float pleat = sin(p.x * 8.0 + sway);
      float drape = sin(p.x * 1.45 + p.y * 0.72 + u_time * 0.2);
      float fall = sin(p.y * 2.8 - u_time * 0.14 + p.x * 0.35);
      return pleat * 0.5 + drape * 0.75 + fall * 0.32;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      p += u_ptr * 0.055;
      p.y -= u_scroll * 0.18;

      float e = 0.008;
      float h = fold(p);
      float hx = fold(p + vec2(e, 0.0)) - fold(p - vec2(e, 0.0));
      float hy = fold(p + vec2(0.0, e)) - fold(p - vec2(0.0, e));
      vec3 normal = normalize(vec3(-hx * 3.2, -hy * 3.2, 0.18));
      vec3 light = normalize(vec3(
        sin(u_time * 0.15) * 0.7,
        0.45,
        0.55
      ));
      float lit = clamp(dot(normal, light), 0.0, 1.0);
      float crest = smoothstep(0.45, 1.0, lit);
      vec3 view = vec3(0.0, 0.0, 1.0);
      float sheen = pow(clamp(dot(reflect(-light, normal), view), 0.0, 1.0), 48.0);

      vec3 cloth = vec3(0.015, 0.007, 0.006);
      vec3 crimson = vec3(0.5, 0.05, 0.016);
      float ridge = smoothstep(-0.35, 0.9, h);
      float pleat = 0.5 + 0.5 * sin(p.x * 8.0 + sin(p.y * 1.6 + u_time * 0.16) * 0.42);
      vec3 col = cloth;
      col += crimson * pow(pleat, 2.4) * 0.28;
      col += crimson * ridge * crest * 0.7;
      col += vec3(0.72, 0.16, 0.07) * sheen * 0.22;

      float path = p.y
        - sin(p.x * 1.35 + u_time * 0.12) * 0.2
        + sin(u_time * 0.07) * 0.62;
      float line = exp(-path * path * 3200.0);
      float thread = 0.86 + 0.14 * sin(p.x * 90.0 + u_time * 0.8);
      vec3 gold = vec3(0.58, 0.34, 0.11);
      col += gold * line * thread;
      float twin = path - 0.022;
      col += gold * exp(-twin * twin * 9000.0) * 0.45;

      float vignette = smoothstep(1.25, 0.15, length(uv - 0.5));
      col *= 0.78 + 0.22 * vignette;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vsSource);
  const fs = compile(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const uRes = gl.getUniformLocation(program, "u_res");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uPtr = gl.getUniformLocation(program, "u_ptr");
  const uScroll = gl.getUniformLocation(program, "u_scroll");

  const pointer = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let scroll = 0;
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, Math.floor(window.innerWidth * dpr));
    height = Math.max(1, Math.floor(window.innerHeight * dpr));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  window.addEventListener("pointermove", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  });

  window.addEventListener("resize", resize);
  resize();
  document.body.classList.add("has-silk");

  const start = performance.now();
  let frame = 0;

  function draw(now) {
    frame = requestAnimationFrame(draw);
    if (document.hidden) return;
    current.x += (pointer.x - current.x) * 0.04;
    current.y += (pointer.y - current.y) * 0.04;
    const target = window.scrollY / Math.max(window.innerHeight, 1);
    scroll += (target - scroll) * 0.08;
    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uPtr, current.x, -current.y);
    gl.uniform1f(uScroll, scroll);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  frame = requestAnimationFrame(draw);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !frame) frame = requestAnimationFrame(draw);
  });
})();
