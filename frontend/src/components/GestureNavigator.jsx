import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DollarRecognizer } from "../js/dollarRecognizer";
import { useGestureCanvas } from "../js/useGestureCanvas";
import yaml from "js-yaml";
const BUILT_IN_TEMPLATES = {
  circle: [
    [
      {x:127,y:141},{x:124,y:140},{x:120,y:139},{x:118,y:139},{x:116,y:139},
      {x:111,y:140},{x:109,y:141},{x:104,y:144},{x:100,y:147},{x:96,y:152},
      {x:93,y:157},{x:90,y:162},{x:87,y:169},{x:85,y:175},{x:83,y:182},
      {x:82,y:189},{x:82,y:196},{x:83,y:203},{x:85,y:210},{x:88,y:216},
      {x:92,y:222},{x:97,y:227},{x:103,y:231},{x:110,y:234},{x:117,y:235},
      {x:124,y:235},{x:131,y:234},{x:138,y:231},{x:144,y:227},{x:149,y:222},
      {x:153,y:216},{x:155,y:210},{x:157,y:203},{x:158,y:196},{x:158,y:189},
      {x:157,y:182},{x:155,y:175},{x:152,y:169},{x:149,y:162},{x:145,y:157},
      {x:141,y:152},{x:137,y:148},{x:133,y:145},{x:127,y:141},
    ],
  ],
  triangle: [
    [
      {x:137,y:139},{x:135,y:141},{x:133,y:144},{x:132,y:146},
      {x:130,y:149},{x:128,y:152},{x:127,y:155},{x:125,y:158},
      {x:123,y:161},{x:121,y:165},{x:119,y:168},{x:117,y:172},
      {x:115,y:175},{x:114,y:178},{x:112,y:182},{x:110,y:185},
      {x:108,y:189},{x:107,y:192},{x:105,y:196},{x:104,y:199},
      {x:102,y:203},{x:100,y:206},{x:99,y:210},{x:97,y:213},
      {x:98,y:213},{x:101,y:213},{x:106, y:213},{x:112,y:213},
      {x:118,y:213},{x:124,y:213},{x:130,y:213},{x:136,y:213},
      {x:142,y:213},{x:148,y:213},{x:154,y:213},{x:160,y:213},
      {x:166,y:213},{x:171,y:213},{x:174,y:213},{x:171,y:210},
      {x:168,y:207},{x:165,y:204},{x:163,y:201},{x:160,y:198},
      {x:157,y:195},{x:154,y:192},{x:151,y:189},{x:148,y:186},
      {x:145,y:183},{x:142,y:180},{x:139,y:177},{x:137,y:174},
      {x:134,y:171},{x:131,y:168},{x:128,y:165},{x:137,y:139},
    ],
  ],
  check: [
    [
      {x:91,y:185},{x:93,y:185},{x:95,y:185},{x:97,y:185},
      {x:100,y:188},{x:102,y:189},{x:104,y:190},{x:106,y:193},
      {x:108,y:195},{x:110,y:198},{x:112,y:201},{x:113,y:204},
      {x:115,y:207},{x:117,y:210},{x:118,y:212},{x:120,y:214},
      {x:121,y:217},{x:122,y:219},{x:123,y:222},{x:124,y:224},
      {x:126,y:222},{x:127,y:220},{x:129,y:218},{x:130,y:216},
      {x:132,y:213},{x:133,y:211},{x:135,y:208},{x:136,y:206},
      {x:138,y:204},{x:139,y:202},{x:141,y:199},{x:142,y:197},
      {x:144,y:194},{x:146,y:192},{x:148,y:189},{x:149,y:187},
      {x:151,y:184},{x:153,y:182},{x:155,y:180},{x:157,y:177},
    ],
  ],
  caret: [
    [
      {x:79,y:245},{x:79,y:242},{x:79,y:239},{x:80,y:237},
      {x:80,y:234},{x:81,y:232},{x:82,y:230},{x:84,y:228},
      {x:86,y:226},{x:88,y:224},{x:90,y:220},{x:92,y:218},
      {x:95,y:216},{x:97,y:213},{x:100,y:210},{x:102,y:208},
      {x:106,y:104},{x:109,y:102},{x:112,y:100},{x:115,y:98},
      {x:119,y:96},{x:139,y:96},{x:146,y:100},{x:150,y:103},
      {x:153,y:107},{x:157,y:111},{x:161,y:116},{x:165,y:120},
      {x:170,y:125},{x:175,y:130},{x:179,y:135},{x:183,y:141},
      {x:186,y:148},{x:188,y:154},{x:189,y:160},{x:189,y:168},
    ],
  ],
  arrow: [
    [
      {x:68,y:222},{x:70,y:220},{x:73,y:218},{x:75,y:217},
      {x:77,y:215},{x:80,y:213},{x:82,y:212},{x:84,y:210},
      {x:87,y:209},{x:89,y:208},{x:92,y:207},{x:95,y:206},
      {x:97,y:205},{x:100,y:205},{x:102,y:205},{x:105,y:205},
      {x:108,y:205},{x:110,y:205},{x:113,y:205},{x:115,y:206},
      {x:118,y:206},{x:120,y:207},{x:123,y:208},{x:125,y:209},
      {x:128,y:210},{x:130,y:211},{x:133,y:212},{x:135,y:214},
      {x:137,y:215},{x:139,y:217},{x:142,y:218},{x:144,y:220},
      {x:146,y:222},{x:147,y:224},{x:149,y:226},{x:147,y:224},
      {x:146,y:218},{x:145,y:213},{x:145,y:208},{x:145,y:203},
      {x:145,y:198},{x:145,y:192},{x:145,y:187},{x:145,y:182},
    ],
  ],
  pigtail: [
    [
      {x:81,y:219},{x:84,y:218},{x:86,y:220},{x:88,y:220},
      {x:90,y:220},{x:92,y:219},{x:95,y:220},{x:97,y:219},
      {x:99,y:220},{x:102,y:225},{x:108,y:228},{x:111,y:226},
      {x:114,y:222},{x:115,y:219},{x:114,y:215},{x:111,y:208},
      {x:106,y:204},{x:101,y:201},{x:96,y:201},{x:92,y:204},
      {x:91,y:211},{x:96,y:218},{x:101,y:220},{x:107,y:218},
      {x:112,y:216},{x:115,y:213},{x:117,y:210},{x:119,y:207},
    ],
  ],
};


