"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
};

export const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  function getContext() {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext("2d") : null;
  }

  function pointerPosition(canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = pointerPosition(canvas, event);
    context.beginPath();
    context.moveTo(x, y);
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context || !drawingRef.current) return;
    const { x, y } = pointerPosition(canvas, event);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.strokeStyle = "#11212e";
    context.lineTo(x, y);
    context.stroke();
    hasStrokeRef.current = true;
  }

  function endStroke() {
    drawingRef.current = false;
  }

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const context = getContext();
      if (!canvas || !context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      hasStrokeRef.current = false;
    },
    isEmpty() {
      return !hasStrokeRef.current;
    },
    toBlob() {
      const canvas = canvasRef.current;
      if (!canvas) return Promise.resolve(null);
      return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    }
  }));

  return (
    <canvas
      className="signature-pad"
      height={160}
      onPointerDown={startStroke}
      onPointerLeave={endStroke}
      onPointerMove={continueStroke}
      onPointerUp={endStroke}
      ref={canvas => {
        canvasRef.current = canvas;
        if (canvas) {
          const context = canvas.getContext("2d");
          if (context) {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      }}
      style={{ border: "1px solid #c9d1d9", borderRadius: 6, touchAction: "none", width: "100%", maxWidth: 420 }}
      width={420}
    />
  );
});
