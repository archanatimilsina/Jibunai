import { useEffect, useRef, useCallback } from "react";
const TAP_WINDOW_MS   = 600;  
const TAP_REQUIRED    = 3;    
const STROKE_PAUSE_MS = 800;   
const MIN_POINTS      = 5;     

export function useGestureCanvas({ onGesture }) {
  const canvasRef        = useRef(null);
  const activeRef        = useRef(false);
  const tapTimesRef      = useRef([]);
  const strokesRef       = useRef([]);
  const currentStrokeRef = useRef(null);
  const pauseTimerRef    = useRef(null);

    const activateCanvas = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current  = true;
    strokesRef.current = [];

    const canvas = canvasRef.current;
    canvas.style.display = "block";
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const handleTap = useCallback((e) => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    tapTimesRef.current = tapTimesRef.current.filter(
      (t) => now - t <= TAP_WINDOW_MS
    );

    if (tapTimesRef.current.length >= TAP_REQUIRED) {
      tapTimesRef.current = [];
      activateCanvas();
    }
  }, [activateCanvas]);


  const deactivateCanvas = useCallback(() => {
    activeRef.current = false;
    const canvas = canvasRef.current;
    canvas.style.display = "none";

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokesRef.current    = [];
    currentStrokeRef.current = null;
  }, []);

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const onPointerDown = useCallback((e) => {
    if (!activeRef.current) return;
    clearTimeout(pauseTimerRef.current);

    currentStrokeRef.current = [getPoint(e)];
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!activeRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.push(getPoint(e));
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!activeRef.current || !currentStrokeRef.current) return;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    
    if (stroke.length >= MIN_POINTS) {
      strokesRef.current.push(stroke);
    }

    pauseTimerRef.current = setTimeout(() => {
      const gesture = strokesRef.current;
      deactivateCanvas();

      if (gesture.length > 0 && onGesture) {
        onGesture(gesture); 
      }
    }, STROKE_PAUSE_MS);
  }, [onGesture, deactivateCanvas]);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape" && activeRef.current) {
      clearTimeout(pauseTimerRef.current);
      deactivateCanvas();
    }
  }, [deactivateCanvas]);

  useEffect(() => {
    document.addEventListener("pointerdown", handleTap);
    document.addEventListener("keydown", onKeyDown);

    const canvas = canvasRef.current;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup",   onPointerUp);

    return () => {
      document.removeEventListener("pointerdown", handleTap);
      document.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup",   onPointerUp);
      clearTimeout(pauseTimerRef.current);
    };
  }, [handleTap, onKeyDown, onPointerDown, onPointerMove, onPointerUp]);

  return canvasRef;
}