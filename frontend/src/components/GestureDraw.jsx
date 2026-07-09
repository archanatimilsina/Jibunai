import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

const GestureDraw = () => {
  const drawCanvasRef = useRef(null);
  const pointCanvasRef = useRef(null);
  const wrapRef = useRef(null);
  const colors = [
    { value: "#1a1a2e", label: "Dark" },
    { value: "#185FA5", label: "Blue" },
    { value: "#0F6E56", label: "Teal" },
    { value: "#993C1D", label: "Coral" },
    { value: "#993556", label: "Pink" },
  ];

  const sizes = [
    { value: 2, label: "thin" },
    { value: 3, label: "mid" },
    { value: 6, label: "thick" },
  ];

  const [strokeColor, setStrokeColor] = useState("#1a1a2e");
  const [strokeSize, setStrokeSize] = useState(3);
  const [showPoints, setShowPoints] = useState(false);
  const [stats, setStats] = useState({
    strokes: 0,
    totalPoints: 0,
    currentStroke: null,
    lastPoint: null,
  });
  const [lastStokePts, setLastStrokePts] = useState([]);
  const [showHint, setShowHint] = useState(true);

const stateRef= useRef({
    drawing: false,
    allStrokes: [],
    currentPoints:[],
    totalPoints: 0,
    strokeColor: "#1a1a2e",
    showPoints: false,
    strokeSize: 3, 
});

useEffect(()=>{stateRef.current.strokeColor= strokeColor;},[strokeColor])
useEffect(()=>{stateRef.current.strokeSize= strokeSize;},[strokeSize])
useEffect(()=>{stateRef.current.showPoints= showPoints;},[showPoints])

const getCtx= ()=>(
{
    dCtx : drawCanvasRef.current?.getContext("2d"),
    pCtx : pointCanvasRef.current?.getContext("2d")
});

const getPos = (e)=>
{
    const r = drawCanvasRef.current.getBoundingClientRect();
    const src= e.touches ? e.touches[0]: e;
    return {x: Math.round(src.clientX- r.left), y: Math.round(src.clientY-r.top)};
}


const updateStats= ()=>
{
const s = stateRef.current;
const lastPt = s.currentPoints.length ? 
s.currentPoints[s.currentPoints.length-1] : 
s.allStrokes.length?
s.allStrokes[s.allStrokes.length-1].pts.at(-1):
null;
setStats({
    strokes: s.allStrokes.length,
    totalPoints: s.totalPoints,
    currentStroke: s.drawing? s.currentPoints.length : s.allStrokes.length? s.allStrokes[s.allStrokes.length-1].pos.length:null,
    lastPoint:lastPt
});
}

const redrawPointDots = useCallback(()=>
{
const {pCtx}= getCtx();
if(!pCtx || !pointCanvasRef.current) return;
pCtx.clearRect(0, 0, pointCanvasRef.current.width, pointCanvasRef.current.height)
if(!stateRef.current.showPoints) return;
stateRef.current.allStrokes.forEach((s) => {
  s.pts.forEach((p,i)=>{
    pCtx.beginPath()
    pCtx.arc(p.x,p.y,3,0,Math.PI*2)
    pCtx.fillStyle=
    i===0? "#185FA5":
    i===s.pts.length-1?"#0F6E56":"rgba(180,100,60,0.7)";
    pCtx.fill();
  });
});
},[])

const drawStrokes = (ctx, pts, color, size)=>
{
if(pts.length<2) return;
ctx.beginPath();
ctx.moveTo(pts[0].x,pts[0].y);
for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x,pts[i].y)
  ctx.strokeStyle= color;
ctx.lineWidth = size;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.stroke();
};


const redrawAll = useCallback(()=>{
const {dCtx}= getCtx();
if(!dCtx || !drawCanvasRef.current) return;
dCtx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height)
stateRef.current.allStrokes.forEach((s)=>drawStrokes(dCtx, s.pts, s.color, s.size));
if(stateRef.current.showPoints) redrawPointDots();
},[redrawPointDots]);


const resize = useCallback(()=>{
  const wrap= wrapRef.current;
  if(!wrap) return;
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  [drawCanvasRef.current, pointCanvasRef.current].forEach((c)=>{
    if(c){c.width=W; c.height=H; }
  })
  redrawAll();
},[redrawAll]);


useEffect(()=>
{
  resize();
  window.addEventListener("resize",resize);
  return ()=> window.removeEventListener("resize", resize)
},[resize]);


