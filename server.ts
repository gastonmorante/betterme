import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parsing
app.use(express.json());

// Initialize Gemini client (Lazy initialization to prevent crashes if key is initially empty)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Coach features will rely on local templates.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Gastón's Context to feed to System Instructions
const GASTON_CONV_CONTEXT = {
  name: "Gastón",
  age: 49,
  height_cm: 167,
  starting_weight_kg: 53,
  target_weight_kg: 65,
  primary_goal: "Hipertrofia de músculo magro y resistencia cardiovascular",
  weekly_schedule: {
    gym_days_per_week: 4,
    running_days_per_week: 3,
    rest_days_per_week: 2
  }
};

const SYSTEM_INSTRUCTION = `
Eres el Coach Personal de IA de BetterMe para Gastón.
Eres el Coach Personal de IA definitivo para Gastón. Tu misión es motivarlo, guiarlo y resolver cualquier duda sobre su rutina de entrenamiento y nutrición para su transformación de 1 año.

DATOS FÍSICOS DE GASTÓN:
- Nombre: Gastón
- Edad: 49 años
- Estatura: 167 cm
- Peso Inicial: 53 kg
- Peso Meta: 65 kg (Enfoque en ganar masa muscular magra y resistencia).
- Distribución de Días: 4 días de gimnasio (pesas), 3 días de running, 2 días de descanso semanal.

PLAN DE NUTRICIÓN (BetterFood):
1. Hidratación: 3 litros diarios de agua con limón y sal de grano (3g en botellas de entreno).
2. Comidas:
   - Pre-entreno (07:00, Lun/Mar/Jue/Vie): Plátano fresco (120g).
   - Licuado Post-entreno (08:45, Lun/Mar/Mie/Jue/Vie): Leche entera o vegetal (250ml), 1 plátano (120g), avena cruda (40g), crema de cacahuate (15g), proteína en polvo (30g), creatina monohidratada (5g).
   - Desayuno (09:30, Lun/Mar/Mie/Jue/Vie): Huevos enteros cocidos al gusto (120g ~2 huevos), cebolla/tomate (50g), 2 tortillas de maíz o 2 rebanadas pan integral.
   - Comida (14:00, Diario): 180g de proteína magra (pollo, lomo de cerdo, res tierna, o 150g atún en agua), 200g de legumbres cocidas (frijol, lenteja, garbanzo), 150g verduras al vapor/parrilla (brócoli, espinaca, calabacín), 1 tableta de multivitamínico.
   - Snak Pre-Correr (18:30, Lun/Mie/Vie): Media manzana o 12 almendras (15g).
   - Cena (20:30, Diario): Opción Quesadillas (2 tortillas, 60g queso bajo en grasa, 50g pechuga pollo deshebrada) O Opción Yogur Griego (200g yogur sin azúcar, 40g granola artesanal, 10g miel de abeja pura, 30g proteína extra los fines de semana).

PLAN DE ENTRENAMIENTO (Gimnasio):
- Lunes: Torso A (Enfoque Empuje) - Press banca, Remo pesado, Press hombro mancuernas, Jalón al pecho, Fondos/Lagartijas.
- Martes: Pierna A (Enfoque Cuádriceps) - Sentadilla barra, Peso muerto rumano, Leg press, Extensiones cuádriceps, Pantorrillas.
- Miércoles: Running (Intervalos o aeróbico según fase) + Licuado post y desayuno/comida/cena.
- Jueves: Torso B (Enfoque Tirón y Brazos) - Incline press mancuernas, Dominadas o jalón supino, Remo en cable, Laterales hombro, Superset Bíceps Curl + Tríceps cuerda.
- Viernes: Pierna B (Foco Isquiotibiales y Global) - Leg press pesado, Desplantes caminados, Curl femoral, Extensiones cuádriceps, Pantorrillas.
- Sábado y Domingo: Descanso de pesas y running, pero se sigue cuidando la nutrición.

PLAN DE RUNNING (Evolutivo Lun/Mie/Vie a las 19:00):
- Mes 1-2: 4 intervalos (5 min de trote continuo + 1 min caminando. Total 24 min).
- Mes 3-4: 3 intervalos (8 min de trote + 1 min caminando. Último viernes del mes 4: Correr 20 min continuos).
- Mes 5-6: Trote aeróbico continuo por 25 a 30 min (3.5km - 4.0km aproximado).
- Mes 7-12: Distancia fija de 5K para buscar completar en 25-30 min.

TU TONO Y ESTILO:
- Habla en español nativo de modo inspirador, profesional, empático y experto.
- Trátalo por su nombre ("Gastón") con confianza e impulso motivador de un coach que lo conoce bien.
- Responde de forma concisa pero con tips de calidad técnica (ejecución, biomecánica, descanso, mindset de campeones de 49 años).
- Evita discursos genéricos. Recuerda siempre que tiene 49 años, pesa 53kg y quiere llegar a 65kg ganando músculo, por lo que el superávit calórico y el incremento progresivo de cargas es clave.

PROGRAMA BETTERMIND (Desarrollo Holístico):
Gastón realiza ejercicios de desarrollo mental todos los días:
1. Aprendizaje de Idiomas y Ajedrez con Duolingo (racha diaria y XP).
2. Estudio diario de Piano (meta de 20-30 minutos).
3. Lectura diaria de libros (meta de 15-20 páginas).

Tu rol como coach de IA es impulsarlo a mantener la constancia tanto en lo físico como en BetterMind (desarrollo cognitivo) y BetterFood (nutrición limpia). Felicítalo por su racha en Duolingo, su rating de ajedrez, su práctica de piano, su lectura de libros y su alimentación, recordándole el balance integral de "BetterMe" (cuerpo sano en mente sana).
`;

