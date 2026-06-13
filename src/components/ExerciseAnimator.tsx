import { useEffect, useRef, useState } from "react";
import { Play, Pause, Info, Flame, RotateCcw } from "lucide-react";

interface ExerciseAnimatorProps {
  exerciseName: string;
}

// Helper to draw a 3D weight plate in perspective
function draw3DPlate(
  ctx: CanvasRenderingContext2D,
  x: number, // center of the front face
  y: number, // center of the front face
  radius: number, // major radius of the plate
  thickness: number, // thickness along the bar axis
  barAngle: number, // angle of the bar in radians
  color: string,
  label: string,
  isRightSide: boolean
) {
  const squash = 0.35; // perspective squash factor
  const rx = radius * squash;
  const ry = radius;
  const rotation = barAngle;

  // Extrusion vector (outwards along the bar)
  const dir = isRightSide ? 1 : -1;
  const dx = thickness * Math.cos(barAngle) * dir;
  const dy = thickness * Math.sin(barAngle) * dir;

  // 1. Draw the extrusion (3D side shell)
  // We stack ellipses from back to front to create a perfect solid cylinder
  const steps = Math.max(5, thickness);
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const px = x - dx * t;
    const py = y - dy * t;
    
    if (i === steps) {
      // Dark back face edge
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    } else {
      // Shaded side color (blend base color with black/shadow)
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = 1;
    }
    
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, rotation, 0, 2 * Math.PI);
    ctx.fill();
    if (i < steps && i > 0) {
      ctx.stroke();
    }
  }

  // 2. Draw front face outer rim highlight
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // 3. Draw recessed inner plate body
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.85, ry * 0.85, rotation, 0, 2 * Math.PI);
  ctx.fill();

  // 4. Draw center silver/chrome hub
  const hubRadius = radius * 0.28;
  const hubRx = hubRadius * squash;
  const hubRy = hubRadius;
  
  const gradient = ctx.createLinearGradient(x - hubRx, y - hubRy, x + hubRx, y + hubRy);
  gradient.addColorStop(0, "#cbd5e1"); // light steel
  gradient.addColorStop(0.5, "#64748b"); // slate steel
  gradient.addColorStop(1, "#94a3b8"); // medium steel
  
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, hubRx, hubRy, rotation, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  // Center hole (sleeve)
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(x, y, hubRx * 0.45, hubRy * 0.45, rotation, 0, 2 * Math.PI);
  ctx.fill();

  // 5. Draw weight label in perspective
  if (radius > 12) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(squash, 1.0);
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Draw label above and below the center hub
    ctx.fillText(label, 0, -radius * 0.52);
    ctx.fillText(label, 0, radius * 0.52);
    
    ctx.restore();
  }
}

// Helper to draw a 3D hexagonal head in local coordinates
function draw3DHexHead(
  ctx: CanvasRenderingContext2D,
  r: number, // radius of the hexagon
  thickness: number, // length of the hex head
  squash: number, // perspective squash (e.g. 0.4)
  color: string, // primary color (e.g. "#1e293b" for black rubber)
  label: string,
  isLeft: boolean
) {
  const dir = isLeft ? 1 : -1;
  const ext = thickness * dir;

  // Vertices helper
  const getVerts = (ox: number) => {
    const verts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      verts.push({
        x: ox + Math.cos(angle) * r * squash,
        y: Math.sin(angle) * r,
      });
    }
    return verts;
  };

  const backVerts = getVerts(-ext);
  const frontVerts = getVerts(0);

  // 1. Draw back face for solidity
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.beginPath();
  ctx.moveTo(backVerts[0].x, backVerts[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(backVerts[i].x, backVerts[i].y);
  ctx.closePath();
  ctx.fill();

  // 2. Draw side facets with shading
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const midY = (frontVerts[i].y + frontVerts[next].y) / 2;
    
    // Light from top: top facets are lighter, bottom facets are darker
    const rPart = Math.floor(30 + (0.35 - midY / r * 0.35) * 110);
    const gPart = Math.floor(41 + (0.35 - midY / r * 0.35) * 110);
    const bPart = Math.floor(59 + (0.35 - midY / r * 0.35) * 110);
    ctx.fillStyle = `rgb(${rPart}, ${gPart}, ${bPart})`;

    ctx.beginPath();
    ctx.moveTo(frontVerts[i].x, frontVerts[i].y);
    ctx.lineTo(frontVerts[next].x, frontVerts[next].y);
    ctx.lineTo(backVerts[next].x, backVerts[next].y);
    ctx.lineTo(backVerts[i].x, backVerts[i].y);
    ctx.closePath();
    ctx.fill();

    // Subtle edge lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // 3. Draw the front face
  ctx.fillStyle = color;
  ctx.strokeStyle = "#2e3a4e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frontVerts[0].x, frontVerts[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(frontVerts[i].x, frontVerts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Highlight front face edges
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frontVerts[3].x, frontVerts[3].y);
  ctx.lineTo(frontVerts[4].x, frontVerts[4].y);
  ctx.lineTo(frontVerts[5].x, frontVerts[5].y);
  ctx.stroke();

  // 4. Draw center weight label
  if (r > 6) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);
  }
}

// Helper to draw a 3D dumbbell
function draw3DDumbbell(
  ctx: CanvasRenderingContext2D,
  x: number, // center of the dumbbell
  y: number,
  width: number, // length of the handle
  height: number, // hex head diameter
  angle: number, // rotation angle (radians)
  weightLabel: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const squash = 0.45; // perspective squash
  const headRadius = height / 2;
  const headThickness = width * 0.28;

  // 1. Draw the steel handle bar
  const handleGrad = ctx.createLinearGradient(0, -2, 0, 2);
  handleGrad.addColorStop(0, "#cbd5e1");
  handleGrad.addColorStop(0.5, "#94a3b8");
  handleGrad.addColorStop(1, "#475569");
  ctx.strokeStyle = handleGrad;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(-width / 2, 0);
  ctx.lineTo(width / 2, 0);
  ctx.stroke();

  // Inner chrome collars
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-width / 2 + 1, 0);
  ctx.lineTo(-width / 2 + 3, 0);
  ctx.moveTo(width / 2 - 3, 0);
  ctx.lineTo(width / 2 - 1, 0);
  ctx.stroke();

  // 2. Draw Left Hex Head
  ctx.save();
  ctx.translate(-width / 2, 0);
  draw3DHexHead(ctx, headRadius, headThickness, squash, "#1e293b", weightLabel, true);
  ctx.restore();

  // 3. Draw Right Hex Head
  ctx.save();
  ctx.translate(width / 2, 0);
  draw3DHexHead(ctx, headRadius, headThickness, squash, "#1e293b", weightLabel, false);
  ctx.restore();

  ctx.restore();
}