const handlePointerDown = (e)=> {
const s = stateRef.current;
s.drawing= true;
s.currentPoints= [getPos(e)];
setShowHint(false);
const {dCtx} = getCtx();
if(dCtx){
    dCtx.beginPath()
    dCtx.moveTo(s.currentPoints[0].x, s.currentPoints[0].y);
}
updateStats();
};

const handleTogglePoints = () => {
const next = !showPoints;
setShowPoints(next);
stateRef.current.showPoints = next;
if(!next)
{
  const {pCtx} = getCtx()
  if(pCtx) pCtx.clearRect(0, 0, pointCanvasRef.current.width, pointCanvasRef.current.height) 
}
else{
  redrawPointDots();
}
  };

  
const handleClear = () => {
const s= stateRef.current;
s.allStrokes=[];
s.currentPoints=[];
s.totalPoints=0;
const {dCtx, pCtx} = getCtx();
if(dCtx) dCtx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
if(pCtx) pCtx.clearRect(0,0,pointCanvasRef.current.width, pointCanvasRef.current.height);
setShowHint(true);
setLastStrokePts([]);
updateStats();
  };


const handlePointerMove =(e)=>
{
const s= stateRef.current;
if(!s.drawing) return;
const p = getPos(e);
s.currentPoints.push(p)
const {dCtx, pCtx} = getCtx();
if(dCtx){
    dCtx.lineTo(p.x,p.y);
    dCtx.strokeStyle = s.strokeColor;
    dCtx.lineWidth= s.strokeSize
    dCtx.lineCap = "round";
    dCtx.lineJoin = "round";
    dCtx.stroke();
    dCtx.beginPath();
    dCtx.moveTo(p.x, p.y);
}
if(s.showPoints && pCtx)
    {
        pCtx.beginPath()
        pCtx.arc(p.x, p.y, 3, 0, Math.PI*2)
        pCtx.fillStyle= "rgba(180, 100,60,0.7)"
        pCtx.fill()
       
    }
     updateStats();
};