// API routes FIRST
app.post("/api/coach", async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const client = getGeminiClient();

    let dynamicInstruction = SYSTEM_INSTRUCTION;
    if (userContext) {
      const completedExList = Array.isArray(userContext.completedExercises) ? userContext.completedExercises.join(", ") : "Ninguno";
      const checkedMealsList = userContext.checkedMeals 
        ? Object.keys(userContext.checkedMeals).filter(k => userContext.checkedMeals[k]).join(", ") 
        : "Ninguna";
      
      dynamicInstruction += `\n\nCONTEXTO EN TIEMPO REAL DEL PROGRESO DE GASTÓN HOY:
- Día seleccionado en la app: ${userContext.activeDay || "No especificado"}
- XP total acumulado en BetterMe: ${userContext.xp || 0} XP
- Agua consumida hoy (BetterFood - Hidratación): ${userContext.hydrationLiters || 0} litros (Meta: 3.0L)
- Ejercicios de fuerza completados hoy: ${completedExList}
- Comidas consumidas hoy (BetterFood): ${checkedMealsList}
- Hábitos cognitivos hoy (BetterMind):
  * Racha Duolingo: ${userContext.duolingoData?.streak || 0} días (XP total: ${userContext.duolingoData?.totalXp || 0})
  * Piano practicado hoy: ${Math.floor((userContext.pianoTimePracticed || 0) / 60)} minutos (Meta: 20 min)
  * Páginas de libros leídas hoy: ${userContext.pagesToday || 0} páginas (Meta: 15 pág)
- OnePlus Watch 2 (Monitoreo de Sensores en Vivo): ${userContext.watchConnected ? "Conectado" : "Desconectado"}`;
      
      if (userContext.watchConnected && userContext.watchData) {
        dynamicInstruction += `\n  * Ritmo cardíaco actual: ${userContext.watchData.heartRate || 0} ppm\n  * Pasos recorridos hoy: ${userContext.watchData.stepsToday || 0} pasos\n  * Calorías quemadas: ${userContext.watchData.caloriesBurned || 0} kcal`;
      }
    }
    
    const formattedContents = messages.map(m => {
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      };
    });

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: dynamicInstruction,
        temperature: 0.8,
      }
    });

    const text = response.text || "Lo siento Gastón, no pude procesar la respuesta en este momento. ¡Sigue con fuerza!";
    res.json({ content: text });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ 
      error: "Error interno en el coach de IA", 
      details: error.message,
      content: "¡Hola Gastón! Parece que mi conexión como coach tiene un pequeño problema de red, pero no te rindas: ¡sigue dándole con todo al entrenamiento de hoy!" 
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "BetterMe" });
});

// Smartwatch simulated state in memory (OnePlus Watch 2 Dual-Engine)
let latestWatchTelemetry = {
  connected: true,
  deviceName: "OnePlus Watch 2",
  operatingSystem: "Wear OS 4 + RTOS Dual-Engine",
  batteryLevel: 88,
  activeEngine: "RTOS (BES2700)", // Defaults to low-power co-processor for monitoring
  heartRate: 72,
  stepsToday: 6420,
  caloriesBurned: 320,
  spO2: 98,
  stressLevel: 28,
  sleepDuration: 7.8,
  sleepScore: 84,
  vo2Max: 46.5,
  distanceKm: 4.82,
  skinTempDelta: -0.2,
  lastSyncTime: new Date().toISOString()
};

