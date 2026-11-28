/* Aplica uma LUT 3D num canvas inteiro pela placa de vídeo (WebGL2, textura 3D com interpolação).
 * Usado pelo Editor a cada quadro (prévia e exportação). Sem WebGL2, cai no cálculo pela CPU. */
import { applyTable, buildLut, specKey, type LutSpec } from "./core";

type Src = HTMLCanvasElement | OffscreenCanvas;
type Ctx2 = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const N = 33;

let gl: WebGL2RenderingContext | null = null;
let glCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let prog: WebGLProgram | null = null;
let srcTex: WebGLTexture | null = null;
let lutTex: WebGLTexture | null = null;
let lutKey = "";
let failed = false;

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = vec2((p.x+1.0)*0.5, 1.0-(p.y+1.0)*0.5); gl_Position = vec4(p,0.0,1.0); }`;
const FS = `#version 300 es
precision highp float; precision highp sampler3D;
in vec2 uv; out vec4 o;
uniform sampler2D src; uniform sampler3D lut;
const float S = ${N}.0;
void main(){ vec4 c = texture(src, uv); vec3 q = c.rgb * ((S-1.0)/S) + 0.5/S; o = vec4(texture(lut, q).rgb, 1.0); }`;

function init(w: number, h: number): boolean {
  if (failed) return false;
  try {
    if (!glCanvas) {
      glCanvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
      gl = glCanvas.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: false }) as WebGL2RenderingContext | null;
      if (!gl) { failed = true; return false; }
      const sh = (type: number, code: string) => { const s = gl!.createShader(type)!; gl!.shaderSource(s, code); gl!.compileShader(s); return s; };
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { failed = true; return false; }
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      srcTex = gl.createTexture(); lutTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, lutTex);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_3D, k, v);
      gl.uniform1i(gl.getUniformLocation(prog, "src"), 0); gl.uniform1i(gl.getUniformLocation(prog, "lut"), 1);
    }
    if (glCanvas.width !== w || glCanvas.height !== h) { glCanvas.width = w; glCanvas.height = h; }
    return true;
  } catch { failed = true; return false; }
}

function loadLut(spec: LutSpec) {
  const key = specKey(spec);
  if (key === lutKey || !gl) return;
  const t = buildLut(spec, N);
  const bytes = new Uint8Array(N * N * N * 4);
  for (let i = 0, j = 0; i < t.length; i += 3, j += 4) { bytes[j] = t[i] * 255 + 0.5; bytes[j + 1] = t[i + 1] * 255 + 0.5; bytes[j + 2] = t[i + 2] * 255 + 0.5; bytes[j + 3] = 255; }
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, lutTex);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
  lutKey = key;
}

/** troca o conteúdo do canvas pelo mesmo quadro com a LUT (conversão do log e/ou estilo) */
export function applyLutToCanvas(ctx: Ctx2, spec: LutSpec, w: number, h: number) {
  if (!spec.log && !spec.look) return;
  if (init(w, h) && gl) {
    loadLut(spec);
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas as Src as TexImageSource);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.save(); ctx.globalCompositeOperation = "copy"; ctx.drawImage(glCanvas as CanvasImageSource, 0, 0, w, h); ctx.restore();
    return;
  }
  const img = ctx.getImageData(0, 0, w, h);
  applyTable(img, buildLut(spec, N), N);
  ctx.putImageData(img, 0, 0);
}