const handlePointerUp = () => {
const s= stateRef.current;
if(!s.drawing) return;
s.drawing= false
if(s.currentPoints.length>0)
{
    s.allStrokes.push({pts: [...s.currentPoints], color:s.strokeColor, size: s.strokeSize})
    s.totalPoints+=s.currentPoints.length
    const pts = [...s.currentPoints];
    setLastStrokePts(pts)
    if(s.showPoints)
    {
        const {pCtx} = getCtx()
        if(pCtx)
        {
            [0,pts.length-1].forEach((i,idx)=>{
                pCtx.beginPath();
                pCtx.arc(pts[i].x,pts[i].y,4,0,Math.PI * 2);
                pCtx.fillStyle= idx=== 0? "#185FA5" : "#0F6E56";
                pCtx.fill();
            });
            
            }
        }
    }
s.currentPoints=[];
updateStats();
};

  return (
    <DrawingContainer>
      <Toolbar>
        <TextSpan>Color</TextSpan>
        {colors.map((color) => (
          <ColorBtn
            key={color.value}
            title={color.value}
            onClick={() => setStrokeColor(color.value)}
            style={{
              backgroundColor: color.value,
              border:
                strokeColor === color.value
                  ? "2px solid #111"
                  : "2px solid transparent",
              transform:
                strokeColor === color.value ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
        <div
          style={{
            width: "0.5px",
            height: 20,
            background: "var(--color-border-tertiary, #e5e5e5)",
            margin: "0 2px",
          }}
        />
        <TextSpan>Size</TextSpan>
        {sizes.map((s) => (
          <SizeBtn
            key={s.value}
            title="s.value"
            onClick={() => setStrokeSize(s.value)}
            style={{
              border:
                strokeSize === s.value
                  ? "0.5px solid var(--color-border-primary, #aaa)"
                  : "0.5px solid var(--color-border-secondary, #ccc)",
              background:
                strokeSize === s.value
                  ? "var(--color-background-secondary, #f5f5f5)"
                  : "transparent",
              color:
                strokeSize === s.value
                  ? "var(--color-text-primary, #111)"
                  : "var(--color-text-secondary, #666)",
            }}
          >
            {s.label}
          </SizeBtn>
        ))}
        <div
          style={{
            width: "1px",
            height: 20,
            background: "var(--color-border-tertiary, #e5e5e5)",
            margin: "0 2px",
          }}
        />

        <ShowPointBtn
          style={{
            backgroundColor: showPoints
              ? "var(--color-background-info, #e8f0fb)"
              : "transparent",
            color: showPoints
              ? "var(--color-text-info, #185FA5)"
              : "var(--color-text-secondary, #666)",
            border: showPoints
              ? "0.5px solid var(--color-border-info, #185FA5)"
              : "0.5px solid var(--color-border-secondary, #ccc)",
          }}
          onClick={handleTogglePoints}
        >
          show points
        </ShowPointBtn>
        <ClearBtn onClick={handleClear}>clear</ClearBtn>
      </Toolbar>

      <CanvasContainer ref={wrapRef}>
        <DrawCanvas ref={drawCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        />
        <PointCanvas ref={pointCanvasRef}/>

        {showHint && (
  <HintDiv>
    <HintSpan>draw anything here</HintSpan>
  </HintDiv>
)}
      </CanvasContainer>
      <GestureDetailContainer>
  {[
    { label: "strokes", val: stats.strokes },
    { label: "total points", val: stats.totalPoints },
    { label: "this stroke", val: stats.currentStroke ?? "—" },
    { label: "last point", val: stats.lastPoint ? `${stats.lastPoint.x}, ${stats.lastPoint.y}` : "—" },
  ].map(({ label, val }) => (
    <GestureDetailDiv key={label}>
      <DetailLabel>{label}</DetailLabel>
      <DetailValue>{val}</DetailValue>
    </GestureDetailDiv>
  ))}
</GestureDetailContainer>

{showPoints && lastStokePts.length>0 && (

<PointsContainer>
<h3>Points in last stroke</h3>
<PointsDiv>
{lastStokePts.map((p,i)=>{
    const isFirst = i == 0;
    const isLast = i == lastStokePts.length-1;
    return (
        <PointSpan
        key={i}
        style={{
        background: isFirst ? "var(--color-background-info, #e8f0fb)"
                      : isLast ? "var(--color-background-success, #e6f4f0)"
                      : "var(--color-background-secondary, #f5f5f5)",
        color: isFirst? "var(--color-text-info, #185FA5)"
                      : isLast ? "var(--color-text-success, #0F6E56)"
                      : "var(--color-text-secondary, #666)",
        border: `0.5px solid ${isFirst ? "var(--color-border-info, #185FA5)" : isLast ? "var(--color-border-success, #0F6E56)" : "var(--color-border-tertiary, #e5e5e5)"}`,
        }}
        >
{p.x},{p.y}
        </PointSpan>
    )
})}
</PointsDiv>

</PointsContainer>
)}
 </DrawingContainer>
  );
};

const DrawingContainer = styled.div`
  font-family: system-ui, sans-serif;
  background-color: #fff;
  min-height: 100vh;
`;
const Toolbar = styled.div`
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  padding: 12px 6px;
  border-bottom: 0.5px solid #e5e5e5;
  background-color: #fff;
`;
const TextSpan = styled.span`
  font-size: 12px;
  color: #666;
  letter-spacing: 0.02em;
`;
const ColorBtn = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  transition: transform 0.1s;
  cursor: pointer;
`;

const SizeBtn = styled.button`
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.15s;
`;

const ShowPointBtn = styled.button`
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 12px;
`;

const ClearBtn = styled.button`
  margin-left: auto;
  border: 0.5px solid var(--color-border-secondary, #ccc);
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 12px;
  background-color: transparent;
  color: var(--color-text-secondary, #666);
`;
const CanvasContainer = styled.div`
  position: relative;
  width: 100%;
  height: 500px;
  background-color: white;
  border-bottom: 0.5px solid black;
  cursor: crosshair;
  overflow: hidden;
`;

const DrawCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  touch-action: none;
`;
const PointCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;
const HintDiv = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;
const HintSpan = styled.span`
  font-size: 13px;
  color: var(--color-text-tertiary, #aaa);
  border: 0.5px dashed var(--color-border-tertiary, #e5e5e5);
  padding: 8px 18px;
  border-radius: 20px;
`;

const GestureDetailContainer = styled.div`
  display: flex;
  gap: 24px;
  padding: 10px 16px;
  border-bottom: 0.5px solid var(--color-border-tertiary, #e5e5e5);
  background-color: var(--color-background-secondary, #f9f9f9);
`;
const GestureDetailDiv = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;
const DetailLabel = styled.span`
  font-size: 11px;
  color: var(--color-text-tertiary, #aaa);
`;
const DetailValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #111);
`;

const PointsContainer = styled.div`
 max-height: 180px;
 overflow-y: auto;
 padding: 12px 16px ;
 h3{
    font-size: 12px;
     color: var(--color-text-secondary, #666); 
     margin-bottom: 8px;
    font-weight: 500;
 }

`;
const PointsDiv = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const PointSpan= styled.span`
    font-size: 11px;
    font-family: monospace;
    border-radius: 4px;
    padding: 2px 7px;
`;


export default GestureDraw;
