import { Exercise, RoutineSchedule, RunningPhase, Reward, WeightLog } from "./types";

export const EXERCISE_DETAILS: Record<string, { description: string; tips: string[]; category: Exercise['category'] }> = {
  "Flat barbell bench press": {
    description: "Press de banca plano con barra. El ejercicio fundamental de empuje para desarrollar el pecho, hombros y tríceps.",
    tips: [
      "Retrae las escápulas y mantén un ligero arco lumbar.",
      "Lleva la barra a la parte media del pecho, controlando la bajada.",
      "Empuja sin despegar los hombros del banco."
    ],
    category: "empuje"
  },
  "Heavy barbell row": {
    description: "Remo pesado con barra inclinada. El Rey de los ejercicios para una espalda densa y brazos fuertes.",
    tips: [
      "Mantén la espalda recta y el abdomen contraído a 45 grados de inclinación.",
      "Jala la barra hacia el ombligo guiando con los codos.",
      "Aprieta la musculatura de la espalda al final de la contracción."
    ],
    category: "jalon"
  },
  "Seated dumbbell shoulder press": {
    description: "Press militar sentado con mancuernas. Excelente para redondear tus hombros de manera simétrica.",
    tips: [
      "Ajusta el banco a unos 80-85 grados de inclinación.",
      "Baja las mancuernas hasta la altura de las orejas o barbilla.",
      "Empuja verticalmente sin chocar las mancuernas arriba."
    ],
    category: "empuje"
  },
  "Wide-grip lat pulldown": {
    description: "Jalón al pecho con agarre amplio. Desarrolla la amplitud de tu espalda superior.",
    tips: [
      "Sujeta la barra un poco más que el ancho de tus hombros.",
      "Jala hacia la clavícula inclinando el torso levemente hacia atrás.",
      "Evita usar el impulso del cuerpo y controla la fase de regreso."
    ],
    category: "jalon"
  },
  "Parallel bar dips or Push-ups": {
    description: "Fondos en paralelas o lagartijas al fallo. Ejercicio de autocarga brutal para exprimir el pectoral inferior y tríceps.",
    tips: [
      "En fondos, inclínate ligeramente hacia adelante para enfocar el pecho.",
      "Si haces lagartijas, mantén una línea recta desde la cabeza hasta los talones.",
      "Llega lo más cerca del fallo dinámico controlado para máxima estímulo."
    ],
    category: "empuje"
  },
  "Barbell back squat": {
    description: "Sentadilla libre con barra trasera. El ejercicio definitivo de fuerza, potencia y desarrollo de cuádricep.",
    tips: [
      "Mantén los talones bien apoyados en el suelo y distribuye el peso equitativamente.",
      "Baja rompiendo el paralelo (la cadera por debajo de las rodillas) con la espalda neutral.",
      "Empuja fuerte con las piernas manteniendo el pecho erguido."
    ],
    category: "piernas"
  },
  "Dumbbell Romanian deadlift": {
    description: "Peso muerto rumano con mancuernas. Enfocado en activar los isquiotibiales (femorales) y glúteos de manera óptima.",
    tips: [
      "Empuja la cadera hacia atrás como si quisieras tocar la pared con los glúteos.",
      "Mantén las rodillas semirrígidas (flexión mínima de unos 10 grados).",
      "Siente el estiramiento en la parte trasera del muslo antes de subir apretando el glúteo."
    ],
    category: "piernas"
  },
  "45-degree leg press": {
    description: "Prensa de piernas a 45 grados. Permite cargar las piernas intensamente de manera segura sin comprometer la espalda.",
    tips: [
      "Coloca los pies a lo ancho de los hombros a media altura en la plataforma.",
      "Baja controlando el peso hasta que tus rodillas formen un ángulo de 90 grados.",
      "No bloquees o hiper-extiendas las rodillas al tope de la subida."
    ],
    category: "piernas"
  },
  "Machine leg extensions": {
    description: "Extensiones de piernas en máquina. Aislamiento puro de los cuatro vientres del cuádriceps para dar forma y definición.",
    tips: [
      "Ajusta el rodillo justo arriba del empeine.",
      "Extiende las piernas por completo y sostén la contracción un segundo.",
      "Baja lentamente resistiendo la carga en todo momento."
    ],
    category: "piernas"
  },
  "Standing machine calf raises": {
    description: "Elevación de talones de pie en máquina. Desarrolla las pantorrillas con énfasis en el músculo gemelo.",
    tips: [
      "Coloca solo la punta del pie en el estribo.",
      "Baja los talones al máximo para estirar la pantorrilla.",
      "Sube de manera explosiva contrayendo con fuerza arriba."
    ],
    category: "pantorrillas"
  },
  "Incline dumbbell press": {
    description: "Press inclinado con mancuernas. Maximiza el desarrollo de la porción clavicular (superior) del pecho.",
    tips: [
      "Usa una inclinación de 30 grados para enfocar el pectoral superior en lugar del hombro.",
      "Baja las mancuernas al pecho superior de forma controlada.",
      "Empuja hacia el centro imaginando juntar tus bíceps."
    ],
    category: "empuje"
  },
  "Pull-ups or Reverse-grip lat pulldown": {
    description: "Dominadas libres o jalón con agarre supino (reverso). Estimula la tracción y desarrollo del dorsal ancho y bíceps.",
    tips: [
      "En dominadas, empieza desde colgado completo sin balanceos.",
      "Concentra la fuerza en jalar tus codos hacia el suelo.",
      "Llega con la barbilla por encima de la barra."
    ],
    category: "jalon"
  },
  "Seated cable row": {
    description: "Remo sentado con polea con agarre cerrado tipo triángulo. Aislamiento medio de la espalda media para grosor inter-escapular.",
    tips: [
      "Mantén las rodillas ligeramente flexionadas.",
      "Jala el triángulo hacia la boca de tu estómago guiando con los codos pegados al cuerpo.",
      "Estira completamente los brazos en la fase excéntrica arqueando ligeramente la espalda sin encorvarte."
    ],
    category: "jalon"
  },
  "Dumbbell lateral raises": {
    description: "Elevaciones laterales con mancuernas. Da la ilusión de cintura pequeña agregando anchura en los hombros laterales.",
    tips: [
      "Mantén una ligera inclinación del pecho hacia adelante.",
      "Eleva los codos ligeramente por encima de las muñecas.",
      "Imagina proyectar las mancuernas hacia las paredes de los lados, no hacia arriba."
    ],
    category: "brazos"
  },
  "Superset: EZ bar bicep curl + Tricep rope pushdown": {
    description: "Súper-serie intensiva para brazos: Curl con barra EZ (Bíceps) + Extensión de tríceps en polea con cuerda.",
    tips: [
      "Realiza 12 repeticiones de Curl con barra EZ sin balancear el torso.",
      "Inmediatamente pasa a la polea y haz 12 extensiones de tríceps abriendo la cuerda al final de la bajada.",
      "Descansa hasta terminar ambos ejercicios."
    ],
    category: "brazos"
  },
  "Heavy leg press": {
    description: "Prensa de piernas pesada. Carga global el tren inferior concentrando tensión en cuádriceps y femorales.",
    tips: [
      "Adapta una postura sólida de la cadera en el asiento.",
      "Toma aire (maniobra de Valsalva) al bajar para proteger tu abdomen superior.",
      "Mantén una trayectoria constante sin desviar las rodillas hacia adentro."
    ],
    category: "piernas"
  },
  "Walking dumbbell lunges": {
    description: "Desplantes/Zancadas caminando con mancuernas. Ejercicio dinámico ideal para glúteos, femorales y estabilización unilateral.",
    tips: [
      "Da pasos amplios de manera que la rodilla trasera casi toque el piso.",
      "Mantén el torso erguido o ligeramente hacia el frente para enfocar glúteos.",
      "Asegúrate de que la rodilla delantera siga la línea del pie sin irse de lado."
    ],
    category: "piernas"
  },
  "Lying machine leg curls": {
    description: "Curl de piernas acostado en máquina. Excelente aislamiento excéntrico y de pico contráctil de los isquiotibiales.",
    tips: [
      "Mantén la pelvis pegada al banco para evitar trampas con la zona lumbar.",
      "Lleva los talones hacia tus glúteos de forma fluida.",
      "Frena la caída controlando los femorales."
    ],
    category: "piernas"
  },
  "Seated machine calf raises": {
    description: "Elevación de pantorrillas sentado. Aísla principalmente el músculo sóleo, crucial para el volumen inferior de la pantorrilla.",
    tips: [
      "Ajusta la almohadilla ajustada sobre tus muslos bajos.",
      "Realiza un movimiento completo reteniendo abajo un segundo para quitar reflejo elástico del tendón.",
      "Empuja al máximo estirando vertical."
    ],
    category: "pantorrillas"
  }
};