const recognizer = new DollarRecognizer();

Object.entries(BUILT_IN_TEMPLATES).forEach(([name, strokes]) => {
  recognizer.addTemplate(name, strokes);
});

export default function GestureNavigator() {
  const navigate           = useNavigate();
  const [active, setActive]   = useState(false);
  const [toast, setToast]     = useState(null);  
  const navConfigRef       = useRef(null);
  const toastTimerRef      = useRef(null);

  useEffect(() => {
    fetch("/gesture-nav.yaml")
      .then((r) => r.text())
      .then((text) => {
        navConfigRef.current = yaml.load(text);
      })
      .catch(() => {
        navConfigRef.current = {
          score_threshold: 0.70,
          gestures: [
            { gesture: "circle",   route: "/skills",          label: "Skills"       },
            { gesture: "triangle", route: "/projects",  label: "Projects"   },
            { gesture: "check",    route: "/experience",label: "Experience" },
            { gesture: "caret",    route: "/contact",   label: "Contact"    },
            { gesture: "arrow",    route: "/",    label: "Home"     },
            { gesture: "pigtail",  route: "/about",     label: "About"      },
          ],
        };
      });
  }, []);

  const handleGesture = useCallback((strokes) => {
    setActive(false);
    const result = recognizer.recognize(strokes);
    if (!result) return;

    const config    = navConfigRef.current;
    const threshold = config?.score_threshold ?? 0.70;
    if (result.score < threshold) return;

    const entry = config?.gestures?.find((g) => g.gesture === result.name);
    if (!entry) return;

    clearTimeout(toastTimerRef.current);
    setToast({ label: entry.label, score: result.score });
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);

    navigate(entry.route);
  }, [navigate]);

  const canvasRef = useGestureCanvas({
    onGesture: handleGesture,
    onActivate: () => setActive(true),
    onDeactivate: () => setActive(false),
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          display:    "none",
          position:   "fixed",
          inset:      0,
          zIndex:     9998,
          cursor:     "crosshair",
          touchAction:"none",
        }}
      />

      {active && (
        <div
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         9997,
            pointerEvents:  "none",
            border:         "2px dashed rgba(99,102,241,0.4)",
            borderRadius:   "12px",
            margin:         "12px",
            display:        "flex",
            alignItems:     "flex-end",
            justifyContent: "center",
            paddingBottom:  "32px",
          }}
        >
          <span
            style={{
              background: "rgba(99,102,241,0.85)",
              color:      "#fff",
              padding:    "6px 16px",
              borderRadius: "20px",
              fontSize:   "13px",
              letterSpacing: "0.02em",
            }}
          >
            Draw a gesture • Esc to cancel
          </span>
        </div>
      )}

      {toast && (
        <div
          style={{
            position:   "fixed",
            bottom:     "32px",
            left:       "50%",
            transform:  "translateX(-50%)",
            zIndex:     9999,
            background: "rgba(15,23,42,0.92)",
            color:      "#f8fafc",
            padding:    "10px 22px",
            borderRadius: "24px",
            fontSize:   "14px",
            display:    "flex",
            gap:        "8px",
            alignItems: "center",
          }}
        >
          <span>Navigating to</span>
          <strong>{toast.label}</strong>
          <span style={{ opacity: 0.55, fontSize: "12px" }}>
            {Math.round(toast.score * 100)}%
          </span>
        </div>
      )}
    </>
  );
}

export function GestureRecorder() {
  const canvasRef    = useRef(null);
  const drawing      = useRef(false);
  const strokesRef   = useRef([]);
  const currentRef   = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    const onDown = (e) => {
      drawing.current  = true;
      currentRef.current = [getPoint(e, canvas)];
      ctx.beginPath();
      ctx.moveTo(currentRef.current[0].x, currentRef.current[0].y);
    };
    const onMove = (e) => {
      if (!drawing.current) return;
      const p = getPoint(e, canvas);
      currentRef.current.push(p);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const onUp = () => {
      if (!drawing.current) return;
      drawing.current = false;
      strokesRef.current.push(currentRef.current);
      currentRef.current = [];
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup",   onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup",   onUp);
    };
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "monospace" }}>
      <h3>Gesture Recorder (dev only)</h3>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{ border: "1px dashed #888", touchAction: "none", cursor: "crosshair" }}
      />
      <br />
      <button
        onClick={() => {
          console.log("Recorded strokes:", JSON.stringify(strokesRef.current));
          alert("Strokes logged to console — copy into BUILT_IN_TEMPLATES");
        }}
      >
        Log strokes
      </button>
      <button
        onClick={() => {
          strokesRef.current = [];
          const canvas = canvasRef.current;
          canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        }}
        style={{ marginLeft: 8 }}
      >
        Clear
      </button>
    </div>
  );
}

function getPoint(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}