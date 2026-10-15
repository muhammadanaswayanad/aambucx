(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const vsSource = `
    attribute vec2 a;
    void main() {
      gl_Position = vec4(a, 0.0, 1.0);
    }
  `;

  const chiffonSource = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_ptr;

    float veil(vec2 p) {
      return sin(p.x * 0.85 + p.y * 0.38 + u_time * 0.07)
        + 0.55 * sin(p.y * 0.62 - u_time * 0.045 + p.x * 0.18)
        + 0.22 * sin((p.x - p.y) * 1.7 + u_time * 0.09);
    }

    void main() {
      vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      p += u_ptr * 0.028;
      float e = 0.028;
      float h = veil(p);
      float hx = veil(p + vec2(e, 0.0)) - veil(p - vec2(e, 0.0));
      float hy = veil(p + vec2(0.0, e)) - veil(p - vec2(0.0, e));
      vec3 normal = normalize(vec3(-hx, -hy, 0.72));
      vec3 light = normalize(vec3(0.15, 0.28, 0.85));
      float lit = clamp(dot(normal, light), 0.0, 1.0);
      float sheen = pow(lit, 5.0);
      vec3 ground = vec3(0.018, 0.007, 0.006);
      vec3 blush = vec3(0.22, 0.035, 0.016);
      vec3 col = ground + blush * (0.45 + 0.55 * h) * 0.07 + blush * sheen * 0.42;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const palluSource = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform float u_scroll;
    uniform vec2 u_touch;
    uniform vec2 u_disp;
    uniform float u_amp;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      float docY = (u_scroll + (u_res.y - gl_FragCoord.y)) / u_res.y;
      vec2 p = vec2(uv.x, docY * 1.15);

      vec2 away = uv - u_touch;
      float near = exp(-dot(away, away) * 7.5) * u_amp;
      p.x += u_disp.x * near;
      p.y += u_disp.y * near * 0.65;

      float gather = sin(p.y * 1.7 + u_time * 0.08);
      float pleat = 0.5 + 0.5 * sin(p.x * 22.0 + gather * 0.28);
      float fall = 0.5 + 0.5 * sin(p.y * 0.85 + p.x * 0.18);

      vec3 cloth = vec3(0.012, 0.004, 0.003);
      vec3 crimson = vec3(0.42, 0.045, 0.014);
      vec3 col = cloth + crimson * pow(pleat, 4.0) * 0.26;
      col += crimson * fall * 0.045;
      col += vec3(0.55, 0.12, 0.035) * pow(pleat, 12.0) * 0.1;

      float edge = 0.78 + sin(p.y * 1.35 + u_time * 0.06) * 0.016;
      edge += u_disp.x * near * 0.9;
      float dist = uv.x - edge;
      float thread = 0.86 + 0.14 * sin(p.y * 96.0);
      vec3 gold = vec3(0.95, 0.74, 0.28);
      col += crimson * smoothstep(0.1, 0.0, dist) * smoothstep(-0.15, -0.02, dist) * 0.4;
      col += gold * exp(-dist * dist * 280.0) * 0.16;
      col += gold * exp(-dist * dist * 7000.0) * thread;
      col += gold * exp(-pow(dist + 0.024, 2.0) * 11000.0) * 0.85;

      float fade = smoothstep(1.0, 0.52, uv.x);
      gl_FragColor = vec4(col * fade, fade);
    }
  `;

  function makeCanvas(className) {
    const canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    return canvas;
  }

  function boot(canvas, fragment, alpha) {
    const gl = canvas.getContext("webgl", {
      alpha,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return null;

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
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    const loc = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {};
    ["u_res", "u_time", "u_ptr", "u_scroll", "u_touch", "u_disp", "u_amp"].forEach(
      (name) => {
        uniforms[name] = gl.getUniformLocation(program, name);
      },
    );
    return { gl, uniforms };
  }

  const chiffonCanvas = makeCanvas("cloth chiffon");
  const palluCanvas = makeCanvas("cloth pallu");
  const chiffon = boot(chiffonCanvas, chiffonSource, false);
  const pallu = boot(palluCanvas, palluSource, true);
  if (!chiffon || !pallu) return;

  document.body.classList.add("has-silk");

  const pointer = { x: 0, y: 0 };
  const drift = { x: 0, y: 0 };
  const touch = { x: 0.7, y: 0.4 };
  const target = { x: 0, y: 0 };
  const spring = { x: 0, y: 0, vx: 0, vy: 0 };
  let amp = 0;
  let ampTarget = 0;

  function follow(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    const zone = palluCanvas.getBoundingClientRect();
    if (event.clientX <= zone.right) {
      touch.x = (event.clientX - zone.left) / Math.max(zone.width, 1);
      touch.y = 1 - (event.clientY - zone.top) / Math.max(zone.height, 1);
      target.x = (touch.x - 0.74) * 0.22;
      target.y = (touch.y - 0.5) * 0.35;
      ampTarget = 1;
    } else {
      target.x = 0;
      target.y = 0;
      ampTarget = 0;
    }
  }

  if (!reduce) {
    window.addEventListener("pointermove", follow);
    window.addEventListener("pointerdown", follow);
    window.addEventListener("pointerleave", () => {
      target.x = 0;
      target.y = 0;
      ampTarget = 0;
    });
  }

  function resize(canvas, gl) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  const start = performance.now();

  function frame(now) {
    if (!reduce) requestAnimationFrame(frame);
    if (document.hidden) return;

    const time = reduce ? 0 : (now - start) / 1000;
    if (!reduce) {
      drift.x += (pointer.x - drift.x) * 0.02;
      drift.y += (pointer.y - drift.y) * 0.02;
      spring.vx = (spring.vx + (target.x - spring.x) * 0.04) * 0.86;
      spring.vy = (spring.vy + (target.y - spring.y) * 0.04) * 0.86;
      spring.x += spring.vx;
      spring.y += spring.vy;
      amp += (ampTarget - amp) * 0.05;
    }

    resize(chiffonCanvas, chiffon.gl);
    chiffon.gl.uniform2f(chiffon.uniforms.u_res, chiffonCanvas.width, chiffonCanvas.height);
    chiffon.gl.uniform1f(chiffon.uniforms.u_time, time);
    chiffon.gl.uniform2f(chiffon.uniforms.u_ptr, drift.x, -drift.y);
    chiffon.gl.drawArrays(chiffon.gl.TRIANGLE_STRIP, 0, 4);

    resize(palluCanvas, pallu.gl);
    const scroll = window.scrollY * Math.min(window.devicePixelRatio || 1, 1.5);
    pallu.gl.uniform2f(pallu.uniforms.u_res, palluCanvas.width, palluCanvas.height);
    pallu.gl.uniform1f(pallu.uniforms.u_time, time);
    pallu.gl.uniform1f(pallu.uniforms.u_scroll, reduce ? 0 : scroll);
    pallu.gl.uniform2f(pallu.uniforms.u_touch, touch.x, touch.y);
    pallu.gl.uniform2f(pallu.uniforms.u_disp, spring.x, spring.y);
    pallu.gl.uniform1f(pallu.uniforms.u_amp, amp);
    pallu.gl.drawArrays(pallu.gl.TRIANGLE_STRIP, 0, 4);
  }

  frame(performance.now());
})();