export const TRAINING_PLAN: RoutineSchedule = {
  monday: {
    focus: "Torso A (Push Focus)",
    exercises: [
      { name: "Flat barbell bench press", sets: 4, reps: "8-10", category: "empuje", description: "", tips: [] },
      { name: "Heavy barbell row", sets: 4, reps: "8-10", category: "jalon", description: "", tips: [] },
      { name: "Seated dumbbell shoulder press", sets: 3, reps: "10", category: "empuje", description: "", tips: [] },
      { name: "Wide-grip lat pulldown", sets: 3, reps: "12", category: "jalon", description: "", tips: [] },
      { name: "Parallel bar dips or Push-ups", sets: 3, reps: "Failure", category: "empuje", description: "", tips: [] }
    ]
  },
  tuesday: {
    focus: "Legs A (Quadriceps Focus)",
    exercises: [
      { name: "Barbell back squat", sets: 4, reps: "8-10", category: "piernas", description: "", tips: [] },
      { name: "Dumbbell Romanian deadlift", sets: 4, reps: "10", category: "piernas", description: "", tips: [] },
      { name: "45-degree leg press", sets: 3, reps: "12", category: "piernas", description: "", tips: [] },
      { name: "Machine leg extensions", sets: 3, reps: "12-15", category: "piernas", description: "", tips: [] },
      { name: "Standing machine calf raises", sets: 4, reps: "15", category: "pantorrillas", description: "", tips: [] }
    ]
  },
  thursday: {
    focus: "Torso B (Pull & Arms Focus)",
    exercises: [
      { name: "Incline dumbbell press", sets: 4, reps: "8-10", category: "empuje", description: "", tips: [] },
      { name: "Pull-ups or Reverse-grip lat pulldown", sets: 4, reps: "8-10", category: "jalon", description: "", tips: [] },
      { name: "Seated cable row", sets: 3, reps: "10", category: "jalon", description: "", tips: [] },
      { name: "Dumbbell lateral raises", sets: 4, reps: "12-15", category: "brazos", description: "", tips: [] },
      { name: "Superset: EZ bar bicep curl + Tricep rope pushdown", sets: 3, reps: "12 cada uno", category: "brazos", description: "", tips: [] }
    ]
  },
  friday: {
    focus: "Legs B (Hamstrings & Global)",
    exercises: [
      { name: "Heavy leg press", sets: 4, reps: "10", category: "piernas", description: "", tips: [] },
      { name: "Walking dumbbell lunges", sets: 3, reps: "12 por pierna", category: "piernas", description: "", tips: [] },
      { name: "Lying machine leg curls", sets: 4, reps: "10-12", category: "piernas", description: "", tips: [] },
      { name: "Machine leg extensions", sets: 3, reps: "12", category: "piernas", description: "", tips: [] },
      { name: "Seated machine calf raises", sets: 4, reps: "15", category: "pantorrillas", description: "", tips: [] }
    ]
  }
};

