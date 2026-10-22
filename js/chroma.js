/* COMPLETOS MOJADOS · CG — quitar fondo verde (chroma key) con WebGL.
   Mismo método que el filtro "Chroma Key" de OBS: compara el color en un espacio sin brillo (UV)
   y aplica similitud, suavizado y eliminación del reflejo verde. Corre en la tarjeta de video. */
(function () {
  "use strict";
  var CG = window.CG = window.CG || {};
  var VS = "attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform vec2 key;uniform vec2 px;uniform float sim,smo,spill;",
    "vec2 toUV(vec3 c){return vec2(c.r*-.169+c.g*-.331+c.b*.5+.5,c.r*.5+c.g*-.419+c.b*-.081+.5);}",
    "float dist(vec2 o){return distance(key,toUV(texture2D(tex,uv+o).rgb));}",
    "void main(){vec4 c=texture2D(tex,uv);",
    "float d=dist(vec2(0.))*4.;",
    "d+=dist(vec2(-px.x,0.))+dist(vec2(px.x,0.))+dist(vec2(0.,-px.y))+dist(vec2(0.,px.y));",
    "d+=(dist(-px)+dist(px)+dist(vec2(px.x,-px.y))+dist(vec2(-px.x,px.y)))*.5;d/=10.;",
    "float b=d-sim;float a=pow(clamp(b/smo,0.,1.),1.5);float s=pow(clamp(b/spill,0.,1.),1.5);",
    "float g=dot(c.rgb,vec3(.2126,.7152,.0722));vec3 rgb=mix(vec3(g),c.rgb,s);",
    "gl_FragColor=vec4(rgb*a,a);}"
  ].join("\n");

  function hexRGB(h) { h = String(h || "#00ff00").replace("#", ""); if (h.length === 3) { h = h.replace(/./g, "$&$&"); } var n = parseInt(h, 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function rgbUV(c) { return [c[0] * -0.169 + c[1] * -0.331 + c[2] * 0.5 + 0.5, c[0] * 0.5 + c[1] * -0.419 + c[2] * -0.081 + 0.5]; }

  CG.Chroma = function (canvas, video) {
    var gl = canvas.getContext("webgl", {premultipliedAlpha: true, alpha: true, antialias: false}) || canvas.getContext("experimental-webgl");
    if (!gl) { throw new Error("WebGL no disponible"); }
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(o)); } return o; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var lp = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var U = {key: gl.getUniformLocation(pr, "key"), px: gl.getUniformLocation(pr, "px"), sim: gl.getUniformLocation(pr, "sim"), smo: gl.getUniformLocation(pr, "smo"), spill: gl.getUniformLocation(pr, "spill")};
    var vivo = true, raf = 0, rvfc = 0, errorCors = false;

    function dibujar() {
      if (!vivo) { return; }
      if (video.readyState >= 2 && video.videoWidth) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight; gl.viewport(0, 0, canvas.width, canvas.height);
          gl.uniform2f(U.px, 1 / canvas.width, 1 / canvas.height);
        }
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); }
        catch (e) { if (!errorCors) { errorCors = true; console.warn("[chroma] el servidor del video no permite leerlo (CORS)", e); } return; }
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    function bucle() {
      dibujar();
      if (!vivo) { return; }
      if (video.requestVideoFrameCallback && !video.paused) { rvfc = video.requestVideoFrameCallback(bucle); }
      else { raf = requestAnimationFrame(bucle); }
    }
    video.addEventListener("play", function () { cancelAnimationFrame(raf); bucle(); });
    video.addEventListener("seeked", dibujar);
    video.addEventListener("loadeddata", dibujar);
    bucle();

    return {
      dibujar: dibujar,
      config: function (d) {
        var k = rgbUV(hexRGB(d.keyColor));
        gl.uniform2f(U.key, k[0], k[1]);
        gl.uniform1f(U.sim, Math.max(0.001, (+d.similitud || 40) / 100));
        gl.uniform1f(U.smo, Math.max(0.001, (+d.suavizado || 8) / 100));
        gl.uniform1f(U.spill, Math.max(0.001, (+d.derrame || 10) / 100));
        dibujar();
      },
      destruir: function () { vivo = false; cancelAnimationFrame(raf); if (video.cancelVideoFrameCallback && rvfc) { video.cancelVideoFrameCallback(rvfc); } var ext = gl.getExtension("WEBGL_lose_context"); if (ext) { ext.loseContext(); } }
    };
  };
  CG.hexRGB = hexRGB;
})();