// Helper to draw a 3D weight stack (pulley system)
function draw3DWeightStack(
  ctx: CanvasRenderingContext2D,
  x: number, // center of stack
  y: number, // top resting position
  width: number,
  plateCount: number,
  selectedCount: number,
  liftProgress: number
) {
  const plateHeight = 5.5;
  const gap = 1.2;
  
  // Draw guide rods
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Left rod
  ctx.moveTo(x - width / 3, y - 10);
  ctx.lineTo(x - width / 3, y + plateCount * (plateHeight + gap) + 5);
  // Right rod
  ctx.moveTo(x + width / 3, y - 10);
  ctx.lineTo(x + width / 3, y + plateCount * (plateHeight + gap) + 5);
  ctx.stroke();

  // Draw central selector rod
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + plateCount * (plateHeight + gap));
  ctx.stroke();

  // Draw plates
  for (let i = 0; i < plateCount; i++) {
    const isLifted = i < selectedCount;
    const dy = isLifted ? -liftProgress : 0;
    const plateY = y + i * (plateHeight + gap) + dy;

    // Plate body
    ctx.fillStyle = isLifted ? "#1e293b" : "#334155";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 0.8;
    
    // Front face
    ctx.fillRect(x - width / 2, plateY, width, plateHeight);
    ctx.strokeRect(x - width / 2, plateY, width, plateHeight);

    // Bevel top highlight
    ctx.fillStyle = isLifted ? "#334155" : "#475569";
    ctx.fillRect(x - width / 2, plateY, width, 1.2);

    // Selection pin
    if (i === selectedCount - 1) {
      ctx.fillStyle = "#f59e0b"; // golden pin
      ctx.beginPath();
      ctx.arc(x, plateY + plateHeight / 2, 2.2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, plateY + plateHeight / 2, 4, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
}

const GRIP_AND_SAFETY_GUIDELINES: Record<string, { gripType: string; gripWidth: string; wrists: string; tips: string[] }> = {
  "bench press": {
    gripType: "Prono (Palmas hacia el frente, rodeando la barra)",
    gripWidth: "Ligeramente más ancho que los hombros (marcas de la barra)",
    wrists: "Muñecas rectas y neutras. Evitar que la barra doble la muñeca hacia atrás.",
    tips: [
      "Los codos deben bajar en un ángulo de ~45° respecto al torso (forma de flecha, evita codos a 90°).",
      "Apoya los pies firmemente en el suelo y mantén los glúteos pegados a la banca.",
      "Retrae las escápulas (junta los hombros atrás) antes de iniciar el descenso."
    ]
  },
  "squat": {
    gripType: "Prono (Dedos envolviendo firmemente la barra)",
    gripWidth: "Estrecho (lo suficiente para activar la espalda alta y crear un 'estante' muscular)",
    wrists: "Muñecas neutras y rectas. Codos apuntando hacia abajo y sutilmente hacia atrás.",
    tips: [
      "Apoya la barra en los trapecios altos (evita apoyarla directo en el hueso cervical del cuello).",
      "Inicia el descenso empujando la cadera hacia atrás (bisagra de cadera), luego dobla rodillas.",
      "Mantén el pecho elevado y las rodillas alineadas en dirección a la punta de tus pies."
    ]
  },
  "pulldown": {
    gripType: "Prono (Palmas al frente)",
    gripWidth: "Ancho (más allá del ancho de hombros, en los extremos de la barra)",
    wrists: "Alineadas en prolongación del antebrazo. Mantener agarre fuerte.",
    tips: [
      "Lleva la barra hacia tu clavícula superior, abriendo el pecho; nunca por detrás del cuello.",
      "Tira usando los codos y dorsales, sintiendo cómo se juntan tus escápulas atrás.",
      "Mantén el torso fijo, sin balancear la espalda hacia atrás al jalar."
    ]
  },
  "row": {
    gripType: "Prono (Palmas hacia abajo) para mayor activación de espalda alta",
    gripWidth: "Ancho de hombros",
    wrists: "Rectas y firmes. Evita torcer o flexionar la muñeca bajo tensión.",
    tips: [
      "Espalda totalmente recta, paralela o a 45° del suelo (bisagra de cadera activa).",
      "Lleva la barra hacia tu ombligo/abdomen inferior, rozando los codos contra las costillas.",
      "Mantén la cabeza alineada con la columna (cuello neutro), mirando al suelo y adelante."
    ]
  },
  "shoulder press": {
    gripType: "Prono o Semi-prono (Mancuernas en ángulo diagonal)",
    gripWidth: "Ligeramente superior al ancho de hombros",
    wrists: "Muñecas alineadas de forma estricta sobre los codos en dirección vertical.",
    tips: [
      "Evita arquear excesivamente la espalda baja. Activa el abdomen y glúteos para estabilidad.",
      "Empuja las pesas verticalmente hasta estirar brazos sin chocar las mancuernas arriba.",
      "Controla la fase de bajada hasta la altura de la barbilla o parte superior de los hombros."
    ]
  },
  "leg press": {
    gripType: "Sujeción lateral de manijas del asiento para fijar cadera",
    gripWidth: "Pies separados al ancho de hombros y caderas",
    wrists: "N/A",
    tips: [
      "Nunca bloquees o estires completamente las rodillas en la extensión (evita hiperextensión).",
      "Baja controladamente hasta que las rodillas queden en ángulo de 90° sin levantar la cadera del respaldo.",
      "Distribuye y empuja la fuerza a través de los talones y mediopié, no con las puntas."
    ]
  },
  "running": {
    gripType: "N/A (Manos relajadas, codos flexionados a 90°)",
    gripWidth: "N/A",
    wrists: "Manos semi-abiertas sin tensar los puños",
    tips: [
      "Mantén la mirada al frente (cuello neutro) y los hombros sueltos y abajo.",
      "Aterriza con la parte media del pie (mediopié) debajo del centro de gravedad de tu cuerpo.",
      "Mantén una zancada corta e incrementa la frecuencia de pasos para reducir impacto."
    ]
  },
  "bicep curl": {
    gripType: "Supino (Palmas hacia arriba envolviendo las mancuernas)",
    gripWidth: "Ancho de hombros",
    wrists: "Muñecas rígidas y neutras. No ayudes doblando la muñeca al subir.",
    tips: [
      "Mantén los codos pegados a las costillas y fijos en esa posición en todo momento.",
      "Evita balancear el torso o impulsarte echando los hombros hacia adelante.",
      "Controla el descenso de la mancuerna de forma lenta para maximizar el estímulo del bíceps."
    ]
  }
};

export default function ExerciseAnimator({ exerciseName }: ExerciseAnimatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [repCount, setRepCount] = useState(0);
  const [targetMuscles, setTargetMuscles] = useState<string[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const cycleRef = useRef<number>(0);

  // Determine active muscle groups based on the exercise
  useEffect(() => {
    let muscles: string[] = ["Cuerpo Completo"];
    const name = exerciseName.toLowerCase();
    if (name.includes("bench press") || name.includes("press bench") || name.includes("dips") || name.includes("push-ups")) {
      muscles = ["Pectoral Grande", "Tríceps", "Hombro Anterior"];
    } else if (name.includes("squat") || name.includes("leg press") || name.includes("extensions") || name.includes("sentadilla")) {
      muscles = ["Cuádriceps", "Glúteos", "Núcleo (Core)"];
    } else if (name.includes("deadlift") || name.includes("leg curls")) {
      muscles = ["Isquiotibiales (Femorales)", "Glúteo Mayor", "Erectores Espinales"];
    } else if (name.includes("row") || name.includes("pulldown") || name.includes("pull-ups") || name.includes("remo") || name.includes("dominadas")) {
      muscles = ["Dorsal Ancho", "Trapecios", "Bíceps Braquial"];
    } else if (name.includes("shoulder") || name.includes("lateral raises") || name.includes("press hombro")) {
      muscles = ["Deltoides (Hombros)", "Trapecio Superior"];
    } else if (name.includes("curl") || name.includes("pushdown") || name.includes("arms")) {
      muscles = ["Bíceps", "Tríceps", "Antebrazos"];
    } else if (name.includes("calf")) {
      muscles = ["Gastronemio (Pantorrilla)", "Sóleo"];
    } else if (name.includes("lunge")) {
      muscles = ["Cuádriceps", "Isquiotibiales", "Glúteo"];
    } else {
      muscles = ["Aeróbico", "Resistencia Cardiovascular", "Piernas"];
    }
    setTargetMuscles(muscles);
    setRepCount(0);
    cycleRef.current = 0;
  }, [exerciseName]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setRepCount(0);
    cycleRef.current = 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localCycle = cycleRef.current;
    let localRep = repCount;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2 - 10;

      // Clear canvas with elegant dark grid backing
      ctx.fillStyle = "#0f172a"; 
      ctx.fillRect(0, 0, width, height);

      // Grid backing in perspective
      ctx.strokeStyle = "#1e293b"; 
      ctx.lineWidth = 1;
      for (let i = 20; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 20; j < height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // Draw lab scanner circle overlay
      ctx.strokeStyle = "rgba(56, 189, 248, 0.04)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 15, 85, 0, 2 * Math.PI);
      ctx.stroke();

      if (isPlaying) {
        localCycle += 0.015;
        cycleRef.current = localCycle;

        // Detect full repetition cycle
        const currentRepCount = Math.floor(localCycle / (Math.PI * 2));
        if (currentRepCount > localRep) {
          localRep = currentRepCount;
          setRepCount(localRep);
        }
      }

      // Phase control by sine wave (0 to 1)
      const phase = Math.sin(localCycle);
      const normalizedPhase = (phase + 1) / 2;
      const name = exerciseName.toLowerCase();

      // Cybernetic Glow Colors
      const colorMuscleGlow = "rgba(249, 115, 22, 0.85)"; 

      // 3D OBLIQUE PROJECTION ENGINE
      const project = (x3d: number, y3d: number, z3d: number) => {
        const alpha = -Math.PI / 6; // 30 degrees tilt for depth
        const depthScale = 0.45;    // foreshortening factor for Z axis
        const screenX = cx + x3d + z3d * Math.cos(alpha) * depthScale;
        const screenY = cy + y3d + z3d * Math.sin(alpha) * depthScale;
        const scale = 1 - z3d * 0.0016; // perspective sizing
        return { x: screenX, y: screenY, scale };
      };

      // Helper to draw postural gaze visor (neck safety indicator)
      const drawGazeVisor = (hx: number, hy: number, gazeAngle: number, isRef: boolean) => {
        if (isRef) return; 
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(gazeAngle);
        
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
        ctx.beginPath();
        ctx.moveTo(3, -3);
        ctx.lineTo(11, -1);
        ctx.lineTo(8, 3);
        ctx.lineTo(2, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(10, -1, 1.2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      };

      // Helper to draw pulsing joints
      const drawJoint = (x: number, y: number, active: boolean, isRef: boolean) => {
        const pulse = active ? 1 + 0.15 * Math.sin(localCycle * 6) : 1;
        const radius = (active ? 4.2 : 3.2) * pulse;
        ctx.fillStyle = active ? "#f97316" : "#38bdf8";
        
        if (!isRef) {
          ctx.shadowColor = active ? "#f97316" : "#38bdf8";
          ctx.shadowBlur = active ? 8 : 4;
        }
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0; 
      };

      // Helper to draw muscles under stress (neon plasma core technique)
      const drawActiveMuscle = (x1: number, y1: number, x2: number, y2: number, activation: number, isRef: boolean) => {
        if (activation <= 0.15) return;
        ctx.save();
        ctx.lineCap = "round";
        
        // Outer plasma glow
        ctx.strokeStyle = colorMuscleGlow;
        ctx.lineWidth = 9 * activation;
        if (!isRef) {
          ctx.shadowColor = "#ff3c00";
          ctx.shadowBlur = 10 * activation;
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Inner glowing core
        ctx.strokeStyle = "#fff2ec";
        ctx.lineWidth = 2.2 * activation;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        ctx.restore();
      };

      // Draw a bone segment in 3D (handles depth-based color/transparency styling)
      const drawBone = (p1: {x: number, y: number}, p2: {x: number, y: number}, isFarSide: boolean, isRef: boolean) => {
        ctx.strokeStyle = isFarSide 
          ? (isRef ? "rgba(2, 132, 199, 0.15)" : "rgba(2, 132, 199, 0.45)") 
          : (isRef ? "rgba(56, 189, 248, 0.25)" : "#38bdf8");
        ctx.lineWidth = isFarSide ? 3.5 : 5;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      };

      // Main Scene Drawer using 3D coordinates
      const drawScene = (isRef: boolean) => {
        const colorHead = isRef ? "rgba(248, 250, 252, 0.4)" : "#f8fafc";
        const colorBench = isRef ? "rgba(71, 85, 105, 0.25)" : "#475569";
        const colorRack = isRef ? "rgba(51, 65, 85, 0.2)" : "#334155";
        const colorTorso = isRef ? "rgba(56, 189, 248, 0.25)" : "#38bdf8";

        if (name.includes("bench press") || name.includes("press bench")) {
          // --- PECHO: PRESS BANCA (VISTA 3D TRES CUARTOS) ---
          const barY = 5 + (normalizedPhase * 32); // moves down to chest
          const bend = (1 - normalizedPhase) * 3.2; // physical load bend at chest

          // Project Equipment (Bench and Rack uprights in Z depth space)
          const bBack = project(-55, 30, 0);
          const bFront = project(55, 30, 0);
          
          const rUpL_Bottom = project(-22, 30, -32);
          const rUpL_Top = project(-22, -35, -32);
          const rUpR_Bottom = project(-22, 30, 32);
          const rUpR_Top = project(-22, -35, 32);

          // Draw far-side rack upright
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(rUpR_Bottom.x, rUpR_Bottom.y);
          ctx.lineTo(rUpR_Top.x, rUpR_Top.y);
          ctx.stroke();

          // Draw bench cushion
          ctx.strokeStyle = colorBench;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(bBack.x, bBack.y);
          ctx.lineTo(bFront.x, bFront.y);
          ctx.stroke();
          
          // Bench legs
          ctx.lineWidth = 4;
          const bLeg1 = project(-35, 30, 0);
          const bLeg1_Floor = project(-35, 65, 0);
          const bLeg2 = project(35, 30, 0);
          const bLeg2_Floor = project(35, 65, 0);
          ctx.beginPath();
          ctx.moveTo(bLeg1.x, bLeg1.y);
          ctx.lineTo(bLeg1_Floor.x, bLeg1_Floor.y);
          ctx.moveTo(bLeg2.x, bLeg2.y);
          ctx.lineTo(bLeg2_Floor.x, bLeg2_Floor.y);
          ctx.stroke();

          // Project Body Joints lying on bench
          const head = project(-42, 18, 0);
          const shL = project(-25, 18, -13); // left shoulder (near)
          const shR = project(-25, 18, 13);  // right shoulder (far)
          const hpL = project(26, 20, -7);   // left hip (near)
          const hpR = project(26, 20, 7);    // right hip (far)
          
          const knL = project(32, 42, -22);  // knees
          const knR = project(32, 42, 22);
          const anL = project(22, 68, -26);  // ankles/feet on floor
          const rAnk = project(22, 68, 26);

          // Hand grip coordinates strictly aligned on the barbell path
          const haL = project(-22, barY + bend * 0.4, -26); // left hand grip (near)
          const haR = project(-22, barY + bend * 0.4, 26);  // right hand grip (far)

          // Elbows (flare out and down)
          const elL = project(-20 + (1 - normalizedPhase) * 10, 31 + (1 - normalizedPhase) * 10, -25);
          const elR = project(-20 + (1 - normalizedPhase) * 10, 31 + (1 - normalizedPhase) * 10, 25);

          const muscleActivation = 1 - normalizedPhase;

          // Draw Far Side Limbs (Right leg & Right arm)
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Barbell bar with load bend (DRAWN FIRST so it is behind near-side limbs and hand joints)
          const barLeft = project(-22, barY + bend, -65);
          const barRight = project(-22, barY + bend, 65);
          const barAngle = Math.atan2(barRight.y - barLeft.y, barRight.x - barLeft.x);

          ctx.strokeStyle = isRef ? "rgba(148, 163, 184, 0.3)" : "#cbd5e1";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(barLeft.x, barLeft.y);
          ctx.quadraticCurveTo((barLeft.x + barRight.x)/2, (barLeft.y + barRight.y)/2 - bend * 0.8, barRight.x, barRight.y);
          ctx.stroke();

          // 3D Plates in depth perspective (Olympic loaded: Red inner 25kg, Blue outer 20kg)
          draw3DPlate(ctx, barLeft.x, barLeft.y, 27 * barLeft.scale, 7.5 * barLeft.scale, barAngle, "#ef4444", "25", isRef);
          draw3DPlate(ctx, barLeft.x + 6 * Math.cos(barAngle), barLeft.y + 6 * Math.sin(barAngle), 23 * barLeft.scale, 6 * barLeft.scale, barAngle, "#3b82f6", "20", isRef);
          
          draw3DPlate(ctx, barRight.x, barRight.y, 27 * barRight.scale, 7.5 * barRight.scale, barAngle, "#ef4444", "25", isRef);
          draw3DPlate(ctx, barRight.x - 6 * Math.cos(barAngle), barRight.y - 6 * Math.sin(barAngle), 23 * barRight.scale, 6 * barRight.scale, barAngle, "#3b82f6", "20", isRef);

          // Spine & Hips (Torso)
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Draw Muscle Glows (Pectorals & Triceps)
          drawActiveMuscle(shL.x, shL.y, hpL.x - 10, hpL.y, muscleActivation * 0.9, isRef); // Pec
          drawActiveMuscle(shL.x, shL.y, elL.x, elL.y, muscleActivation * 0.7, isRef); // Tricep

          // Draw Near Side Limbs (Left leg & Left arm - drawn in front of the bar!)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Draw Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (Neck posture safety: look straight up)
          drawGazeVisor(head.x, head.y, -Math.PI / 2, isRef);

          // Draw Grip Nodes (Shows correct symmetric hold points - drawn ON TOP of the bar)
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);
          drawJoint(elL.x, elL.y, muscleActivation > 0.5, isRef);
          drawJoint(elR.x, elR.y, muscleActivation > 0.5, isRef);

          if (!isRef) {
            // Symmetrical grip safety alignment line
            ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(haL.x, haL.y);
            ctx.lineTo(haR.x, haR.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw alignment text
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("AGARRE PRONO SIMÉTRICO (ANCHO > HOMBROS)", (haL.x + haR.x)/2, (haL.y + haR.y)/2 - 12);
          }

          // Draw near-side rack upright
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(rUpL_Bottom.x, rUpL_Bottom.y);
          ctx.lineTo(rUpL_Top.x, rUpL_Top.y);
          ctx.lineTo(rUpL_Top.x + 4, rUpL_Top.y);
          ctx.stroke();

        } else if (name.includes("incline") && name.includes("press")) {
          // --- PECHO: PRESS INCLINADO CON MANCUERNAS (3D TRES CUARTOS) ---
          const pressScale = 1 - normalizedPhase; // 0 (extended) to 1 (lowered)

          // Draw incline bench
          ctx.strokeStyle = colorBench;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(project(28, 34, 0).x, project(28, 34, 0).y);
          ctx.lineTo(project(22, 34, 0).x, project(22, 34, 0).y); // seat
          ctx.lineTo(project(-28, 0, 0).x, project(-28, 0, 0).y); // backrest
          ctx.stroke();

          // Body joints
          const head = project(-24, 0, 0);
          const shL = project(-14, 10, -13);
          const shR = project(-14, 10, 13);
          const hpL = project(22, 32, -8);
          const hpR = project(22, 32, 8);
          const knL = project(28, 48, -14);
          const knR = project(28, 48, 14);
          const anL = project(24, 68, -16);
          const rAnk = project(24, 68, 16);

          // Hands holding dumbbells (perpendicular to 30-deg backrest)
          const haL = project(-14 - (1 - pressScale) * 16, 10 - (1 - pressScale) * 28, -18);
          const haR = project(-14 - (1 - pressScale) * 16, 10 - (1 - pressScale) * 28, 18);

          // Elbows flare down and back
          const elL = project(-8 + pressScale * 6, 20 + pressScale * 12, -22);
          const elR = project(-8 + pressScale * 6, 20 + pressScale * 12, 22);

          const muscleActivation = pressScale;

          // Draw Far Side limbs first
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Draw 3D Dumbbells (middle ground)
          draw3DDumbbell(ctx, haL.x, haL.y, 16 * haL.scale, 11 * haL.scale, -Math.PI / 6, "24");
          draw3DDumbbell(ctx, haR.x, haR.y, 16 * haR.scale, 11 * haR.scale, -Math.PI / 6, "24");

          // Torso
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Pectorals & Triceps)
          drawActiveMuscle(shL.x, shL.y, hpL.x, hpL.y, muscleActivation * 0.95, isRef);
          drawActiveMuscle(shL.x, shL.y, elL.x, elL.y, muscleActivation * 0.75, isRef);

          // Draw Near Side limbs (drawn in front of the dumbbells!)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Draw Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (look straight up-forward, perpendicular to incline)
          drawGazeVisor(head.x, head.y, -Math.PI / 6, isRef);

          // Draw Grip Nodes
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);
          drawJoint(elL.x, elL.y, muscleActivation > 0.5, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("PRESIÓN EN BANCO INCLINADO (30°)", (haL.x + haR.x)/2, Math.min(haL.y, haR.y) - 15);
          }

        } else if (name.includes("dips") || name.includes("push-ups") || name.includes("fondos") || name.includes("lagartijas")) {
          // --- EMPUJE: FONDOS EN PARALELAS (VISTA 3D) ---
          const dipScale = normalizedPhase; // 0 (extended, high) to 1 (bent, low)

          // Draw parallel bars (Z = -18 and Z = 18)
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 4;
          // Left bar
          ctx.beginPath();
          ctx.moveTo(project(-15, 24, -18).x, project(-15, 24, -18).y);
          ctx.lineTo(project(15, 24, -18).x, project(15, 24, -18).y);
          ctx.stroke();
          // Right bar
          ctx.beginPath();
          ctx.moveTo(project(-15, 24, 18).x, project(-15, 24, 18).y);
          ctx.lineTo(project(15, 24, 18).x, project(15, 24, 18).y);
          ctx.stroke();

          // Body joints
          const head = project(-dipScale * 4, -16 + dipScale * 18, 0);
          const shL = project(-dipScale * 4, -2 + dipScale * 18, -14);
          const shR = project(-dipScale * 4, -2 + dipScale * 18, 14);
          const hpL = project(-dipScale * 6, 36 + dipScale * 18, -10);
          const hpR = project(-dipScale * 6, 36 + dipScale * 18, 10);
          const knL = project(-18, 48 + dipScale * 18, -12);
          const knR = project(-18, 48 + dipScale * 18, 12);
          const anL = project(-12, 64 + dipScale * 18, -12);
          const rAnk = project(-12, 64 + dipScale * 18, 12);

          // Hands holding bars (fixed)
          const haL = project(0, 24, -18);
          const haR = project(0, 24, 18);

          // Elbows flare backwards
          const elL = project(-2 - dipScale * 16, 11 + dipScale * 7, -17);
          const elR = project(-2 - dipScale * 16, 11 + dipScale * 7, 17);

          const muscleActivation = dipScale;

          // Draw Far Side limbs first
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Spine
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Pecs & Triceps)
          drawActiveMuscle(shL.x, shL.y, hpL.x, hpL.y, muscleActivation * 0.9, isRef);
          drawActiveMuscle(shL.x, shL.y, elL.x, elL.y, muscleActivation * 0.8, isRef);

          // Draw Near Side limbs (in front of bars)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (look down-forward)
          drawGazeVisor(head.x, head.y, Math.PI / 10, isRef);

          // Draw grip highlights
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);
          drawJoint(elL.x, elL.y, muscleActivation > 0.5, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("INCLINACIÓN LEVE HACIA ADELANTE (FOCO PECHO)", (haL.x + haR.x)/2, 8);
          }

        } else if (name.includes("squat") || name.includes("sentadilla")) {
          // --- PIERNAS: SENTADILLAS (VISTA 3D TRES CUARTOS) ---
          const squatY = normalizedPhase * 35; // depth
          const bend = normalizedPhase * 3.5;  // bar flexes at bottom

          // Project Safety Rack Posts
          const postBL = project(-26, 68, -32);
          const postBL_Top = project(-26, -55, -32);
          const postBR = project(-26, 68, 32);
          const postBR_Top = project(-26, -55, 32);
          
          const postFL = project(25, 68, -32);
          const postFL_Top = project(25, -55, -32);
          const postFR = project(25, 68, 32);
          const postFR_Top = project(25, -55, 32);

          // Draw far-side rack components
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(postBR.x, postBR.y);
          ctx.lineTo(postBR_Top.x, postBR_Top.y);
          ctx.moveTo(postFR.x, postFR.y);
          ctx.lineTo(postFR_Top.x, postFR_Top.y);
          // Connecting safety rod
          ctx.moveTo(postBR.x, cy + 30);
          ctx.lineTo(postFR.x, cy + 30);
          ctx.stroke();

          // Body joints
          const head = project(-4, -36 + squatY, 0);
          const shL = project(-7, -22 + squatY, -14); // shoulders
          const shR = project(-7, -22 + squatY, 14);
          
          const hpL = project(-12 - squatY * 0.35, 14 + squatY, -14); // hips hinge back
          const hpR = project(-12 - squatY * 0.35, 14 + squatY, 14);
          
          const knL = project(-18 - squatY * 0.22, 44 + squatY * 0.22, -24); // knees push out
          const knR = project(-18 - squatY * 0.22, 44 + squatY * 0.22, 24);
          
          const anL = project(-4, 68, -20); // ankles/feet planted wide
          const rAnk = project(-4, 68, 20);

          // Hands grip on the bar (shoulder-width + 20px)
          const haL = project(-2, -24 + squatY, -30);
          const haR = project(-2, -24 + squatY, 30);
          const elL = project(-10, -10 + squatY, -22);
          const elR = project(-10, -10 + squatY, 22);

          const muscleActivation = normalizedPhase;

          // Draw Far Side limbs
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Barbell resting on back (DRAWN FIRST in perspective layers)
          const barLeft = project(-7, -22 + squatY + bend, -60);
          const barRight = project(-7, -22 + squatY + bend, 60);
          const barAngle = Math.atan2(barRight.y - barLeft.y, barRight.x - barLeft.x);

          ctx.strokeStyle = isRef ? "rgba(148, 163, 184, 0.3)" : "#cbd5e1";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(barLeft.x, barLeft.y);
          ctx.quadraticCurveTo((barLeft.x + barRight.x)/2, (barLeft.y + barRight.y)/2 - bend * 0.8, barRight.x, barRight.y);
          ctx.stroke();

          // 3D Bumper Plates
          draw3DPlate(ctx, barLeft.x, barLeft.y, 28 * barLeft.scale, 7.5 * barLeft.scale, barAngle, "#ef4444", "25", isRef);
          draw3DPlate(ctx, barLeft.x + 6 * Math.cos(barAngle), barLeft.y + 6 * Math.sin(barAngle), 24 * barLeft.scale, 6 * barLeft.scale, barAngle, "#3b82f6", "20", isRef);
          
          draw3DPlate(ctx, barRight.x, barRight.y, 28 * barRight.scale, 7.5 * barRight.scale, barAngle, "#ef4444", "25", isRef);
          draw3DPlate(ctx, barRight.x - 6 * Math.cos(barAngle), barRight.y - 6 * Math.sin(barAngle), 24 * barRight.scale, 6 * barRight.scale, barAngle, "#3b82f6", "20", isRef);

          // Torso
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Quads & Glutes)
          drawActiveMuscle(hpL.x, hpL.y, knL.x, knL.y, muscleActivation * 0.95, isRef);
          drawActiveMuscle(hpL.x, hpL.y, shL.x, shL.y, muscleActivation * 0.55, isRef); // spinal erect

          // Draw Near Side limbs (drawn in front of the bar!)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head (drawn in front of the bar!)
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (Neck posture safety: look straight forward)
          drawGazeVisor(head.x, head.y, 0, isRef);

          // Joints & Grip Highlights
          drawJoint(hpL.x, hpL.y, muscleActivation > 0.5, isRef);
          drawJoint(knL.x, knL.y, muscleActivation > 0.5, isRef);
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);

          if (!isRef) {
            ctx.strokeStyle = "rgba(34, 197, 94, 0.45)";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(haL.x, haL.y);
            ctx.lineTo(haR.x, haR.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("BARRA EN TRAPECIOS (CUELLO SALVO)", (haL.x + haR.x)/2, (haL.y + haR.y)/2 - 12);
          }

          // Draw near-side rack
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(postBL.x, postBL.y);
          ctx.lineTo(postBL_Top.x, postBL_Top.y);
          ctx.moveTo(postFL.x, postFL.y);
          ctx.lineTo(postFL_Top.x, postFL_Top.y);
          // Safety rod
          ctx.moveTo(postBL.x, cy + 30);
          ctx.lineTo(postFL.x, cy + 30);
          ctx.stroke();

        } else if (name.includes("deadlift") || name.includes("peso muerto")) {
          // --- PIERNAS: PESO MUERTO RUMANO (VISTA 3D HIP HINGE) ---
          const hingeScale = normalizedPhase; // 0 (standing) to 1 (fully bent)

          // Body joints
          const anL = project(-5, 68, -12);
          const rAnk = project(-5, 68, 12);
          const knL = project(-10, 42, -13);
          const knR = project(-10, 42, 13);
          
          // Hips push back
          const hpL = project(-12 - hingeScale * 18, 16 + hingeScale * 6, -10);
          const hpR = project(-12 - hingeScale * 18, 16 + hingeScale * 6, 10);

          // Shoulders go down and forward
          const shL = project(-8 + hingeScale * 18, -26 + hingeScale * 44, -13);
          const shR = project(-8 + hingeScale * 18, -26 + hingeScale * 44, 13);

          const head = project(-8 + hingeScale * 30, -40 + hingeScale * 52, 0);

          // Hands holding dumbbells hang vertically
          const haL = project(-8 + hingeScale * 18, 5 + hingeScale * 30, -14);
          const haR = project(-8 + hingeScale * 18, 5 + hingeScale * 30, 14);

          const elL = project(-8 + hingeScale * 18, -10 + hingeScale * 37, -13.5);
          const elR = project(-8 + hingeScale * 18, -10 + hingeScale * 37, 13.5);

          const muscleActivation = hingeScale;

          // Draw Far Side limbs first
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Draw 3D Dumbbells (middle ground)
          draw3DDumbbell(ctx, haL.x, haL.y, 16 * haL.scale, 11 * haL.scale, 0, "20");
          draw3DDumbbell(ctx, haR.x, haR.y, 16 * haR.scale, 11 * haR.scale, 0, "20");

          // Spine
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Isquiotibiales y Glúteos)
          drawActiveMuscle(hpL.x, hpL.y, knL.x, knL.y, muscleActivation * 0.95, isRef); // Hamstrings
          drawActiveMuscle(hpL.x, hpL.y, shL.x, shL.y, muscleActivation * 0.7, isRef); // Spinal Erectors

          // Draw Near Side limbs (in front of dumbbells)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (neck safety: look forward/down)
          drawGazeVisor(head.x, head.y, Math.PI / 6, isRef);

          // Draw grip highlights
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);
          drawJoint(knL.x, knL.y, muscleActivation > 0.5, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("BISAGRA DE CADERA (PIERNAS SEMIRRÍGIDAS)", (haL.x + haR.x)/2, 8);
          }

        } else if (name.includes("lunge") || name.includes("desplante")) {
          // --- PIERNAS: DESPLANTES CAMINADOS (VISTA 3D SPLIT STANCE) ---
          const lungeScale = normalizedPhase; // 0 (standing) to 1 (deepest lunge)

          // Feet planted in split stance
          const anL = project(24, 68, -12); // left foot forward
          const rAnk = project(-28, 68, 12); // right foot backward

          // Hips move down and slightly forward
          const hpL = project(-2 + lungeScale * 6, 14 + lungeScale * 24, -10);
          const hpR = project(-2 + lungeScale * 6, 14 + lungeScale * 24, 10);

          // Knees
          const knL = project(10 + lungeScale * 14, 41 - lungeScale * 3, -12); // forward knee bends to ~90
          const knR = project(-15 + lungeScale * 3, 41 + lungeScale * 19, 12); // back knee drops near floor

          // Shoulders move down vertically
          const shL = project(-2 + lungeScale * 6, -28 + lungeScale * 24, -13);
          const shR = project(-2 + lungeScale * 6, -28 + lungeScale * 24, 13);

          const head = project(-2 + lungeScale * 6, -42 + lungeScale * 24, 0);

          // Hands holding dumbbells hang vertically at sides
          const haL = project(-2 + lungeScale * 6, -2 + lungeScale * 24, -15);
          const haR = project(-2 + lungeScale * 6, -2 + lungeScale * 24, 15);

          const muscleActivation = lungeScale;

          // Draw Far Side limbs first
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);

          // Draw 3D Dumbbells (middle ground)
          draw3DDumbbell(ctx, haL.x, haL.y, 15 * haL.scale, 10 * haL.scale, 0, "15");
          draw3DDumbbell(ctx, haR.x, haR.y, 15 * haR.scale, 10 * haR.scale, 0, "15");

          // Spine
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Quads & Glutes)
          drawActiveMuscle(hpL.x, hpL.y, knL.x, knL.y, muscleActivation * 0.95, isRef);
          drawActiveMuscle(hpR.x, hpR.y, knR.x, knR.y, muscleActivation * 0.8, isRef);

          // Draw Near Side limbs
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (look straight ahead)
          drawGazeVisor(head.x, head.y, 0, isRef);

          // Draw joints
          drawJoint(anL.x, anL.y, false, isRef);
          drawJoint(rAnk.x, rAnk.y, false, isRef);
          drawJoint(knL.x, knL.y, muscleActivation > 0.5, isRef);
          drawJoint(knR.x, knR.y, muscleActivation > 0.5, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("DESPLANTE CON TALÓN APOYADO Y TORSO ERGUIDO", (haL.x + haR.x)/2, 8);
          }

        } else if (name.includes("leg curls") || name.includes("curl femoral")) {
          // --- PIERNAS: CURL FEMORAL ACOSTADO EN MÁQUINA (3D PRONO) ---
          const curlScale = normalizedPhase; // 0 (extended) to 1 (fully curled)

          // Draw prone leg curl bench
          ctx.strokeStyle = colorBench;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(project(-45, 34, 0).x, project(-45, 34, 0).y);
          ctx.lineTo(project(20, 26, 0).x, project(20, 26, 0).y);
          ctx.stroke();

          // Hips and knees
          const hpL = project(-10, 27, -8);
          const hpR = project(-10, 27, 8);
          const knL = project(-32, 31, -10);
          const knR = project(-32, 31, 10);
          const shL = project(15, 22, -10);
          const shR = project(15, 22, 10);
          const head = project(26, 16, 0);

          // Ankles (curling arc)
          const calfAngle = Math.PI - curlScale * (Math.PI / 1.7);
          const anL = project(-32 + Math.cos(calfAngle) * 22, 31 + Math.sin(calfAngle) * 22, -10);
          const rAnk = project(-32 + Math.cos(calfAngle) * 22, 31 + Math.sin(calfAngle) * 22, 10);

          // Hands holding handles
          const haL = project(25, 36, -12);
          const haR = project(25, 36, 12);
          const elL = project(18, 30, -11);
          const elR = project(18, 30, 11);

          const muscleActivation = curlScale;

          // Draw Far Side limbs first
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Draw machine pivot arm to ankles
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(project(-32, 31, -12).x, project(-32, 31, -12).y);
          ctx.lineTo(anL.x, anL.y);
          ctx.stroke();

          // Draw Roller Pad at ankles
          ctx.fillStyle = "#334155";
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(anL.x, anL.y, 6, 12, calfAngle + Math.PI/2, 0, 2*Math.PI);
          ctx.fill();
          ctx.stroke();

          // Torso
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Hamstrings)
          drawActiveMuscle(hpL.x, hpL.y, knL.x, knL.y, muscleActivation * 0.95, isRef);

          // Draw Near Side limbs
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
          ctx.fill();

          // Draw joints
          drawJoint(knL.x, knL.y, muscleActivation > 0.5, isRef);
          drawJoint(anL.x, anL.y, false, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("PELVIS PEGADA AL BANCO (AISLAMIENTO EXCENTRICO)", (haL.x + haR.x)/2, 8);
          }

        } else if (name.includes("extensions") || name.includes("extensiones")) {
          // --- PIERNAS: EXTENSIONES DE PIERNA SENTADO (3D AISLAMIENTO) ---
          const extScale = normalizedPhase; // 0 (bent) to 1 (extended horizontal)

          // Draw leg extension seat
          ctx.strokeStyle = colorBench;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(project(-15, 34, 0).x, project(-15, 34, 0).y);
          ctx.lineTo(project(12, 34, 0).x, project(12, 34, 0).y); // seat bottom
          ctx.lineTo(project(-15, 2, 0).x, project(-15, 2, 0).y);   // seat back
          ctx.stroke();

          // Body joints
          const hpL = project(-14, 32, -8);
          const hpR = project(-14, 32, 8);
          const shL = project(-14, 4, -10);
          const shR = project(-14, 4, 10);
          const knL = project(12, 32, -10);
          const knR = project(12, 32, 10);
          const head = project(-14, -8, 0);

          // Ankles (extension arc)
          const calfAngle = -Math.PI/2 + extScale * (Math.PI/2);
          const anL = project(12 + Math.cos(calfAngle) * 26, 32 - Math.sin(calfAngle) * 26, -10);
          const rAnk = project(12 + Math.cos(calfAngle) * 26, 32 - Math.sin(calfAngle) * 26, 10);

          // Hands holding seat handles
          const haL = project(4, 36, -13);
          const haR = project(4, 36, 13);

          const muscleActivation = extScale;

          // Draw Far Side limbs first
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);

          // Draw machine pivot arm to ankles
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(project(12, 32, -12).x, project(12, 32, -12).y);
          ctx.lineTo(anL.x, anL.y);
          ctx.stroke();

          // Draw Roller Pad at ankles
          ctx.fillStyle = "#334155";
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(anL.x, anL.y, 6, 12, calfAngle, 0, 2*Math.PI);
          ctx.fill();
          ctx.stroke();

          // Torso
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Quads)
          drawActiveMuscle(hpL.x, hpL.y, knL.x, knL.y, muscleActivation * 0.95, isRef);

          // Draw Near Side limbs
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (look straight forward)
          drawGazeVisor(head.x, head.y, 0, isRef);

          // Draw joints
          drawJoint(knL.x, knL.y, muscleActivation > 0.5, isRef);
          drawJoint(anL.x, anL.y, false, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("MANTENER CONTRACCIÓN DE 1s ARRIBA (CUÁDRICEPS)", (haL.x + haR.x)/2, 8);
          }

        } else if (name.includes("pulldown") || name.includes("pull-ups") || name.includes("dominadas")) {
          // --- JALÓN AL PECHO / DOMINADAS (VISTA 3D) ---
          const isPullups = name.includes("pull-ups") || name.includes("dominadas");
          const verticalMove = isPullups ? (1 - normalizedPhase) * 35 : 0; 
          const barPull = isPullups ? 0 : normalizedPhase * 35; 

          // Pulley frame
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          // Top frame
          const topBack = project(-18, -48, 0);
          const topFront = project(8, -48, 0);
          ctx.moveTo(topBack.x, topBack.y);
          ctx.lineTo(topFront.x, topFront.y);
          // Upright column
          const colBottom = project(-18, 68, 0);
          ctx.moveTo(topBack.x, topBack.y);
          ctx.lineTo(colBottom.x, colBottom.y);
          ctx.stroke();

          // 3D Weight Stack (sincronizado con poleas)
          if (!isPullups) {
            const liftProgress = barPull * 0.72;
            const stackPos = project(-18, 5, -12);
            draw3DWeightStack(ctx, stackPos.x, stackPos.y, 22 * stackPos.scale, 10, 6, liftProgress);
          }

          if (!isPullups) {
            // Seating pad
            const seatL = project(-22, 34, -14);
            const seatR = project(5, 34, 14);
            ctx.fillStyle = isRef ? "rgba(30, 41, 59, 0.3)" : "#1e293b";
            ctx.strokeStyle = colorBench;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(seatL.x, seatL.y);
            ctx.lineTo(project(5, 34, -14).x, project(5, 34, -14).y);
            ctx.lineTo(seatR.x, seatR.y);
            ctx.lineTo(project(-22, 34, 14).x, project(-22, 34, 14).y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          const headY = -28 + verticalMove;
          const head = project(-6, headY, 0);
          
          const shL = project(-6, -14 + verticalMove, -15);
          const shR = project(-6, -14 + verticalMove, 15);
          
          const hpL = project(-10, 34 + verticalMove, -10);
          const hpR = project(-10, 34 + verticalMove, 10);
          
          const knL = project(-18, 30 + verticalMove, -14);
          const knR = project(-18, 30 + verticalMove, 14);
          const anL = project(-12, 68, -15);
          const rAnk = project(-12, 68, 15);

          // Pulley bar positions
          const barY = -45 + barPull;
          const barLeft = project(0, barY, -52);
          const barRight = project(0, barY, 52);
          const barAngle = Math.atan2(barRight.y - barLeft.y, barRight.x - barLeft.x);

          // Hands grip bar (wide grip)
          const haL = project(0, barY, -40);
          const haR = project(0, barY, 40);

          // Elbows pull down
          const elL = project(-8 + normalizedPhase * 8, -5 + normalizedPhase * 16, -20);
          const elR = project(-8 + normalizedPhase * 8, -5 + normalizedPhase * 16, 20);

          const muscleActivation = normalizedPhase;

          // Draw Far Side limbs
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Draw pulldown bar (DRAWN BEFORE near-side limbs for depth wrapping)
          ctx.strokeStyle = isRef ? "rgba(148, 163, 184, 0.3)" : "#cbd5e1";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(barLeft.x, barLeft.y);
          ctx.lineTo(barRight.x, barRight.y);
          ctx.stroke();

          // Spine
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Lats activation
          drawActiveMuscle((shL.x + shR.x)/2, (shL.y + shR.y)/2 + 5, hpL.x, hpL.y, muscleActivation * 0.9, isRef);

          // Draw Near Side limbs (drawn in front of the bar!)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (Neck looking up towards pulley)
          drawGazeVisor(head.x, head.y, -3 * Math.PI / 4, isRef);

          // Grip nodes (drawn on top of the bar)
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);

          if (!isRef) {
            ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(haL.x, haL.y);
            ctx.lineTo(haR.x, haR.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("AGARRE ABIERTO PRONO (ESCAPULAS RETRAIDAS)", (haL.x + haR.x)/2, (haL.y + haR.y)/2 - 12);
          }

        } else if (name.includes("row") || name.includes("remo")) {
          // --- TIRÓN: REMO INCLINADO (VISTA 3D TRES CUARTOS) ---
          const barY = 32 - normalizedPhase * 25; // bar pulls up to lower chest
          
          // Joint positions
          const head = project(24, -8, 0);
          const shL = project(15, 0, -13);
          const shR = project(15, 0, 13);
          
          const hpL = project(-18, 22, -10);
          const hpR = project(-18, 22, 10);
          
          const knL = project(-12, 46, -14);
          const knR = project(-12, 46, 14);
          
          const anL = project(-4, 68, -15);
          const rAnk = project(-4, 68, 15);

          // Barbell transverse along Z-axis (correcting orthogonal error)
          const barLeft = project(10, barY, -52);
          const barRight = project(10, barY, 52);
          const barAngle = Math.atan2(barRight.y - barLeft.y, barRight.x - barLeft.x);

          // Hands grip at shoulder-width (Z = -18 and 18)
          const haL = project(10, barY, -18);
          const haR = project(10, barY, 18);

          // Elbows pull back
          const elL = project(0 - normalizedPhase * 10, 15 - normalizedPhase * 23, -20);
          const elR = project(0 - normalizedPhase * 10, 15 - normalizedPhase * 23, 20);

          const muscleActivation = normalizedPhase;

          // Draw Far Side limbs
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Draw Barbell & Plates first (for correct depth wrapping)
          ctx.strokeStyle = isRef ? "rgba(148, 163, 184, 0.3)" : "#cbd5e1";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(barLeft.x, barLeft.y);
          ctx.lineTo(barRight.x, barRight.y);
          ctx.stroke();

          // 3D Plates (Loaded symmetrically)
          draw3DPlate(ctx, barLeft.x, barLeft.y, 25 * barLeft.scale, 7 * barLeft.scale, barAngle, "#ef4444", "20", isRef);
          draw3DPlate(ctx, barLeft.x + 5 * Math.cos(barAngle), barLeft.y + 5 * Math.sin(barAngle), 21 * barLeft.scale, 5 * barLeft.scale, barAngle, "#3b82f6", "15", isRef);
          
          draw3DPlate(ctx, barRight.x, barRight.y, 25 * barRight.scale, 7.5 * barRight.scale, barAngle, "#ef4444", "20", isRef);
          draw3DPlate(ctx, barRight.x - 5 * Math.cos(barAngle), barRight.y - 5 * Math.sin(barAngle), 21 * barRight.scale, 5 * barRight.scale, barAngle, "#3b82f6", "15", isRef);

          // Spine
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Active muscle glow (Lats)
          drawActiveMuscle((shL.x + shR.x)/2, (shL.y + shR.y)/2, hpL.x, hpL.y, muscleActivation * 0.95, isRef);

          // Draw Near Side limbs (drawn in front of the bar!)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (Neck safe angle: look down-forward)
          drawGazeVisor(head.x, head.y, Math.PI / 8, isRef);

          // Grip highlights (on top of the bar)
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);
          drawJoint(elL.x, elL.y, muscleActivation > 0.5, isRef);

          if (!isRef) {
            ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(haL.x, haL.y);
            ctx.lineTo(haR.x, haR.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("AGARRE PRONO (ANCHO DE HOMBROS)", (haL.x + haR.x)/2, (haL.y + haR.y)/2 - 12);
          }

        } else if (name.includes("shoulder press") || name.includes("press hombro") || name.includes("lateral raises")) {
          // --- HOMBROS: PRESS O ELEVACIONES (3D TRES CUARTOS) ---
          const isLateral = name.includes("lateral");
          const muscleActivation = normalizedPhase;

          // Seated configuration for press
          const head = project(0, -28, 0);
          const shL = project(0, -15, -14);
          const shR = project(0, -15, 14);
          const hpL = project(0, 35, -10);
          const hpR = project(0, 35, 10);
          
          const knL = project(24, 35, -12);
          const knR = project(24, 35, 12);
          const anL = project(28, 68, -14);
          const rAnk = project(28, 68, 14);

          // Draw backrest
          ctx.strokeStyle = colorBench;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(project(-12, 45, 0).x, project(-12, 45, 0).y);
          ctx.lineTo(project(-12, -10, 0).x, project(-12, -10, 0).y); // seat back
          ctx.lineTo(project(20, 45, 0).x, project(20, 45, 0).y);     // seat bottom
          ctx.stroke();

          if (isLateral) {
            // ELEVACIONES LATERALES (Z depth swing!)
            const swingAngle = normalizedPhase * (Math.PI / 2.2);
            
            const lHand = project(0, -15 - Math.sin(swingAngle) * 32, -14 - Math.cos(swingAngle) * 32);
            const rHand = project(0, -15 - Math.sin(swingAngle) * 32, 14 + Math.cos(swingAngle) * 32);

            const lElbow = project(0, -15 - Math.sin(swingAngle) * 16, -14 - Math.cos(swingAngle) * 16);
            const rElbow = project(0, -15 - Math.sin(swingAngle) * 16, 14 + Math.cos(swingAngle) * 16);

            // Draw Far Side limbs first
            drawBone(hpR, knR, true, isRef);
            drawBone(knR, rAnk, true, isRef);
            drawBone(shR, rElbow, true, isRef);
            drawBone(rElbow, rHand, true, isRef);

            // Draw 3D Dumbbells (middle ground)
            draw3DDumbbell(ctx, lHand.x, lHand.y, 14 * lHand.scale, 10 * lHand.scale, -swingAngle, "10");
            draw3DDumbbell(ctx, rHand.x, rHand.y, 14 * rHand.scale, 10 * rHand.scale, swingAngle, "10");

            // Spine
            ctx.strokeStyle = colorTorso;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
            ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
            ctx.stroke();

            drawActiveMuscle(shL.x, shL.y, shL.x - 10, shL.y, muscleActivation * 0.9, isRef); // Deltoids

            // Draw Near Side limbs (drawn in front of the dumbbells!)
            drawBone(hpL, knL, false, isRef);
            drawBone(knL, anL, false, isRef);
            drawBone(shL, lElbow, false, isRef);
            drawBone(lElbow, lHand, false, isRef);

            // Draw hand joint highlights wrapping the dumbbells
            drawJoint(lHand.x, lHand.y, false, isRef);
            drawJoint(rHand.x, rHand.y, false, isRef);

            if (!isRef) {
              ctx.fillStyle = "#22c55e";
              ctx.font = "bold 9px monospace";
              ctx.textAlign = "center";
              ctx.fillText("AGARRE NEUTRO (CODOS SEMIFLEXIONADOS)", (lHand.x + rHand.x)/2, Math.min(lHand.y, rHand.y) - 15);
            }

          } else {
            // PRESS HOMBROS (Dumbbells lift vertically)
            const handY = -15 - (normalizedPhase * 40);
            
            const lHand = project(0, handY, -24);
            const rHand = project(0, handY, 24);

            const lElbow = project(-4 + (1 - normalizedPhase) * 6, 4 + (1 - normalizedPhase) * 10, -20);
            const rElbow = project(-4 + (1 - normalizedPhase) * 6, 4 + (1 - normalizedPhase) * 10, 20);

            // Draw Far Side limbs first
            drawBone(hpR, knR, true, isRef);
            drawBone(knR, rAnk, true, isRef);
            drawBone(shR, rElbow, true, isRef);
            drawBone(rElbow, rHand, true, isRef);

            // Draw Dumbbells (middle ground)
            draw3DDumbbell(ctx, lHand.x, lHand.y, 17 * lHand.scale, 12 * lHand.scale, 0.05, "20");
            draw3DDumbbell(ctx, rHand.x, rHand.y, 17 * rHand.scale, 12 * rHand.scale, -0.05, "20");

            // Spine
            ctx.strokeStyle = colorTorso;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
            ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
            ctx.stroke();

            // Deltoids & Triceps active
            drawActiveMuscle(shL.x, shL.y, lElbow.x, lElbow.y, muscleActivation * 0.85, isRef);

            // Draw Near Side limbs (drawn in front of the dumbbells!)
            drawBone(hpL, knL, false, isRef);
            drawBone(knL, anL, false, isRef);
            drawBone(shL, lElbow, false, isRef);
            drawBone(lElbow, lHand, false, isRef);

            // Draw hand joints wrapping the dumbbells
            drawJoint(lHand.x, lHand.y, false, isRef);
            drawJoint(rHand.x, rHand.y, false, isRef);

            if (!isRef) {
              ctx.fillStyle = "#22c55e";
              ctx.font = "bold 9px monospace";
              ctx.textAlign = "center";
              ctx.fillText("MUÑECAS ALINEADAS SOBRE CODOS", (lHand.x + rHand.x)/2, Math.min(lHand.y, rHand.y) - 15);
            }
          }

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (look straight forward)
          drawGazeVisor(head.x, head.y, 0, isRef);

        } else if (name.includes("calf") || name.includes("pantorrilla")) {
          // --- PIERNAS: ELEVACIÓN DE PANTORRILLAS (MÁQUINA 3D) ---
          const isSeated = name.includes("seated") || name.includes("sentado");
          const raiseScale = normalizedPhase; // 0 (heels down) to 1 (fully raised)

          // Draw block under feet (toes on block)
          ctx.fillStyle = "#334155";
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1;
          const blockFront = project(-10, 68, -20);
          ctx.fillRect(blockFront.x, blockFront.y, 20, 8);
          ctx.strokeRect(blockFront.x, blockFront.y, 20, 8);

          if (isSeated) {
            // SEATED CALF RAISES
            // Draw seat bench
            ctx.strokeStyle = colorBench;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(project(-22, 45, 0).x, project(-22, 45, 0).y);
            ctx.lineTo(project(-6, 45, 0).x, project(-6, 45, 0).y); // seat bottom
            ctx.lineTo(project(-22, 10, 0).x, project(-22, 10, 0).y); // seat back
            ctx.stroke();

            // Joints
            const hpL = project(-12, 42, -8);
            const hpR = project(-12, 42, 8);
            const shL = project(-15, 16, -10);
            const shR = project(-15, 16, 10);
            const head = project(-15, 2, 0);

            // Knees (rise up and down slightly with calf extension)
            const knL = project(12, 38 - raiseScale * 5, -12);
            const knR = project(12, 38 - raiseScale * 5, 12);

            // Toes fixed at block edge, heels rise
            const toesL = project(12, 68, -10);
            const toesR = project(12, 68, 10);
            const anL = project(6, 68 - raiseScale * 12, -10);
            const rAnk = project(6, 68 - raiseScale * 12, 10);

            // Hands holding pad handles
            const haL = project(12, 28 - raiseScale * 5, -14);
            const haR = project(12, 28 - raiseScale * 5, 14);

            const muscleActivation = raiseScale;

            // Draw Far Side limbs
            drawBone(hpR, knR, true, isRef);
            drawBone(knR, rAnk, true, isRef);
            drawBone(rAnk, toesR, true, isRef);

            // Draw machine pad resting on knees
            ctx.strokeStyle = colorRack;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(project(12, 38 - raiseScale * 5, -15).x, project(12, 38 - raiseScale * 5, -15).y);
            ctx.lineTo(project(12, 38 - raiseScale * 5, 15).x, project(12, 38 - raiseScale * 5, 15).y);
            ctx.stroke();

            // Spine
            ctx.strokeStyle = colorTorso;
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
            ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
            ctx.stroke();

            // Active muscle glow (Calves)
            drawActiveMuscle(knL.x, knL.y, anL.x, anL.y, muscleActivation * 0.95, isRef);

            // Draw Near Side limbs
            drawBone(hpL, knL, false, isRef);
            drawBone(knL, anL, false, isRef);
            drawBone(anL, toesL, false, isRef);

            // Head
            ctx.fillStyle = colorHead;
            ctx.beginPath();
            ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Draw joints
            drawJoint(knL.x, knL.y, false, isRef);
            drawJoint(anL.x, anL.y, muscleActivation > 0.5, isRef);

            if (!isRef) {
              ctx.fillStyle = "#22c55e";
              ctx.font = "bold 9px monospace";
              ctx.textAlign = "center";
              ctx.fillText("FLEXIÓN PLANTAR (SÓLEO CON TRACCIÓN)", (haL.x + haR.x)/2, 8);
            }

          } else {
            // STANDING CALF RAISES
            // Joints standing straight
            const toesL = project(10, 68, -10);
            const toesR = project(10, 68, 10);
            const anL = project(4, 68 - raiseScale * 14, -10);
            const rAnk = project(4, 68 - raiseScale * 14, 10);

            const knL = project(4, 38 - raiseScale * 14, -11);
            const knR = project(4, 38 - raiseScale * 14, 11);

            const hpL = project(4, 8 - raiseScale * 14, -10);
            const hpR = project(4, 8 - raiseScale * 14, 10);

            const shL = project(4, -32 - raiseScale * 14, -12);
            const shR = project(4, -32 - raiseScale * 14, 12);
            const head = project(4, -46 - raiseScale * 14, 0);

            // Hands holding safety bar
            const haL = project(20, -12 - raiseScale * 14, -14);
            const haR = project(20, -12 - raiseScale * 14, 14);
            const elL = project(12, -18 - raiseScale * 14, -15);
            const elR = project(12, -18 - raiseScale * 14, 15);

            const muscleActivation = raiseScale;

            // Draw Far Side limbs first
            drawBone(hpR, knR, true, isRef);
            drawBone(knR, rAnk, true, isRef);
            drawBone(rAnk, toesR, true, isRef);
            drawBone(shR, elR, true, isRef);
            drawBone(elR, haR, true, isRef);

            // Draw machine shoulder pads
            ctx.strokeStyle = colorRack;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(project(4, -32 - raiseScale * 14, -16).x, project(4, -32 - raiseScale * 14, -16).y);
            ctx.lineTo(project(4, -32 - raiseScale * 14, 16).x, project(4, -32 - raiseScale * 14, 16).y);
            ctx.stroke();

            // Spine
            ctx.strokeStyle = colorTorso;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
            ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
            ctx.stroke();

            // Active muscle glow (Calves)
            drawActiveMuscle(knL.x, knL.y, anL.x, anL.y, muscleActivation * 0.95, isRef);

            // Draw Near Side limbs
            drawBone(hpL, knL, false, isRef);
            drawBone(knL, anL, false, isRef);
            drawBone(anL, toesL, false, isRef);
            drawBone(shL, elL, false, isRef);
            drawBone(elL, haL, false, isRef);

            // Head
            ctx.fillStyle = colorHead;
            ctx.beginPath();
            ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
            ctx.fill();

            // Gaze Visor
            drawGazeVisor(head.x, head.y, 0, isRef);

            // Draw joints
            drawJoint(knL.x, knL.y, false, isRef);
            drawJoint(anL.x, anL.y, muscleActivation > 0.5, isRef);

            if (!isRef) {
              ctx.fillStyle = "#22c55e";
              ctx.font = "bold 9px monospace";
              ctx.textAlign = "center";
              ctx.fillText("ESTIRAMIENTO COMPLETO EN LA FASE BAJA (GEMELOS)", (haL.x + haR.x)/2, -52);
            }
          }

        } else if (name.includes("leg press") || name.includes("prensa")) {
          // --- PIERNAS: PRENSA (VISTA 3D CON SOPORTE LATERAL) ---
          const slide = normalizedPhase * 33;
          
          // Sled rails (45 deg)
          ctx.strokeStyle = colorRack;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(project(-45, 45, 0).x, project(-45, 45, 0).y);
          ctx.lineTo(project(45, -25, 0).x, project(45, -25, 0).y);
          ctx.stroke();

          // Cushion base
          ctx.strokeStyle = colorBench;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(project(-38, 38, 0).x, project(-38, 38, 0).y);
          ctx.lineTo(project(-12, 12, 0).x, project(-12, 12, 0).y);
          ctx.stroke();

          // Body joints
          const head = project(-48, 6, 0);
          const shL = project(-44, 18, -10);
          const shR = project(-44, 18, 10);
          const hpL = project(-28, 32, -8);
          const hpR = project(-28, 32, 8);

          // Sled sliding platform
          const platform = project(15 + slide, -5 - slide, 0);
          const barLeft = project(15 + slide, -5 - slide, -24);
          const barRight = project(15 + slide, -5 - slide, 24);
          const barAngle = -Math.PI / 4; // peg loaded at rail angle

          const knL = project(-12 + slide * 0.4, 8 + slide * 0.1, -18);
          const knR = project(-12 + slide * 0.4, 8 + slide * 0.1, 18);
          
          const footL = project(13 + slide, -7 - slide, -8);
          const footR = project(13 + slide, -7 - slide, 8);

          const muscleActivation = 1 - normalizedPhase;

          // Draw Far Side leg
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, footR, true, isRef);

          // Sled Platform plate line & plates first (for correct depth wrapping)
          ctx.strokeStyle = isRef ? "rgba(148, 163, 184, 0.3)" : "#cbd5e1";
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(project(15 + slide, -5 - slide, -15).x, project(15 + slide, -5 - slide, -15).y);
          ctx.lineTo(project(15 + slide, -5 - slide, 15).x, project(15 + slide, -5 - slide, 15).y);
          ctx.stroke();

          // 3D Bumper plates loaded on both weight pegs
          draw3DPlate(ctx, barLeft.x, barLeft.y, 22 * barLeft.scale, 6 * barLeft.scale, barAngle, "#06b6d4", "20", isRef);
          draw3DPlate(ctx, barRight.x, barRight.y, 22 * barRight.scale, 6 * barRight.scale, barAngle, "#06b6d4", "20", isRef);

          // Torso recline
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          drawActiveMuscle(hpL.x, hpL.y, knL.x, knL.y, muscleActivation * 0.9, isRef);

          // Draw Near Side leg (drawn in front of the platform!)
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, footL, false, isRef);

          // Highlight foot contacts on platform
          drawJoint(footL.x, footL.y, false, isRef);
          drawJoint(footR.x, footR.y, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (Look up-right aligned with sled)
          drawGazeVisor(head.x, head.y, -Math.PI / 4, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("APOYO COMPLETO TALÓN (NO BLOQUEAR RODILLAS)", platform.x, platform.y - 20);
          }

        } else if (name.includes("running") || name.includes("trote") || name.includes("carrera") || name.includes("intervals")) {
          // --- DINÁMICO: RUNNING (Treadmill 3D perspective deck) ---
          ctx.fillStyle = isRef ? "rgba(30, 41, 59, 0.3)" : "#1e293b";
          ctx.beginPath();
          ctx.moveTo(project(-45, 68, -20).x, project(-45, 68, -20).y);
          ctx.lineTo(project(45, 68, -20).x, project(45, 68, -20).y);
          ctx.lineTo(project(45, 68, 20).x, project(45, 68, 20).y);
          ctx.lineTo(project(-45, 68, 20).x, project(-45, 68, 20).y);
          ctx.closePath();
          ctx.fill();

          // Deck rails
          ctx.strokeStyle = colorBench;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(project(-45, 68, -20).x, project(-45, 68, -20).y);
          ctx.lineTo(project(45, 68, -20).x, project(45, 68, -20).y);
          ctx.moveTo(project(-45, 68, 20).x, project(-45, 68, 20).y);
          ctx.lineTo(project(45, 68, 20).x, project(45, 68, 20).y);
          ctx.stroke();

          // Belt dash lines moving left
          if (!isRef) {
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 2;
            ctx.setLineDash([12, 12]);
            ctx.lineDashOffset = (localCycle * 40) % 24;
            
            ctx.beginPath();
            ctx.moveTo(project(-45, 68, -5).x, project(-45, 68, -5).y);
            ctx.lineTo(project(45, 68, -5).x, project(45, 68, -5).y);
            ctx.moveTo(project(-45, 68, 5).x, project(-45, 68, 5).y);
            ctx.lineTo(project(45, 68, 5).x, project(45, 68, 5).y);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Runner joints with cycle bounce
          const bounce = Math.abs(Math.sin(localCycle * 2.5)) * 6.5;
          const bodyY = -10 - bounce;

          const head = project(2, bodyY - 28, 0);
          const shL = project(0, bodyY - 15, -12);
          const shR = project(0, bodyY - 15, 12);
          const hpL = project(0, bodyY + 25, -8);
          const hpR = project(0, bodyY + 25, 8);

          const swing = Math.sin(localCycle * 2.1) * 18;

          const knL = project(-10 - swing * 0.5, bodyY + 45, -12);
          const knR = project(10 + swing * 0.5, bodyY + 45, 12);
          const footL = project(-swing, 68, -12);
          const footR = project(swing, 68, 12);

          const haL = project(15 + swing * 0.35, bodyY - 5, -14);
          const haR = project(15 - swing * 0.35, bodyY - 5, 14);
          const elL = project(2, bodyY - 8, -13);
          const elR = project(2, bodyY - 8, 13);

          // Draw Far Side limbs
          drawBone(hpR, knR, true, isRef);
          drawBone(knR, footR, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // Spine
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Draw Near Side limbs
          drawBone(hpL, knL, false, isRef);
          drawBone(knL, footL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (look straight forward)
          drawGazeVisor(head.x, head.y, 0, isRef);

        } else {
          // --- GENÉRICO: BICEP CURLS (3D ALTERNATE ARMS) ---
          const head = project(0, -38, 0);
          const shL = project(0, -25, -12);
          const shR = project(0, -25, 12);
          const hpL = project(0, 25, -10);
          const hpR = project(0, 25, 10);
          const anL = project(0, 68, -12);
          const rAnk = project(0, 68, 12);

          const curlScale = (phase + 1) / 2;
          
          // Left Hand curling (near arm)
          const haL = project(16, -5 - curlScale * 25, -12);
          const elL = project(4, -5, -12);

          // Right Hand resting (far arm)
          const haR = project(8, 10, 12);
          const elR = project(2, -5, 12);

          // Draw Far Side limb
          drawBone(hpR, rAnk, true, isRef);
          drawBone(shR, elR, true, isRef);
          drawBone(elR, haR, true, isRef);

          // 3D Hexagonal Dumbbell rotates with forearm angle (DRAWN BEFORE near-side limbs for depth)
          const forearmAngle = Math.atan2(haL.y - elL.y, haL.x - elL.x);
          draw3DDumbbell(ctx, haL.x, haL.y, 18 * haL.scale, 12 * haL.scale, forearmAngle + Math.PI / 2, "15");
          draw3DDumbbell(ctx, haR.x, haR.y, 16 * haR.scale, 11 * haR.scale, Math.PI / 2, "15");

          // Spine
          ctx.strokeStyle = colorTorso;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo((shL.x + shR.x)/2, (shL.y + shR.y)/2);
          ctx.lineTo((hpL.x + hpR.x)/2, (hpL.y + hpR.y)/2);
          ctx.stroke();

          // Bicep active glow
          drawActiveMuscle(shL.x, shL.y, elL.x, elL.y, curlScale * 0.95, isRef);

          // Draw Near Side limbs (drawn in front of the dumbbells!)
          drawBone(hpL, anL, false, isRef);
          drawBone(shL, elL, false, isRef);
          drawBone(elL, haL, false, isRef);

          // Head
          ctx.fillStyle = colorHead;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();

          // Gaze Visor (look straight forward)
          drawGazeVisor(head.x, head.y, 0, isRef);

          // Highlight hand joints wrapping the dumbbells
          drawJoint(haL.x, haL.y, false, isRef);
          drawJoint(haR.x, haR.y, false, isRef);

          if (!isRef) {
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("AGARRE SUPINO (CODOS FIJOS A LAS COSTILLAS)", (haL.x + haR.x)/2, Math.min(haL.y, haR.y) - 15);
          }
        }
      };

      // 1. Draw Flipped Glassy Floor Reflection
      ctx.save();
      ctx.translate(0, (height - 30) * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.14; 

      // Clip reflection area strictly below floor line
      ctx.beginPath();
      ctx.rect(0, height - 29, width, 30);
      ctx.clip();

      drawScene(true);
      ctx.restore();

      // 2. Draw Glassy Gym Floor Overlay
      const floorGrad = ctx.createLinearGradient(0, height - 30, 0, height);
      floorGrad.addColorStop(0, "rgba(30, 41, 59, 0.45)");
      floorGrad.addColorStop(1, "rgba(15, 23, 42, 0.98)");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, height - 30, width, 30);

      // Floor border line
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(10, height - 30);
      ctx.lineTo(width - 10, height - 30);
      ctx.stroke();

      // 3. Draw Actual High-Resolution 3D Scene
      drawScene(false);

      // 4. Repetition Count Badge on Canvas
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(15, 15, 140, 36);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(15, 15, 140, 36);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`REPS: ${localRep}`, 30, 37);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [exerciseName, isPlaying, repCount]);

  // Find matching guide
  const nameKey = Object.keys(GRIP_AND_SAFETY_GUIDELINES).find(k => exerciseName.toLowerCase().includes(k)) || "bench press";
  const guide = GRIP_AND_SAFETY_GUIDELINES[nameKey];

  return (
    <div id="exercise-animator" className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-3">
        <h4 className="text-slate-200 font-sans tracking-tight font-medium text-sm md:text-base flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
          Anatomía de Movimiento Técnico (Vista 3D)
        </h4>
        <div className="flex gap-2">
          <button
            onClick={togglePlay}
            id="btn-play-pause-animation"
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${isPlaying ? 'bg-amber-950 text-amber-200 border-amber-800 hover:bg-amber-900' : 'bg-emerald-950 text-emerald-200 border-emerald-800 hover:bg-emerald-900'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleReset}
            id="btn-reset-animation"
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Reiniciar Repeticiones"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-950 w-full flex justify-center">
        <canvas
          ref={canvasRef}
          width={360}
          height={220}
          className="w-full max-w-[420px] aspect-[16/10] bg-slate-950 block"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center font-mono text-sm text-slate-400 gap-1.5 pointer-events-none">
            <Info className="w-4 h-4" /> Animación En Pausa
          </div>
        )}
      </div>

      <div className="w-full mt-3 flex flex-wrap gap-2 items-center justify-center">
        <span className="text-slate-400 font-mono text-xs">Músculos clave:</span>
        {targetMuscles.map((muscle) => (
          <span
            key={muscle}
            className="text-[10px] md:text-xs font-sans tracking-tight bg-slate-800 text-sky-400 border border-slate-700/50 px-2 py-0.5 rounded-full"
          >
            {muscle}
          </span>
        ))}
      </div>

      {/* Panel de Guía de Agarre y Postura */}
      {guide && (
        <div className="w-full mt-4 bg-slate-950/40 border border-slate-800 rounded-lg p-3 text-left space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 border-b border-slate-800 pb-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guía Técnica: Agarre y Postura (Prevención de Errores)</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed">
            <div className="space-y-1">
              <div>
                <span className="font-mono text-slate-400 uppercase tracking-wide text-[9px] block">Tipo de Agarre:</span>
                <span className="text-slate-200 font-sans">{guide.gripType}</span>
              </div>
              {guide.gripWidth !== "N/A" && (
                <div className="mt-1">
                  <span className="font-mono text-slate-400 uppercase tracking-wide text-[9px] block">Ancho de Agarre:</span>
                  <span className="text-slate-200 font-sans">{guide.gripWidth}</span>
                </div>
              )}
              {guide.wrists !== "N/A" && (
                <div className="mt-1">
                  <span className="font-mono text-slate-400 uppercase tracking-wide text-[9px] block">Sujeción de Muñecas:</span>
                  <span className="text-slate-300 font-sans">{guide.wrists}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              <span className="font-mono text-slate-400 uppercase tracking-wide text-[9px] block">Puntos Clave de Seguridad:</span>
              <ul className="list-disc list-inside text-slate-300 font-sans space-y-1 pl-1">
                {guide.tips.map((tip, index) => (
                  <li key={index} className="indent-[-10px] pl-[10px]">{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