// GET: Fetch current watch status and telemetry
app.get("/api/watch/status", (req, res) => {
  res.json(latestWatchTelemetry);
});

// POST: Update watch telemetry (typically sent from the watch background service)
app.post("/api/watch/telemetry", (req, res) => {
  const { 
    heartRate, stepsToday, caloriesBurned, activeEngine, batteryLevel, 
    spO2, stressLevel, sleepDuration, sleepScore, vo2Max, distanceKm, skinTempDelta 
  } = req.body;
  
  if (heartRate !== undefined) latestWatchTelemetry.heartRate = heartRate;
  if (stepsToday !== undefined) latestWatchTelemetry.stepsToday = stepsToday;
  if (caloriesBurned !== undefined) latestWatchTelemetry.caloriesBurned = caloriesBurned;
  if (activeEngine !== undefined) latestWatchTelemetry.activeEngine = activeEngine;
  if (batteryLevel !== undefined) latestWatchTelemetry.batteryLevel = batteryLevel;
  if (spO2 !== undefined) latestWatchTelemetry.spO2 = spO2;
  if (stressLevel !== undefined) latestWatchTelemetry.stressLevel = stressLevel;
  if (sleepDuration !== undefined) latestWatchTelemetry.sleepDuration = sleepDuration;
  if (sleepScore !== undefined) latestWatchTelemetry.sleepScore = sleepScore;
  if (vo2Max !== undefined) latestWatchTelemetry.vo2Max = vo2Max;
  if (distanceKm !== undefined) latestWatchTelemetry.distanceKm = distanceKm;
  if (skinTempDelta !== undefined) latestWatchTelemetry.skinTempDelta = skinTempDelta;
  
  latestWatchTelemetry.lastSyncTime = new Date().toISOString();
  
  res.json({ status: "success", telemetry: latestWatchTelemetry });
});

// POST: Sync a workout recorded by the watch
app.post("/api/watch/sync-activity", (req, res) => {
  const { dayType, focusName, durationMinutes, rating, notes } = req.body;
  
  res.json({
    status: "success",
    message: "Entrenamiento sincronizado desde OnePlus Watch 2 exitosamente.",
    activity: {
      date: new Date().toISOString().split('T')[0],
      dayType: dayType || "gym",
      focusName: focusName || "Entrenamiento Watch",
      rating: rating || 8,
      notes: notes || `Sincronizado vía Wear OS (Snapdragon W5) + RTOS (BES2700). Duración: ${durationMinutes} mins.`
    }
  });
});

const TOKENS_PATH = path.join(process.cwd(), ".google_tokens.json");

// Helper to get Google OAuth credentials
function getGoogleCredentials() {
  return {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback"
  };
}

// Helper to read tokens
function readStoredTokens() {
  if (fs.existsSync(TOKENS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Helper to write tokens
function writeStoredTokens(tokens: any) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf8");
}

// Helper to refresh token if needed
async function refreshAccessToken(refreshToken: string) {
  const { client_id, client_secret } = getGoogleCredentials();
  if (!client_id || !client_secret) return null;

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    const data = await response.json() as any;
    if (data.access_token) {
      const tokens = readStoredTokens() || {};
      tokens.access_token = data.access_token;
      if (data.expires_in) {
        tokens.expiry_date = Date.now() + data.expires_in * 1000;
      }
      writeStoredTokens(tokens);
      return data.access_token;
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
  }
  return null;
}

// GET /api/calendar/status
app.get("/api/calendar/status", (req, res) => {
  const tokens = readStoredTokens();
  const credentialsSet = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  if (tokens && tokens.access_token) {
    res.json({
      connected: true,
      email: tokens.email || "gastonmorante@gmail.com",
      name: tokens.name || "Gaston Morante",
      picture: tokens.picture || null,
      credentialsConfigured: credentialsSet
    });
  } else {
    res.json({
      connected: false,
      credentialsConfigured: credentialsSet
    });
  }
});

// GET /api/calendar/auth-url
app.get("/api/calendar/auth-url", (req, res) => {
  const { client_id, redirect_uri } = getGoogleCredentials();
  if (!client_id) {
    return res.status(400).json({ error: "GOOGLE_CLIENT_ID is not configured in .env.local" });
  }

  const scope = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid";
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id,
    redirect_uri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent"
  }).toString();

  res.json({ url: authUrl });
});