// Populate description and tips from EXERCISE_DETAILS lookup
for (const day of Object.keys(TRAINING_PLAN)) {
  const d = day as keyof RoutineSchedule;
  TRAINING_PLAN[d].exercises = TRAINING_PLAN[d].exercises.map(ex => {
    const detail = EXERCISE_DETAILS[ex.name];
    if (detail) {
      return {
        ...ex,
        description: detail.description,
        tips: detail.tips,
        category: detail.category
      };
    }
    return ex;
  });
}

export const RUNNING_PHASES: RunningPhase[] = [
  {
    months: "Meses 1-2",
    protocol: "Fraccionado Inicial",
    details: "4 intervalos: 5 minutos de trote continuo + 1 minuto caminando. Duración total: 24 minutos. Prioriza ritmo aeróbico suave."
  },
  {
    months: "Meses 3-4",
    protocol: "Incremento de Carga",
    details: "3 intervalos: 8 minutos de trote continuo + 1 minuto de caminata rápida para recuperar. IMPORTANTE: En el último viernes del Mes 4, realiza un trote de 20 minutos sin paradas."
  },
  {
    months: "Meses 5-6",
    protocol: "Fondo Continuo Corto",
    details: "Carrera de trote continuo durante 25-30 minutos seguidos sin detenerse. Tu distancia estimada debería rondar los 3.5 km a 4.0 km."
  },
  {
    months: "Meses 7-12",
    protocol: "Objetivo 5K Consolidado",
    details: "Distancia fija de 5 Kilómetros completos. El objetivo final en tu año de transformación es completarlo sin detenerte con una marca estimada de 25 a 30 minutos."
  }
];

