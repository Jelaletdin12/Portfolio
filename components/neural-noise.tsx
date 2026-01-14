"use client";

import React, { useEffect, useRef } from "react";

const NeuralNoise = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;

    const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

    // Shader Source Codes
    const vertSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;
      void main() {
          vUv = .5 * (a_position + 1.);
          gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_ratio;
      uniform vec2 u_pointer_position;
      uniform float u_scroll_progress;

      vec2 rotate(vec2 uv, float th) {
          return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
      }

      float neuro_shape(vec2 uv, float t, float p) {
          vec2 sine_acc = vec2(0.);
          vec2 res = vec2(0.);
          float scale = 8.;
          for (int j = 0; j < 15; j++) {
              uv = rotate(uv, 1.);
              sine_acc = rotate(sine_acc, 1.);
              vec2 layer = uv * scale + float(j) + sine_acc - t;
              sine_acc += sin(layer) + 2.4 * p;
              res += (.5 + .5 * cos(layer)) / scale;
              scale *= (1.2);
          }
          return res.x + res.y;
      }

      void main() {
          vec2 uv = .5 * vUv;
          uv.x *= u_ratio;
          vec2 pointer = vUv - u_pointer_position;
          pointer.x *= u_ratio;
          float p = clamp(length(pointer), 0., 1.);
          p = .5 * pow(1. - p, 2.);
          float t = .001 * u_time;
          float noise = neuro_shape(uv, t, p);
          noise = 1.2 * pow(noise, 3.);
          noise += pow(noise, 10.);
          noise = max(.0, noise - .5);
          noise *= (1. - length(vUv - .5));
          vec3 color = normalize(vec3(.2, .5 + .4 * cos(3. * u_scroll_progress), .5 + .5 * sin(3. * u_scroll_progress)));
          gl_FragColor = vec4(color * noise, noise);
      }
    `;

    // Helper functions for shader creation
    const createShader = (
      gl: WebGLRenderingContext,
      source: string,
      type: number
    ) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl, vertSource, gl.VERTEX_SHADER));
    gl.attachShader(program, createShader(gl, fragSource, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Buffer setup
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uniforms = {
      u_time: gl.getUniformLocation(program, "u_time"),
      u_ratio: gl.getUniformLocation(program, "u_ratio"),
      u_pointer_position: gl.getUniformLocation(program, "u_pointer_position"),
      u_scroll_progress: gl.getUniformLocation(program, "u_scroll_progress"),
    };

    const pointer = { x: 0, y: 0, tX: 0, tY: 0 };

    const updateSize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uniforms.u_ratio, canvas.width / canvas.height);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      pointer.tX = x;
      pointer.tY = y;
    };

    window.addEventListener("resize", updateSize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleMouseMove);
    updateSize();

    let animationFrameId: number;
    const render = (time: number) => {
      pointer.x += (pointer.tX - pointer.x) * 0.1;
      pointer.y += (pointer.tY - pointer.y) * 0.1;

      gl.uniform1f(uniforms.u_time, time);
      gl.uniform2f(
        uniforms.u_pointer_position,
        pointer.x / window.innerWidth,
        1 - pointer.y / window.innerHeight
      );
      gl.uniform1f(
        uniforms.u_scroll_progress,
        window.scrollY / (2 * window.innerHeight)
      );

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none opacity-60"
      style={{ filter: "contrast(1.2) brightness(0.8)" }}
    />
  );
};

export default NeuralNoise;
