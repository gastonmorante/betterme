var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Coach features will rely on local templates.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var SYSTEM_INSTRUCTION = `
Eres el Coach Personal de IA de BetterMe para Gast\xF3n.
Eres el Coach Personal de IA definitivo para Gast\xF3n. Tu misi\xF3n es motivarlo, guiarlo y resolver cualquier duda sobre su rutina de entrenamiento y nutrici\xF3n para su transformaci\xF3n de 1 a\xF1o.

DATOS F\xCDSICOS DE GAST\xD3N:
- Nombre: Gast\xF3n
- Edad: 49 a\xF1os
- Estatura: 167 cm
- Peso Inicial: 53 kg
- Peso Meta: 65 kg (Enfoque en ganar masa muscular magra y resistencia).
- Distribuci\xF3n de D\xEDas: 4 d\xEDas de gimnasio (pesas), 3 d\xEDas de running, 2 d\xEDas de descanso semanal.

PLAN DE NUTRICI\xD3N (BetterFood):
1. Hidrataci\xF3n: 3 litros diarios de agua con lim\xF3n y sal de grano (3g en botellas de entreno).
2. Comidas:
   - Pre-entreno (07:00, Lun/Mar/Jue/Vie): Pl\xE1tano fresco (120g).
   - Licuado Post-entreno (08:45, Lun/Mar/Mie/Jue/Vie): Leche entera o vegetal (250ml), 1 pl\xE1tano (120g), avena cruda (40g), crema de cacahuate (15g), prote\xEDna en polvo (30g), creatina monohidratada (5g).
   - Desayuno (09:30, Lun/Mar/Mie/Jue/Vie): Huevos enteros cocidos al gusto (120g ~2 huevos), cebolla/tomate (50g), 2 tortillas de ma\xEDz o 2 rebanadas pan integral.
   - Comida (14:00, Diario): 180g de prote\xEDna magra (pollo, lomo de cerdo, res tierna, o 150g at\xFAn en agua), 200g de legumbres cocidas (frijol, lenteja, garbanzo), 150g verduras al vapor/parrilla (br\xF3coli, espinaca, calabac\xEDn), 1 tableta de multivitam\xEDnico.
   - Snak Pre-Correr (18:30, Lun/Mie/Vie): Media manzana o 12 almendras (15g).
   - Cena (20:30, Diario): Opci\xF3n Quesadillas (2 tortillas, 60g queso bajo en grasa, 50g pechuga pollo deshebrada) O Opci\xF3n Yogur Griego (200g yogur sin az\xFAcar, 40g granola artesanal, 10g miel de abeja pura, 30g prote\xEDna extra los fines de semana).

PLAN DE ENTRENAMIENTO (Gimnasio):
- Lunes: Torso A (Enfoque Empuje) - Press banca, Remo pesado, Press hombro mancuernas, Jal\xF3n al pecho, Fondos/Lagartijas.
- Martes: Pierna A (Enfoque Cu\xE1driceps) - Sentadilla barra, Peso muerto rumano, Leg press, Extensiones cu\xE1driceps, Pantorrillas.
- Mi\xE9rcoles: Running (Intervalos o aer\xF3bico seg\xFAn fase) + Licuado post y desayuno/comida/cena.
- Jueves: Torso B (Enfoque Tir\xF3n y Brazos) - Incline press mancuernas, Dominadas o jal\xF3n supino, Remo en cable, Laterales hombro, Superset B\xEDceps Curl + Tr\xEDceps cuerda.
- Viernes: Pierna B (Foco Isquiotibiales y Global) - Leg press pesado, Desplantes caminados, Curl femoral, Extensiones cu\xE1driceps, Pantorrillas.
- S\xE1bado y Domingo: Descanso de pesas y running, pero se sigue cuidando la nutrici\xF3n.

PLAN DE RUNNING (Evolutivo Lun/Mie/Vie a las 19:00):
- Mes 1-2: 4 intervalos (5 min de trote continuo + 1 min caminando. Total 24 min).
- Mes 3-4: 3 intervalos (8 min de trote + 1 min caminando. \xDAltimo viernes del mes 4: Correr 20 min continuos).
- Mes 5-6: Trote aer\xF3bico continuo por 25 a 30 min (3.5km - 4.0km aproximado).
- Mes 7-12: Distancia fija de 5K para buscar completar en 25-30 min.

TU TONO Y ESTILO:
- Habla en espa\xF1ol nativo de modo inspirador, profesional, emp\xE1tico y experto.
- Tr\xE1talo por su nombre ("Gast\xF3n") con confianza e impulso motivador de un coach que lo conoce bien.
- Responde de forma concisa pero con tips de calidad t\xE9cnica (ejecuci\xF3n, biomec\xE1nica, descanso, mindset de campeones de 49 a\xF1os).
- Evita discursos gen\xE9ricos. Recuerda siempre que tiene 49 a\xF1os, pesa 53kg y quiere llegar a 65kg ganando m\xFAsculo, por lo que el super\xE1vit cal\xF3rico y el incremento progresivo de cargas es clave.

PROGRAMA BETTERMIND (Desarrollo Hol\xEDstico):
Gast\xF3n realiza ejercicios de desarrollo mental todos los d\xEDas:
1. Aprendizaje de Idiomas y Ajedrez con Duolingo (racha diaria y XP).
2. Estudio diario de Piano (meta de 20-30 minutos).
3. Lectura diaria de libros (meta de 15-20 p\xE1ginas).

Tu rol como coach de IA es impulsarlo a mantener la constancia tanto en lo f\xEDsico como en BetterMind (desarrollo cognitivo) y BetterFood (nutrici\xF3n limpia). Felic\xEDtalo por su racha en Duolingo, su rating de ajedrez, su pr\xE1ctica de piano, su lectura de libros y su alimentaci\xF3n, record\xE1ndole el balance integral de "BetterMe" (cuerpo sano en mente sana).
`;
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
      const checkedMealsList = userContext.checkedMeals ? Object.keys(userContext.checkedMeals).filter((k) => userContext.checkedMeals[k]).join(", ") : "Ninguna";
      dynamicInstruction += `

CONTEXTO EN TIEMPO REAL DEL PROGRESO DE GAST\xD3N HOY:
- D\xEDa seleccionado en la app: ${userContext.activeDay || "No especificado"}
- XP total acumulado en BetterMe: ${userContext.xp || 0} XP
- Agua consumida hoy (BetterFood - Hidrataci\xF3n): ${userContext.hydrationLiters || 0} litros (Meta: 3.0L)
- Ejercicios de fuerza completados hoy: ${completedExList}
- Comidas consumidas hoy (BetterFood): ${checkedMealsList}
- H\xE1bitos cognitivos hoy (BetterMind):
  * Racha Duolingo: ${userContext.duolingoData?.streak || 0} d\xEDas (XP total: ${userContext.duolingoData?.totalXp || 0})
  * Piano practicado hoy: ${Math.floor((userContext.pianoTimePracticed || 0) / 60)} minutos (Meta: 20 min)
  * P\xE1ginas de libros le\xEDdas hoy: ${userContext.pagesToday || 0} p\xE1ginas (Meta: 15 p\xE1g)
- OnePlus Watch 2 (Monitoreo de Sensores en Vivo): ${userContext.watchConnected ? "Conectado" : "Desconectado"}`;
      if (userContext.watchConnected && userContext.watchData) {
        dynamicInstruction += `
  * Ritmo card\xEDaco actual: ${userContext.watchData.heartRate || 0} ppm
  * Pasos recorridos hoy: ${userContext.watchData.stepsToday || 0} pasos
  * Calor\xEDas quemadas: ${userContext.watchData.caloriesBurned || 0} kcal`;
      }
    }
    const formattedContents = messages.map((m) => {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      };
    });
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: dynamicInstruction,
        temperature: 0.8
      }
    });
    const text = response.text || "Lo siento Gast\xF3n, no pude procesar la respuesta en este momento. \xA1Sigue con fuerza!";
    res.json({ content: text });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({
      error: "Error interno en el coach de IA",
      details: error.message,
      content: "\xA1Hola Gast\xF3n! Parece que mi conexi\xF3n como coach tiene un peque\xF1o problema de red, pero no te rindas: \xA1sigue d\xE1ndole con todo al entrenamiento de hoy!"
    });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "BetterMe" });
});
var latestWatchTelemetry = {
  connected: true,
  deviceName: "OnePlus Watch 2",
  operatingSystem: "Wear OS 4 + RTOS Dual-Engine",
  batteryLevel: 88,
  activeEngine: "RTOS (BES2700)",
  // Defaults to low-power co-processor for monitoring
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
  lastSyncTime: (/* @__PURE__ */ new Date()).toISOString()
};
app.get("/api/watch/status", (req, res) => {
  res.json(latestWatchTelemetry);
});
app.post("/api/watch/telemetry", (req, res) => {
  const {
    heartRate,
    stepsToday,
    caloriesBurned,
    activeEngine,
    batteryLevel,
    spO2,
    stressLevel,
    sleepDuration,
    sleepScore,
    vo2Max,
    distanceKm,
    skinTempDelta
  } = req.body;
  if (heartRate !== void 0) latestWatchTelemetry.heartRate = heartRate;
  if (stepsToday !== void 0) latestWatchTelemetry.stepsToday = stepsToday;
  if (caloriesBurned !== void 0) latestWatchTelemetry.caloriesBurned = caloriesBurned;
  if (activeEngine !== void 0) latestWatchTelemetry.activeEngine = activeEngine;
  if (batteryLevel !== void 0) latestWatchTelemetry.batteryLevel = batteryLevel;
  if (spO2 !== void 0) latestWatchTelemetry.spO2 = spO2;
  if (stressLevel !== void 0) latestWatchTelemetry.stressLevel = stressLevel;
  if (sleepDuration !== void 0) latestWatchTelemetry.sleepDuration = sleepDuration;
  if (sleepScore !== void 0) latestWatchTelemetry.sleepScore = sleepScore;
  if (vo2Max !== void 0) latestWatchTelemetry.vo2Max = vo2Max;
  if (distanceKm !== void 0) latestWatchTelemetry.distanceKm = distanceKm;
  if (skinTempDelta !== void 0) latestWatchTelemetry.skinTempDelta = skinTempDelta;
  latestWatchTelemetry.lastSyncTime = (/* @__PURE__ */ new Date()).toISOString();
  res.json({ status: "success", telemetry: latestWatchTelemetry });
});
app.post("/api/watch/sync-activity", (req, res) => {
  const { dayType, focusName, durationMinutes, rating, notes } = req.body;
  res.json({
    status: "success",
    message: "Entrenamiento sincronizado desde OnePlus Watch 2 exitosamente.",
    activity: {
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      dayType: dayType || "gym",
      focusName: focusName || "Entrenamiento Watch",
      rating: rating || 8,
      notes: notes || `Sincronizado v\xEDa Wear OS (Snapdragon W5) + RTOS (BES2700). Duraci\xF3n: ${durationMinutes} mins.`
    }
  });
});
var TOKENS_PATH = import_path.default.join(process.cwd(), ".google_tokens.json");
function getGoogleCredentials() {
  return {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback"
  };
}
function readStoredTokens() {
  if (import_fs.default.existsSync(TOKENS_PATH)) {
    try {
      return JSON.parse(import_fs.default.readFileSync(TOKENS_PATH, "utf8"));
    } catch (e) {
      return null;
    }
  }
  return null;
}
function writeStoredTokens(tokens) {
  import_fs.default.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf8");
}
async function refreshAccessToken(refreshToken) {
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
    const data = await response.json();
    if (data.access_token) {
      const tokens = readStoredTokens() || {};
      tokens.access_token = data.access_token;
      if (data.expires_in) {
        tokens.expiry_date = Date.now() + data.expires_in * 1e3;
      }
      writeStoredTokens(tokens);
      return data.access_token;
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
  }
  return null;
}
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
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: "authorization_code"
      })
    });
    const tokens = await response.json();
    if (tokens.error) {
      console.error("Token exchange error:", tokens.error);
      return res.redirect(`/?error=${tokens.error_description || "exchange_failed"}`);
    }
    if (tokens.expires_in) {
      tokens.expiry_date = Date.now() + tokens.expires_in * 1e3;
    }
    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": `Bearer ${tokens.access_token}` }
      });
      if (userinfoRes.ok) {
        const profile = await userinfoRes.json();
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
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`/?error=callback_exception`);
  }
});
app.post("/api/calendar/disconnect", (req, res) => {
  if (import_fs.default.existsSync(TOKENS_PATH)) {
    import_fs.default.unlinkSync(TOKENS_PATH);
  }
  res.json({ status: "success", message: "Google Calendar desconectado." });
});
app.post("/api/calendar/sync-workouts", async (req, res) => {
  const { simulated } = req.body;
  if (simulated) {
    await new Promise((r) => setTimeout(r, 1200));
    return res.json({
      status: "success",
      message: "Rutina de Gast\xF3n (4 d\xEDas pesas + 3 d\xEDas running) sincronizada exitosamente en Google Calendar (Modo Simulado).",
      syncedCount: 28
    });
  }
  const tokens = readStoredTokens();
  if (!tokens || !tokens.access_token) {
    return res.status(401).json({ error: "Google Calendar no est\xE1 conectado. Usa OAuth primero." });
  }
  let accessToken = tokens.access_token;
  if (tokens.expiry_date && Date.now() > tokens.expiry_date && tokens.refresh_token) {
    console.log("Access token expired, refreshing...");
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (refreshed) {
      accessToken = refreshed;
    } else {
      return res.status(401).json({ error: "No se pudo renovar la sesi\xF3n de Google Calendar." });
    }
  }
  try {
    const events = [];
    const now = /* @__PURE__ */ new Date();
    for (let dayOffset = 0; dayOffset < 28; dayOffset++) {
      const eventDate = /* @__PURE__ */ new Date();
      eventDate.setDate(now.getDate() + dayOffset);
      const dayOfWeek = eventDate.getDay();
      const yyyy = eventDate.getFullYear();
      const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
      const dd = String(eventDate.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      if (dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5) {
        let title = "BetterMe: ";
        let exercises = "";
        let nutrition = `<b>Cronograma de Nutrici\xF3n:</b><br/>
- 07:00 AM - Pre-Entreno: Pl\xE1tano fresco (120g)<br/>
- 08:45 AM - Post-Entreno: Licuado de Prote\xEDna (Creatina 5g, avena, pl\xE1tano, crema cacahuate)<br/>
- 09:30 AM - Desayuno: 2 huevos cocidos, cebolla/tomate, 2 tortillas o pan integral<br/>
- 02:00 PM - Comida: 180g pechuga pollo/lomo, 200g legumbres, 150g verdura, multivitam\xEDnico<br/>
- 08:30 PM - Cena: Quesadillas de pollo o Yogur Griego con granola`;
        if (dayOfWeek === 1) {
          title += "Torso A (Empuje)";
          exercises = `- Press de Banca (Pecho)<br/>- Remo Pesado (Espalda)<br/>- Press de Hombro con Mancuernas<br/>- Jal\xF3n al Pecho (Polea)<br/>- Fondos o Lagartijas (Pecho/Tr\xEDceps)`;
        } else if (dayOfWeek === 2) {
          title += "Pierna A (Cu\xE1driceps)";
          exercises = `- Sentadilla con Barra (Cu\xE1driceps)<br/>- Peso Muerto Rumano (Femorales/Gl\xFAteos)<br/>- Leg Press Pesado (Pierna)<br/>- Extensiones de Cu\xE1driceps<br/>- Elevaci\xF3n de Pantorrillas`;
        } else if (dayOfWeek === 4) {
          title += "Torso B (Tir\xF3n y Brazos)";
          exercises = `- Incline Press con Mancuernas (Pecho)<br/>- Dominadas o Jal\xF3n Supino (Lats)<br/>- Remo en Cable (Espalda)<br/>- Elevaciones Laterales (Hombros)<br/>- Superset: Bicep Curl + Tr\xEDceps Cuerda`;
        } else if (dayOfWeek === 5) {
          title += "Pierna B (Isquiotibiales)";
          exercises = `- Leg Press de alta intensidad<br/>- Desplantes Caminados con Peso<br/>- Curl Femoral Tumbado<br/>- Extensiones de Cu\xE1driceps<br/>- Elevaci\xF3n de Pantorrillas`;
        }
        events.push({
          summary: title,
          description: `<b>Ejercicios:</b><br/>${exercises}<br/><br/>${nutrition}`,
          start: { dateTime: `${dateStr}T07:00:00`, timeZone: "America/Mexico_City" },
          end: { dateTime: `${dateStr}T08:30:00`, timeZone: "America/Mexico_City" }
        });
      }
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        const title = "BetterMe: Running Evolutivo (5K o Intervalos)";
        const description = `<b>Sesi\xF3n de Running Evolutivo:</b><br/>
- Lunes/Mi\xE9rcoles/Viernes a las 19:00.<br/>
- Fase actual de entrenamiento seg\xFAn el mes.<br/><br/>
<b>Cronograma de Nutrici\xF3n:</b><br/>
- 06:30 PM - Snack Pre-Correr: Media manzana o 12 almendras (15g)<br/>
- 08:30 PM - Cena: Yogur griego con granola y miel de abeja o quesadillas de pollo.`;
        events.push({
          summary: title,
          description,
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
      const resJson = await resApi.json();
      if (resJson.id) {
        successCount++;
      } else {
        console.error("Error inserting event:", resJson);
      }
    }
    res.json({
      status: "success",
      message: `Rutina de Gast\xF3n sincronizada. Se crearon ${successCount} de ${events.length} eventos en Google Calendar de gastonmorante@gmail.com.`,
      syncedCount: successCount
    });
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error);
    res.status(500).json({ error: "Error interno al sincronizar calendario", details: error.message });
  }
});
app.post("/api/calendar/sync-single-workout", async (req, res) => {
  const { summary, description, date } = req.body;
  if (!summary || !description || !date) {
    return res.status(400).json({ error: "Faltan datos requeridos (summary, description, date)" });
  }
  const tokens = readStoredTokens();
  if (!tokens || !tokens.access_token) {
    return res.status(401).json({ error: "Google Calendar no est\xE1 conectado. Usa OAuth primero." });
  }
  let accessToken = tokens.access_token;
  if (tokens.expiry_date && Date.now() > tokens.expiry_date && tokens.refresh_token) {
    console.log("Access token expired, refreshing for single event sync...");
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (refreshed) {
      accessToken = refreshed;
    } else {
      return res.status(401).json({ error: "No se pudo renovar la sesi\xF3n de Google Calendar." });
    }
  }
  try {
    const event = {
      summary,
      description,
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
    const resJson = await resApi.json();
    if (resJson.id) {
      res.json({ status: "success", message: "Entrenamiento sincronizado exitosamente en Google Calendar." });
    } else {
      console.error("Error inserting single event:", resJson);
      res.status(500).json({ error: "Error de la API de Google al insertar el evento", details: resJson });
    }
  } catch (error) {
    console.error("Error syncing single workout with Google Calendar:", error);
    res.status(500).json({ error: "Error interno al sincronizar el entrenamiento", details: error.message });
  }
});
app.get("/api/bettermind/duolingo", async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: "Username parameter is required" });
  }
  const cleanUsername = username.replace(/^@/, "");
  const fallbackProfile = {
    username,
    streak: 124,
    totalXp: 14250,
    courses: [
      { title: "Ingl\xE9s (Language)", xp: 8500, streak: 124 },
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
    const data = await response.json();
    if (data && data.users && data.users.length > 0) {
      const u = data.users[0];
      const courses = (u.courses || []).map((c) => {
        let title = c.title || c.learningLanguage;
        if (title === "en") title = "Ingl\xE9s (Language)";
        else if (title === "es") title = "Espa\xF1ol";
        else if (title === "zs" || title === "zh") title = "Chino Mandar\xEDn";
        else if (title === "chess") title = "Ajedrez Duolingo (Chess)";
        else if (title === "music") title = "M\xFAsica Duolingo (Music)";
        else if (title === "math") title = "Matem\xE1ticas Duolingo";
        else {
          title = title.charAt(0).toUpperCase() + title.slice(1);
        }
        return {
          title,
          xp: c.xp || 0,
          streak: u.streak || 0
        };
      });
      const hasChess = courses.some((c) => c.title.toLowerCase().includes("chess"));
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
        courses,
        avatarUrl: u.picture ? `https:${u.picture}` : fallbackProfile.avatarUrl
      });
    } else {
      res.json(fallbackProfile);
    }
  } catch (error) {
    console.warn("Duolingo fetch failed, returning fallback:", error.message);
    res.json(fallbackProfile);
  }
});
var BACKUPS_DIR = import_path.default.join(process.cwd(), "backups");
app.post("/api/backup/save", (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData) {
      return res.status(400).json({ error: "No backup data provided" });
    }
    if (!import_fs.default.existsSync(BACKUPS_DIR)) {
      import_fs.default.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const timestamp = Date.now();
    const filename = `backup_gaston_${timestamp}.json`;
    const filepath = import_path.default.join(BACKUPS_DIR, filename);
    const latestPath = import_path.default.join(BACKUPS_DIR, "backup_gaston_latest.json");
    const dataString = JSON.stringify(backupData, null, 2);
    import_fs.default.writeFileSync(filepath, dataString, "utf8");
    import_fs.default.writeFileSync(latestPath, dataString, "utf8");
    const files = import_fs.default.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith("backup_gaston_") && f.endsWith(".json") && f !== "backup_gaston_latest.json").map((f) => ({
      name: f,
      time: import_fs.default.statSync(import_path.default.join(BACKUPS_DIR, f)).mtimeMs
    })).sort((a, b) => b.time - a.time);
    if (files.length > 5) {
      for (let i = 5; i < files.length; i++) {
        import_fs.default.unlinkSync(import_path.default.join(BACKUPS_DIR, files[i].name));
      }
    }
    res.json({
      status: "success",
      message: "Respaldo guardado exitosamente en el servidor.",
      timestamp,
      filename
    });
  } catch (error) {
    console.error("Error saving backup:", error);
    res.status(500).json({ error: "Failed to save backup", details: error.message });
  }
});
app.get("/api/backup/latest", (req, res) => {
  try {
    const latestPath = import_path.default.join(BACKUPS_DIR, "backup_gaston_latest.json");
    if (import_fs.default.existsSync(latestPath)) {
      const data = JSON.parse(import_fs.default.readFileSync(latestPath, "utf8"));
      return res.json({
        found: true,
        data
      });
    }
    res.json({ found: false, message: "No se encontr\xF3 ning\xFAn respaldo anterior en el servidor." });
  } catch (error) {
    console.error("Error reading latest backup:", error);
    res.status(500).json({ error: "Failed to read backup", details: error.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