export const INITIAL_WEIGHT_LOGS: WeightLog[] = [
  { date: "2026-06-01", weightKg: 53.0 },
];

export const DEFAULT_REWARDS: Reward[] = [
  {
    id: "r1",
    title: "Agua de Vida de Campeón",
    description: "Cumple la hidratación diaria con limón y sal mineral durante 4 días seguidos.",
    xpValue: 100,
    category: "weekly",
    icon: "droplet",
    progressMax: 4
  },
  {
    id: "r2",
    title: "¡Plátano de Poder!",
    description: "Registra tu plátano pre-entrenamiento de las 7:00 a.m. un total de 4 veces.",
    xpValue: 120,
    category: "weekly",
    icon: "banana",
    progressMax: 4
  },
  {
    id: "r3",
    title: "Fuerza Absoluta de Acero",
    description: "Completa tus 4 sesiones de entrenamiento semanales en el gimnasio.",
    xpValue: 150,
    category: "weekly",
    icon: "dumbbell",
    progressMax: 4
  },
  {
    id: "r4",
    title: "Aeróbico de Hierro",
    description: "Suma tus 3 sesiones semanales de carrera para aumentar tu capacidad cardiovascular.",
    xpValue: 150,
    category: "weekly",
    icon: "footprints",
    progressMax: 3
  },
  {
    id: "r5",
    title: "Constancia Suprema de Mes",
    description: "Realiza y confirma tus entrenamientos y nutrición durante un mes calendario.",
    xpValue: 500,
    category: "monthly",
    icon: "calendar",
    progressMax: 20
  },
  {
    id: "r6",
    title: "¡Rompiendo la Barrera (55kg)!",
    description: "Sube tu peso corporal por encima de 55 kg en tu meta hacia los 65 kg.",
    xpValue: 300,
    category: "monthly",
    icon: "weight",
    progressMax: 1
  },
  {
    id: "r7",
    title: "Templo del Músculo Magro",
    description: "Aumenta tu masa magra subiendo hasta los 58 kg.",
    xpValue: 400,
    category: "stage",
    icon: "award",
    progressMax: 1
  },
  {
    id: "r8",
    title: "Trote Inquebrantable (20 min)",
    description: "Completa el gran Hito del mes 4 coriendo 20 minutos de forma 100% continua.",
    xpValue: 500,
    category: "stage",
    icon: "trophy",
    progressMax: 1
  },
  {
    id: "r9",
    title: "Metamorfosis Dorada (65kg)",
    description: "Hito final de 1 año: Alcanzar un peso de 65 kg y poder correr 5K continuos.",
    xpValue: 1000,
    category: "stage",
    icon: "crown",
    progressMax: 1
  }
];