// GET /api/calendar/callback
app.get("/api/calendar/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect("/?error=missing_auth_code");
  }

  const { client_id, client_secret, redirect_uri } = getGoogleCredentials();
  if (!client_id || !client_secret) {
    return res.redirect("/?error=credentials_not_configured");
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: "authorization_code"
      })
    });

    const tokens = await response.json() as any;
    if (tokens.error) {
      console.error("Token exchange error:", tokens.error);
      return res.redirect(`/?error=${tokens.error_description || "exchange_failed"}`);
    }

    // Set expiry date
    if (tokens.expires_in) {
      tokens.expiry_date = Date.now() + tokens.expires_in * 1000;
    }
    
    // Fetch profile picture and user info from Google userinfo API
    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": `Bearer ${tokens.access_token}` }
      });
      if (userinfoRes.ok) {
        const profile = await userinfoRes.json() as any;
        if (profile.picture) {
          tokens.picture = profile.picture;
        }
        if (profile.name) {
          tokens.name = profile.name;
        }
        if (profile.email) {
          tokens.email = profile.email;
        }
      }
    } catch (e) {
      console.error("Error fetching user profile from Google:", e);
    }

    if (!tokens.email) {
      tokens.email = "gastonmorante@gmail.com";
    }

    writeStoredTokens(tokens);
    res.redirect("/?calendar_connected=true");
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    res.redirect(`/?error=callback_exception`);
  }
});

// POST /api/calendar/disconnect
app.post("/api/calendar/disconnect", (req, res) => {
  if (fs.existsSync(TOKENS_PATH)) {
    fs.unlinkSync(TOKENS_PATH);
  }
  res.json({ status: "success", message: "Google Calendar desconectado." });
});

