const NUM_POINTS  = 64;
const SQUARE_SIZE = 250;
const ORIGIN      = { x: 0, y: 0 };
const DIAGONAL    = Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE);
const HALF_DIAG   = 0.5 * DIAGONAL;
const ANGLE_RANGE = degreesToRadians(45);
const ANGLE_PREC  = degreesToRadians(2);
const PHI         = 0.5 * (-1 + Math.sqrt(5)); 


function degreesToRadians(d) { return (d * Math.PI) / 180; }

function pathLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
  }
  return d;
}

function resample(pts, n) {
  const I       = pathLength(pts) / (n - 1);
  let   D       = 0;
  const newPts  = [{ ...pts[0] }];

  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    if (D + d >= I) {
      const qx = pts[i-1].x + ((I - D) / d) * (pts[i].x - pts[i-1].x);
      const qy = pts[i-1].y + ((I - D) / d) * (pts[i].y - pts[i-1].y);
      const q  = { x: qx, y: qy };
      newPts.push(q);
      pts = [q, ...pts.slice(i)];
      i = 0;
      D = 0;
    } else {
      D += d;
    }
  }

  if (newPts.length === n - 1) {
    newPts.push({ ...pts[pts.length - 1] });
  }
  return newPts;
}

function indicativeAngle(pts) {
  const c = centroid(pts);
  return Math.atan2(c.y - pts[0].y, c.x - pts[0].x);
}

function rotateBy(pts, radians) {
  const c   = centroid(pts);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return pts.map((p) => ({
    x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
    y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
  }));
}

function scaleTo(pts, size) {
  const box  = boundingBox(pts);
  return pts.map((p) => ({
    x: p.x * (size / box.width),
    y: p.y * (size / box.height)
  }));
}

function translateTo(pts, pt) {
  const c = centroid(pts);
  return pts.map((p) => ({
    x: p.x + pt.x - c.x,
    y: p.y + pt.y - c.y,
  }));
}

function centroid(pts) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: cx, y: cy };
}

function boundingBox(pts) {
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function pathDistance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    d += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  }
  return d / a.length;
}

function distanceAtAngle(pts, tmpl, radians) {
  const rotated = rotateBy(pts, radians);
  return pathDistance(rotated, tmpl.points);
}

function distanceAtBestAngle(pts, tmpl, a, b, threshold) {
  let x1 = PHI * a + (1 - PHI) * b;
  let f1 = distanceAtAngle(pts, tmpl, x1);
  let x2 = (1 - PHI) * a + PHI * b;
  let f2 = distanceAtAngle(pts, tmpl, x2);

  while (Math.abs(b - a) > threshold) {
    if (f1 < f2) {
      b = x2; x2 = x1; f2 = f1;
      x1 = PHI * a + (1 - PHI) * b;
      f1 = distanceAtAngle(pts, tmpl, x1);
    } else {
      a = x1; x1 = x2; f1 = f2;
      x2 = (1 - PHI) * a + PHI * b;
      f2 = distanceAtAngle(pts, tmpl, x2);
    }
  }
  return Math.min(f1, f2);
}


function normalise(strokes) {
  const flat = strokes.flat();
  let   pts  = resample(flat, NUM_POINTS);
  const radians = indicativeAngle(pts);
  pts = rotateBy(pts, -radians);
  pts = scaleTo(pts, SQUARE_SIZE);
  pts = translateTo(pts, ORIGIN);
  return pts;
}


class Template {
  constructor(name, strokes) {
    this.name   = name;
    this.points = normalise(strokes);
  }
}


export class DollarRecognizer {
  constructor() {
    this.templates = [];
  }

  /**
   * @param {string}   name   
   * @param {Array}    strokes 
   */
  
  addTemplate(name, strokes) {
    this.templates.push(new Template(name, strokes));
  }

  /**
   * @param {Array}  strokes
   * @returns {{ name: string, score: number } | null}
   */
  recognize(strokes) {
    if (this.templates.length === 0) return null;

    const pts  = normalise(strokes);
    let   best = Infinity;
    let   name = null;

    for (const tmpl of this.templates) {
      const d = distanceAtBestAngle(pts, tmpl, -ANGLE_RANGE, ANGLE_RANGE, ANGLE_PREC);
      if (d < best) {
        best = d;
        name = tmpl.name;
      }
    }

    const score = 1 - best / HALF_DIAG;
    return { name, score: Math.max(0, score) };
  }
}