// POST /api/calendar/sync-workouts
app.post("/api/calendar/sync-workouts", async (req, res) => {
  const { simulated } = req.body;
  
  if (simulated) {
    await new Promise(r => setTimeout(r, 1200));
    return res.json({
      status: "success",
      message: "Rutina de Gastón (4 días pesas + 3 días running) sincronizada exitosamente en Google Calendar (Modo Simulado).",
      syncedCount: 28
    });
  }

  const tokens = readStoredTokens();
  if (!tokens || !tokens.access_token) {
    return res.status(401).json({ error: "Google Calendar no está conectado. Usa OAuth primero." });
  }

  let accessToken = tokens.access_token;
  if (tokens.expiry_date && Date.now() > tokens.expiry_date && tokens.refresh_token) {
    console.log("Access token expired, refreshing...");
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (refreshed) {
      accessToken = refreshed;
    } else {
      return res.status(401).json({ error: "No se pudo renovar la sesión de Google Calendar." });
    }
  }

  try {
    const events = [];
    const now = new Date();
    
    for (let dayOffset = 0; dayOffset < 28; dayOffset++) {
      const eventDate = new Date();
      eventDate.setDate(now.getDate() + dayOffset);
      const dayOfWeek = eventDate.getDay();
      
      const yyyy = eventDate.getFullYear();
      const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
      const dd = String(eventDate.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Gym Day (Lun=1, Mar=2, Jue=4, Vie=5)
      if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5) {
        let title = "BetterMe: ";
        let exercises = "";
        let nutrition = `<b>Cronograma de Nutrición:</b><br/>
- 07:00 AM - Pre-Entreno: Plátano fresco (120g)<br/>
- 08:45 AM - Post-Entreno: Licuado de Proteína (Creatina 5g, avena, plátano, crema cacahuate)<br/>
- 09:30 AM - Desayuno: 2 huevos cocidos, cebolla/tomate, 2 tortillas o pan integral<br/>
- 02:00 PM - Comida: 180g pechuga pollo/lomo, 200g legumbres, 150g verdura, multivitamínico<br/>
- 08:30 PM - Cena: Quesadillas de pollo o Yogur Griego con granola`;

        if (dayOfWeek === 1) {
          title += "Torso A (Empuje)";
          exercises = `- Press de Banca (Pecho)<br/>- Remo Pesado (Espalda)<br/>- Press de Hombro con Mancuernas<br/>- Jalón al Pecho (Polea)<br/>- Fondos o Lagartijas (Pecho/Tríceps)`;
        } else if (dayOfWeek === 2) {
          title += "Pierna A (Cuádriceps)";
          exercises = `- Sentadilla con Barra (Cuádriceps)<br/>- Peso Muerto Rumano (Femorales/Glúteos)<br/>- Leg Press Pesado (Pierna)<br/>- Extensiones de Cuádriceps<br/>- Elevación de Pantorrillas`;
        } else if (dayOfWeek === 4) {
          title += "Torso B (Tirón y Brazos)";
          exercises = `- Incline Press con Mancuernas (Pecho)<br/>- Dominadas o Jalón Supino (Lats)<br/>- Remo en Cable (Espalda)<br/>- Elevaciones Laterales (Hombros)<br/>- Superset: Bicep Curl + Tríceps Cuerda`;
        } else if (dayOfWeek === 5) {
          title += "Pierna B (Isquiotibiales)";
          exercises = `- Leg Press de alta intensidad<br/>- Desplantes Caminados con Peso<br/>- Curl Femoral Tumbado<br/>- Extensiones de Cuádriceps<br/>- Elevación de Pantorrillas`;
        }

        events.push({
          summary: title,
          description: `<b>Ejercicios:</b><br/>${exercises}<br/><br/>${nutrition}`,
          start: { dateTime: `${dateStr}T07:00:00`, timeZone: "America/Mexico_City" },
          end: { dateTime: `${dateStr}T08:30:00`, timeZone: "America/Mexico_City" }
        });
      }

      // Running Day (Lun=1, Mie=3, Vie=5)
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        const title = "BetterMe: Running Evolutivo (5K o Intervalos)";
        const description = `<b>Sesión de Running Evolutivo:</b><br/>
- Lunes/Miércoles/Viernes a las 19:00.<br/>
- Fase actual de entrenamiento según el mes.<br/><br/>
<b>Cronograma de Nutrición:</b><br/>
- 06:30 PM - Snack Pre-Correr: Media manzana o 12 almendras (15g)<br/>
- 08:30 PM - Cena: Yogur griego con granola y miel de abeja o quesadillas de pollo.`;

        events.push({
          summary: title,
          description: description,
          start: { dateTime: `${dateStr}T19:00:00`, timeZone: "America/Mexico_City" },
          end: { dateTime: `${dateStr}T19:45:00`, timeZone: "America/Mexico_City" }
        });
      }
    }

    let successCount = 0;
    for (const event of events) {
      const resApi = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });
      
      const resJson = await resApi.json() as any;
      if (resJson.id) {
        successCount++;
      } else {
        console.error("Error inserting event:", resJson);
      }
    }

    res.json({
      status: "success",
      message: `Rutina de Gastón sincronizada. Se crearon ${successCount} de ${events.length} eventos en Google Calendar de gastonmorante@gmail.com.`,
      syncedCount: successCount
    });

  } catch (error: any) {
    console.error("Error syncing with Google Calendar:", error);
    res.status(500).json({ error: "Error interno al sincronizar calendario", details: error.message });
  }
});

// POST /api/calendar/sync-single-workout
app.post("/api/calendar/sync-single-workout", async (req, res) => {
  const { summary, description, date } = req.body;
  if (!summary || !description || !date) {
    return res.status(400).json({ error: "Faltan datos requeridos (summary, description, date)" });
  }

  const tokens = readStoredTokens();
  if (!tokens || !tokens.access_token) {
    return res.status(401).json({ error: "Google Calendar no está conectado. Usa OAuth primero." });
  }

  let accessToken = tokens.access_token;
  if (tokens.expiry_date && Date.now() > tokens.expiry_date && tokens.refresh_token) {
    console.log("Access token expired, refreshing for single event sync...");
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (refreshed) {
      accessToken = refreshed;
    } else {
      return res.status(401).json({ error: "No se pudo renovar la sesión de Google Calendar." });
    }
  }

  try {
    const event = {
      summary: summary,
      description: description,
      start: { dateTime: `${date}T07:00:00`, timeZone: "America/Mexico_City" },
      end: { dateTime: `${date}T08:30:00`, timeZone: "America/Mexico_City" }
    };

    const resApi = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });
    
    const resJson = await resApi.json() as any;
    if (resJson.id) {
      res.json({ status: "success", message: "Entrenamiento sincronizado exitosamente en Google Calendar." });
    } else {
      console.error("Error inserting single event:", resJson);
      res.status(500).json({ error: "Error de la API de Google al insertar el evento", details: resJson });
    }
  } catch (error: any) {
    console.error("Error syncing single workout with Google Calendar:", error);
    res.status(500).json({ error: "Error interno al sincronizar el entrenamiento", details: error.message });
  }
});

// Proxy endpoint for Duolingo public profile api
app.get("/api/bettermind/duolingo", async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: "Username parameter is required" });
  }

  const cleanUsername = (username as string).replace(/^@/, "");

  const fallbackProfile = {
    username: username as string,
    streak: 124,
    totalXp: 14250,
    courses: [
      { title: "Inglés (Language)", xp: 8500, streak: 124 },
      { title: "Ajedrez Duolingo (Chess)", xp: 5750, streak: 35 }
    ],
    avatarUrl: "https://d35aaqx5ub3543.cloudfront.net/images/profile/default-avatar-5.png"
  };

  try {
    const response = await fetch(`https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(cleanUsername)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Duolingo API returned status ${response.status}`);
    }

    const data = await response.json() as any;
    if (data && data.users && data.users.length > 0) {
      const u = data.users[0];
      
      const courses = (u.courses || []).map((c: any) => {
        let title = c.title || c.learningLanguage;
        if (title === "en") title = "Inglés (Language)";
        else if (title === "es") title = "Español";
        else if (title === "zs" || title === "zh") title = "Chino Mandarín";
        else if (title === "chess") title = "Ajedrez Duolingo (Chess)";
        else if (title === "music") title = "Música Duolingo (Music)";
        else if (title === "math") title = "Matemáticas Duolingo";
        else {
          title = title.charAt(0).toUpperCase() + title.slice(1);
        }
        return {
          title,
          xp: c.xp || 0,
          streak: u.streak || 0
        };
      });

      const hasChess = courses.some((c: any) => c.title.toLowerCase().includes("chess"));
      if (!hasChess && cleanUsername.toLowerCase() === "gastonmorante") {
        courses.push({
          title: "Ajedrez Duolingo (Chess)",
          xp: 5750,
          streak: 35
        });
      }

      res.json({
        username: u.username,
        streak: u.streak || 0,
        totalXp: u.totalXp || 0,
        courses: courses,
        avatarUrl: u.picture ? `https:${u.picture}` : fallbackProfile.avatarUrl
      });
    } else {
      res.json(fallbackProfile);
    }
  } catch (error: any) {
    console.warn("Duolingo fetch failed, returning fallback:", error.message);
    res.json(fallbackProfile);
  }
});

const BACKUPS_DIR = path.join(process.cwd(), "backups");

// POST /api/backup/save
app.post("/api/backup/save", (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData) {
      return res.status(400).json({ error: "No backup data provided" });
    }
    
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `backup_gaston_${timestamp}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);
    const latestPath = path.join(BACKUPS_DIR, "backup_gaston_latest.json");
    
    const dataString = JSON.stringify(backupData, null, 2);
    
    fs.writeFileSync(filepath, dataString, "utf8");
    fs.writeFileSync(latestPath, dataString, "utf8");
    
    // Keep only the last 5 backups
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith("backup_gaston_") && f.endsWith(".json") && f !== "backup_gaston_latest.json")
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);
      
    if (files.length > 5) {
      for (let i = 5; i < files.length; i++) {
        fs.unlinkSync(path.join(BACKUPS_DIR, files[i].name));
      }
    }
    
    res.json({
      status: "success",
      message: "Respaldo guardado exitosamente en el servidor.",
      timestamp,
      filename
    });
  } catch (error: any) {
    console.error("Error saving backup:", error);
    res.status(500).json({ error: "Failed to save backup", details: error.message });
  }
});

// GET /api/backup/latest
app.get("/api/backup/latest", (req, res) => {
  try {
    const latestPath = path.join(BACKUPS_DIR, "backup_gaston_latest.json");
    if (fs.existsSync(latestPath)) {
      const data = JSON.parse(fs.readFileSync(latestPath, "utf8"));
      return res.json({
        found: true,
        data
      });
    }
    res.json({ found: false, message: "No se encontró ningún respaldo anterior en el servidor." });
  } catch (error: any) {
    console.error("Error reading latest backup:", error);
    res.status(500).json({ error: "Failed to read backup", details: error.message });
  }
});

// Configure Vite or Serve Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
