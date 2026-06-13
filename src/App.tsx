import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Flame,
  Dumbbell,
  Droplet,
  Calendar,
  ChevronRight,
  Plus,
  Trash2,
  Trophy,
  Award,
  Crown,
  Heart,
  MessageSquare,
  Send,
  User,
  Activity,
  Footprints,
  Play,
  Pause,
  RotateCcw,
  Zap,
  ChevronDown,
  Info,
  Apple,
  CheckCircle2,
  UtensilsCrossed,
  Weight,
  CalendarCheck,
  Share2,
  Download,
  Watch
} from "lucide-react";
import { TRAINING_PLAN, RUNNING_PHASES, DEFAULT_REWARDS, INITIAL_WEIGHT_LOGS, EXERCISE_DETAILS } from "./constants";
import { WeightLog, CoachMessage, Reward, LoggedWorkout } from "./types";
import ExerciseAnimator from "./components/ExerciseAnimator";
import { Brain, BookOpen, Music, Check, LogOut, Book, CheckSquare } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  initAuth, 
  googleSignIn, 
  userLogout, 
  addActivityLogDb, 
  getActivityLogsDb, 
  deleteActivityLogDb, 
  syncToGoogleCalendar, 
  DbActivityLog 
} from "./lib/firebase";

export default function App() {
  // Navigation & Tabs
  const [currentTab, setCurrentTab] = useState<'hoy' | 'programa' | 'ejercicios' | 'logros' | 'coach' | 'watch' | 'calendar' | 'bettermind'>('hoy');
  
  // Current Selected Day of the week for planning
  const [activeDay, setActiveDay] = useState<string>("monday");
  
  // Firebase Auth state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [dbLogs, setDbLogs] = useState<DbActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Daily activity logging state
  const [logFeeling, setLogFeeling] = useState<string>("excelente");
  const [logRating, setLogRating] = useState<number>(10);
  const [logNotes, setLogNotes] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logDayType, setLogDayType] = useState<'gym' | 'run' | 'rest'>('gym');
  const [logExercises, setLogExercises] = useState<string[]>([]);
  const [logFocusName, setLogFocusName] = useState<string>("");
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);
  
  // Localized state values (loaded from localStorage if present)
  const [xp, setXp] = useState<number>(0);
  const [hydrationLiters, setHydrationLiters] = useState<number>(0); // Tracker in Liters
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(INITIAL_WEIGHT_LOGS);
  const [newWeight, setNewWeight] = useState<string>("");
  const [weightDate, setWeightDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [loggedWorkouts, setLoggedWorkouts] = useState<LoggedWorkout[]>([]);
  const [chatMessages, setChatMessages] = useState<CoachMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [activeRunningPhase, setActiveRunningPhase] = useState<number>(0); // default Months 1-2
  
  // Selected exercise for visual animator
  const [selectedExercise, setSelectedExercise] = useState<string>("Flat barbell bench press");

  // Running intervals timer state
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'walking' | 'done'>('idle');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(300); // 5 mins in seconds = 300
  const [timerTotalElapsed, setTimerTotalElapsed] = useState<number>(0);
  const [timerCurrentInterval, setTimerCurrentInterval] = useState<number>(1);
  const timerRef = useRef<number | null>(null);

  // Auto scroll coach chats
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // OnePlus Watch 2 (Wear OS + RTOS) Integration State
  const [watchConnected, setWatchConnected] = useState<boolean>(true);
  const [watchData, setWatchData] = useState({
    stepsToday: 6420,
    heartRate: 72,
    caloriesBurned: 320,
    activeEngine: "RTOS (BES2700)", // Low-power co-processor
    batteryLevel: 88,
    lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    spO2: 98,              // Blood Oxygen %
    stressLevel: 28,       // Stress index 1-100 (HRV based)
    sleepDuration: 7.8,    // In hours
    sleepScore: 84,        // Sleep index 1-100
    vo2Max: 46.5,          // Cardiorespiratory fitness ml/kg/min
    distanceKm: 4.82,      // Distance walked/run
    skinTempDelta: -0.2    // Skin temp deviation vs baseline in °C
  });
  const [hrHistory, setHrHistory] = useState<number[]>([72, 70, 71, 73, 72, 75, 76, 74, 72, 73, 71, 72, 73, 74, 75]);
  const [isSyncingWatch, setIsSyncingWatch] = useState<boolean>(false);


  // Google Calendar State
  const [calendarConnected, setCalendarConnected] = useState<boolean>(false);
  const [calendarEmail, setCalendarEmail] = useState<string>("gastonmorante@gmail.com");
  const [calendarUserName, setCalendarUserName] = useState<string>("Gastón Morante");
  const [calendarUserPicture, setCalendarUserPicture] = useState<string | null>(null);
  const [calendarSimulated, setCalendarSimulated] = useState<boolean>(true);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);

  // Backup & Reset States
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // StrongMind State
  const [duolingoUser, setDuolingoUser] = useState<string>(() => localStorage.getItem("gaston_duolingo_user") || "GASTONMORANTE");
  const [duolingoData, setDuolingoData] = useState<any>(() => {
    const saved = localStorage.getItem("gaston_duolingo_data");
    return saved ? JSON.parse(saved) : {
      username: "GASTONMORANTE",
      streak: 124,
      totalXp: 14250,
      courses: [
        { title: "Inglés (Language)", xp: 8500, streak: 124 },
        { title: "Ajedrez Duolingo (Chess)", xp: 5750, streak: 35 }
      ],
      avatarUrl: "https://d35aaqx5ub3543.cloudfront.net/images/profile/default-avatar-5.png"
    };
  });
  const [duolingoLoading, setDuolingoLoading] = useState<boolean>(false);

  // Piano State
  const [pianoTimerActive, setPianoTimerActive] = useState<boolean>(false);
  const [pianoTimePracticed, setPianoTimePracticed] = useState<number>(() => parseInt(localStorage.getItem("gaston_piano_today_seconds") || "0"));
  const [pianoLogs, setPianoLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem("gaston_piano_logs");
    return saved ? JSON.parse(saved) : [
      { date: "2026-06-10", durationMinutes: 25, song: "Para Elisa - Beethoven" },
      { date: "2026-06-11", durationMinutes: 20, song: "Claro de Luna - Debussy" }
    ];
  });
  const [pianoSongName, setPianoSongName] = useState<string>("");

  // Reading State
  const [readingLogs, setReadingLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem("gaston_reading_logs");
    return saved ? JSON.parse(saved) : [
      { date: "2026-06-10", title: "Hábitos Atómicos", pagesRead: 15 },
      { date: "2026-06-11", title: "Hábitos Atómicos", pagesRead: 20 }
    ];
  });
  const [readingTitle, setReadingTitle] = useState<string>("");
  const [readingPages, setReadingPages] = useState<string>("");

  // Daily Habits Checklist State
  const [habitsChecked, setHabitsChecked] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("gaston_habits_checked");
    const savedDate = localStorage.getItem("gaston_habits_date");
    const today = new Date().toDateString();
    if (saved && savedDate === today) {
      return JSON.parse(saved);
    }
    return { duolingo: false, piano: false, reading: false };
  });

  useEffect(() => {
    localStorage.setItem("gaston_habits_checked", JSON.stringify(habitsChecked));
    localStorage.setItem("gaston_habits_date", new Date().toDateString());
  }, [habitsChecked]);

  // Load Calendar Connection Status on Mount
  const checkCalendarStatus = async () => {
    try {
      const res = await fetch("/api/calendar/status");
      if (res.ok) {
        const data = await res.json();
        setCalendarConnected(data.connected);
        if (data.email) setCalendarEmail(data.email);
        if (data.name) setCalendarUserName(data.name);
        if (data.picture) setCalendarUserPicture(data.picture);
        if (data.credentialsConfigured) {
          setCalendarSimulated(false);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch calendar status, using default simulation", e);
    }
  };

  // Trigger backup payload creation
  const triggerAutoBackup = async (payload: any) => {
    try {
      // 1. Save locally
      localStorage.setItem("betterme_last_backup_data", JSON.stringify(payload));
      localStorage.setItem("betterme_last_backup_time", Date.now().toString());
      
      // 2. Save on server
      const res = await fetch("/api/backup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log("Respaldo automático de 24 horas guardado en el servidor.");
      }
    } catch (e) {
      console.warn("Error running auto backup", e);
    }
  };

  useEffect(() => {
    checkCalendarStatus();

    // Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Auto backup check: if 24 hours have passed, create a backup
    const lastBackupStr = localStorage.getItem("betterme_last_backup_time");
    const lastBackup = lastBackupStr ? parseInt(lastBackupStr, 10) : 0;
    const now = Date.now();
    
    // Trigger auto backup if never backed up or 24 hours passed
    if (now - lastBackup > 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        const payload = {
          xp: parseInt(localStorage.getItem("gaston_xp") || "0", 10),
          hydrationLiters: parseFloat(localStorage.getItem("gaston_hydration") || "0"),
          checkedMeals: JSON.parse(localStorage.getItem("gaston_meals") || "{}"),
          weightLogs: JSON.parse(localStorage.getItem("gaston_weights") || "[]"),
          completedExercises: JSON.parse(localStorage.getItem("gaston_completed_ex") || "[]"),
          chatMessages: JSON.parse(localStorage.getItem("gaston_chat_history") || "[]"),
          duolingoUser: localStorage.getItem("gaston_duolingo_user") || "GASTONMORANTE",
          duolingoData: JSON.parse(localStorage.getItem("gaston_duolingo_data") || "{}"),
          pianoTimePracticed: parseInt(localStorage.getItem("gaston_piano_today_seconds") || "0", 10),
          pianoLogs: JSON.parse(localStorage.getItem("gaston_piano_logs") || "[]"),
          readingLogs: JSON.parse(localStorage.getItem("gaston_reading_logs") || "[]"),
          habitsChecked: JSON.parse(localStorage.getItem("gaston_habits_checked") || "{}"),
          backupTimestamp: now
        };
        triggerAutoBackup(payload);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) {
      alert("Para instalar BetterMe en tu PC o Celular:\n\n1. En Chrome/Edge (PC): Haz clic en el icono de descarga (🖥️ / ➕) que aparece en la barra de direcciones.\n2. En Android (Chrome): Haz clic en los tres puntos superiores > 'Instalar aplicación' o 'Añadir a pantalla de inicio'.\n3. En iOS (Safari): Presiona 'Compartir' > 'Añadir a pantalla de inicio'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleRestoreBackup = (backup: any) => {
    try {
      if (!backup) return;
      
      if (backup.xp !== undefined) {
        setXp(backup.xp);
        localStorage.setItem("gaston_xp", backup.xp.toString());
      }
      if (backup.hydrationLiters !== undefined) {
        setHydrationLiters(backup.hydrationLiters);
        localStorage.setItem("gaston_hydration", backup.hydrationLiters.toString());
      }
      if (backup.checkedMeals !== undefined) {
        setCheckedMeals(backup.checkedMeals);
        localStorage.setItem("gaston_meals", JSON.stringify(backup.checkedMeals));
      }
      if (backup.weightLogs !== undefined) {
        setWeightLogs(backup.weightLogs);
        localStorage.setItem("gaston_weights", JSON.stringify(backup.weightLogs));
      }
      if (backup.completedExercises !== undefined) {
        setCompletedExercises(backup.completedExercises);
        localStorage.setItem("gaston_completed_ex", JSON.stringify(backup.completedExercises));
      }
      if (backup.chatMessages !== undefined) {
        setChatMessages(backup.chatMessages);
        localStorage.setItem("gaston_chat_history", JSON.stringify(backup.chatMessages));
      }
      if (backup.duolingoUser !== undefined) {
        setDuolingoUser(backup.duolingoUser);
        localStorage.setItem("gaston_duolingo_user", backup.duolingoUser);
      }
      if (backup.duolingoData !== undefined) {
        setDuolingoData(backup.duolingoData);
        localStorage.setItem("gaston_duolingo_data", JSON.stringify(backup.duolingoData));
      }
      if (backup.pianoTimePracticed !== undefined) {
        setPianoTimePracticed(backup.pianoTimePracticed);
        localStorage.setItem("gaston_piano_today_seconds", backup.pianoTimePracticed.toString());
      }
      if (backup.pianoLogs !== undefined) {
        setPianoLogs(backup.pianoLogs);
        localStorage.setItem("gaston_piano_logs", JSON.stringify(backup.pianoLogs));
      }
      if (backup.readingLogs !== undefined) {
        setReadingLogs(backup.readingLogs);
        localStorage.setItem("gaston_reading_logs", JSON.stringify(backup.readingLogs));
      }
      if (backup.habitsChecked !== undefined) {
        setHabitsChecked(backup.habitsChecked);
        localStorage.setItem("gaston_habits_checked", JSON.stringify(backup.habitsChecked));
      }
      
      alert("¡Respaldo restaurado con éxito en tu navegador!");
    } catch (e) {
      alert("Error al restaurar los datos del respaldo.");
    }
  };

  const fetchAndRestoreLatestBackup = async () => {
    if (!confirm("¿Estás seguro de que quieres restaurar la copia de seguridad más reciente del servidor? Esto sobrescribirá tus datos actuales.")) {
      return;
    }
    try {
      const res = await fetch("/api/backup/latest");
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          handleRestoreBackup(data.data);
        } else {
          alert(data.message || "No se encontró ningún respaldo en el servidor.");
        }
      } else {
        alert("Error al comunicarse con el servidor de respaldos.");
      }
    } catch (e) {
      alert("Error de conexión al buscar respaldo.");
    }
  };

  const handleManualBackup = async () => {
    const payload = {
      xp,
      hydrationLiters,
      checkedMeals,
      weightLogs: weightLogs.length > 0 ? weightLogs : INITIAL_WEIGHT_LOGS,
      completedExercises,
      chatMessages,
      duolingoUser,
      duolingoData,
      pianoTimePracticed,
      pianoLogs,
      readingLogs,
      habitsChecked,
      backupTimestamp: Date.now()
    };
    
    // Save locally
    localStorage.setItem("betterme_last_backup_data", JSON.stringify(payload));
    localStorage.setItem("betterme_last_backup_time", Date.now().toString());
    
    // Save on server
    try {
      const res = await fetch("/api/backup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("¡Copia de seguridad guardada con éxito en el servidor y localmente!");
        setConfirmReset(prev => !prev);
        setConfirmReset(prev => !prev);
      } else {
        alert("La copia se guardó localmente, pero el servidor devolvió un error.");
      }
    } catch (e) {
      alert("La copia se guardó localmente, pero no se pudo conectar con el servidor.");
    }
  };

  const handleResetData = () => {
    // Clear LocalStorage
    localStorage.removeItem("gaston_xp");
    localStorage.removeItem("gaston_hydration");
    localStorage.removeItem("gaston_meals");
    localStorage.setItem("gaston_weights", JSON.stringify(INITIAL_WEIGHT_LOGS));
    localStorage.removeItem("gaston_completed_ex");
    localStorage.removeItem("gaston_chat_history");
    localStorage.removeItem("gaston_piano_today_seconds");
    localStorage.removeItem("gaston_piano_logs");
    localStorage.removeItem("gaston_reading_logs");
    localStorage.removeItem("gaston_habits_checked");
    localStorage.removeItem("gaston_habits_date");
    localStorage.removeItem("gaston_duolingo_data");
    
    // Reset React States
    setXp(0);
    setHydrationLiters(0);
    setCheckedMeals({});
    setWeightLogs(INITIAL_WEIGHT_LOGS);
    setCompletedExercises([]);
    
    const welcome: CoachMessage = {
      id: "welcome",
      role: "assistant",
      content: "¡Hola Gastón! Soy tu Coach Personal de IA. He restablecido todos tus datos a cero para iniciar de forma limpia hoy. ¿Listo para dar el máximo en tu entrenamiento?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages([welcome]);
    localStorage.setItem("gaston_chat_history", JSON.stringify([welcome]));

    setPianoTimePracticed(0);
    setPianoLogs([]);
    setReadingLogs([]);
    setHabitsChecked({ duolingo: false, piano: false, reading: false });
    setConfirmReset(false);
    
    alert("¡Todos los datos han sido restablecidos a cero exitosamente!");
  };

  // Sync Google Calendar handler
  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    try {
      const response = await fetch("/api/calendar/sync-workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulated: calendarSimulated })
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        gainXp(150, "Sincronización de rutina completa con Google Calendar");
      } else {
        alert("Error de sincronización: " + data.error);
      }
    } catch (e: any) {
      alert("Error al conectar con la API de sincronización.");
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Disconnect Google Calendar handler
  const handleDisconnectCalendar = async () => {
    if (calendarSimulated) {
      setCalendarConnected(false);
      alert("Google Calendar desconectado (Modo Simulado).");
      return;
    }
    
    try {
      const response = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (response.ok) {
        setCalendarConnected(false);
        alert("Google Calendar desconectado correctamente.");
      }
    } catch (e) {
      alert("Error al desconectar.");
    }
  };

  // Connect Google Calendar OAuth Trigger
  const handleConnectCalendar = async () => {
    if (calendarSimulated) {
      setCalendarConnected(true);
      setCalendarEmail("gastonmorante@gmail.com");
      alert("Google Calendar conectado exitosamente para gastonmorante@gmail.com (Modo Simulado).");
      return;
    }

    try {
      const response = await fetch("/api/calendar/auth-url");
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const err = await response.json();
        alert("Error: " + err.error + "\n\nPor favor, verifica que las credenciales de Google estén en tu archivo .env.local");
      }
    } catch (e) {
      alert("No se pudo obtener la URL de autorización.");
    }
  };

  // Check callback parameters on URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      setCalendarConnected(true);
      setCalendarSimulated(false);
      checkCalendarStatus();
      alert("¡Cuenta de Google Calendar vinculada con éxito!");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("error")) {
      alert("Error de conexión de calendario: " + params.get("error"));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch Duolingo handler
  const handleFetchDuolingo = async (username: string) => {
    const cleanUser = username.replace(/^@/, "");
    setDuolingoLoading(true);
    try {
      const res = await fetch(`/api/bettermind/duolingo?username=${encodeURIComponent(cleanUser)}`);
      if (res.ok) {
        const data = await res.json();
        setDuolingoData(data);
        localStorage.setItem("gaston_duolingo_data", JSON.stringify(data));
        localStorage.setItem("gaston_duolingo_user", username);
        gainXp(40, "Actualización de racha mental en Duolingo");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDuolingoLoading(false);
    }
  };

  // Add Piano Log handler
  const handleAddPianoLog = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = Math.floor(pianoTimePracticed / 60);
    if (minutes === 0) {
      alert("¡Debes practicar al menos 1 minuto antes de registrar tu sesión!");
      return;
    }
    const newLog = {
      date: new Date().toISOString().split("T")[0],
      durationMinutes: minutes,
      song: pianoSongName.trim() || "Práctica técnica / Escalas"
    };
    setPianoLogs(prev => [newLog, ...prev]);
    setPianoTimePracticed(0);
    setPianoSongName("");
    gainXp(50, `Sesión de piano completada: ${minutes} minutos`);
    alert(`¡Sesión de piano de ${minutes} min guardada! +50 XP acumulados.`);
  };

  // Add Reading Log handler
  const handleAddReadingLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingTitle.trim()) {
      alert("Ingresa el título del libro.");
      return;
    }
    const pages = parseInt(readingPages, 10);
    if (isNaN(pages) || pages <= 0) {
      alert("Ingresa un número válido de páginas.");
      return;
    }
    const newLog = {
      date: new Date().toISOString().split("T")[0],
      title: readingTitle.trim(),
      pagesRead: pages
    };
    setReadingLogs(prev => [newLog, ...prev]);
    setReadingTitle("");
    setReadingPages("");
    gainXp(pages * 3, `Lectura completada: ${pages} páginas`);
    alert(`¡Registro de lectura guardado! +${pages * 3} XP acumulados.`);
  };

  // Weekly habit consistency calculator (Monday to Sunday)
  const getWeeklyHabitStatus = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const dayIndex = currentDay === 0 ? 6 : currentDay - 1; // Mon=0 to Sun=6
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayIndex);
    
    const weekDays = [];
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    
    let totalExpected = 0;
    let totalCompleted = 0;
    let pianoFaltas = 0;
    let readingFaltas = 0;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dCopy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const todayCopy = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const isPast = dCopy.getTime() < todayCopy.getTime();
      const isToday = dCopy.getTime() === todayCopy.getTime();
      
      const hasPiano = pianoLogs.some(log => log.date === dateStr);
      const hasReading = readingLogs.some(log => log.date === dateStr);
      
      let pianoStatus: 'check' | 'falta' | 'pending' | 'future' = 'future';
      let readingStatus: 'check' | 'falta' | 'pending' | 'future' = 'future';
      
      if (isPast) {
        pianoStatus = hasPiano ? 'check' : 'falta';
        readingStatus = hasReading ? 'check' : 'falta';
        
        totalExpected += 2;
        if (hasPiano) totalCompleted += 1; else pianoFaltas += 1;
        if (hasReading) totalCompleted += 1; else readingFaltas += 1;
      } else if (isToday) {
        pianoStatus = hasPiano ? 'check' : 'pending';
        readingStatus = hasReading ? 'check' : 'pending';
        
        if (hasPiano) {
          totalExpected += 1;
          totalCompleted += 1;
        }
        if (hasReading) {
          totalExpected += 1;
          totalCompleted += 1;
        }
      } else {
        pianoStatus = 'future';
        readingStatus = 'future';
      }
      
      weekDays.push({
        dayName: dayNames[i],
        dateStr,
        pianoStatus,
        readingStatus
      });
    }
    
    const score = totalExpected > 0 ? (totalCompleted / totalExpected) * 10 : 10;
    
    return {
      weekDays,
      score,
      pianoFaltas,
      readingFaltas,
      totalExpected,
      totalCompleted
    };
  };

  // Piano Timer Effect
  useEffect(() => {
    let timer: number | null = null;
    if (pianoTimerActive) {
      timer = window.setInterval(() => {
        setPianoTimePracticed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pianoTimerActive]);

  // Save changes effects
  useEffect(() => {
    localStorage.setItem("gaston_piano_today_seconds", pianoTimePracticed.toString());
  }, [pianoTimePracticed]);

  useEffect(() => {
    localStorage.setItem("gaston_piano_logs", JSON.stringify(pianoLogs));
  }, [pianoLogs]);

  useEffect(() => {
    localStorage.setItem("gaston_reading_logs", JSON.stringify(readingLogs));
  }, [readingLogs]);

  // Simulate OnePlus Watch 2 dual engine telemetry
  useEffect(() => {
    if (!watchConnected) return;

    const interval = setInterval(() => {
      setWatchData(prev => {
        let hr = prev.heartRate;
        let steps = prev.stepsToday;
        let cals = prev.caloriesBurned;
        let engine = prev.activeEngine;
        let spO2 = prev.spO2;
        let stress = prev.stressLevel;
        let dist = prev.distanceKm;
        let temp = prev.skinTempDelta;

        if (timerState === 'running') {
          // Active workout uses Wear OS High Performance Engine
          engine = "Wear OS (Snapdragon W5)";
          hr = Math.min(160, Math.max(130, hr + Math.floor(Math.random() * 5) - 2));
          steps += Math.floor(Math.random() * 5) + 3;
          cals += Math.random() > 0.6 ? 1 : 0;
          stress = Math.min(85, Math.max(60, stress + Math.floor(Math.random() * 3) - 1));
          spO2 = Math.min(99, Math.max(95, spO2 + (Math.random() > 0.85 ? Math.floor(Math.random() * 3) - 1 : 0)));
        } else if (timerState === 'walking') {
          engine = "Wear OS (Snapdragon W5)";
          hr = Math.min(125, Math.max(100, hr + Math.floor(Math.random() * 3) - 1));
          steps += Math.floor(Math.random() * 3) + 1;
          cals += Math.random() > 0.8 ? 1 : 0;
          stress = Math.min(65, Math.max(45, stress + Math.floor(Math.random() * 3) - 1));
          spO2 = Math.min(99, Math.max(96, spO2 + (Math.random() > 0.85 ? Math.floor(Math.random() * 3) - 1 : 0)));
        } else {
          // Idle / Low power monitoring handled by RTOS Engine
          engine = "RTOS (BES2700)";
          hr = Math.min(80, Math.max(68, hr + Math.floor(Math.random() * 3) - 1));
          stress = Math.min(35, Math.max(12, stress + Math.floor(Math.random() * 3) - 1));
          spO2 = Math.min(100, Math.max(97, spO2 + (Math.random() > 0.9 ? Math.floor(Math.random() * 3) - 1 : 0)));
          if (Math.random() > 0.7) {
            steps += 1;
            cals += Math.random() > 0.9 ? 1 : 0;
          }
        }

        // Calculate distance based on steps (roughly 0.75m per step = 0.00075 km)
        dist = steps * 0.00075;

        // Small fluctuation in skin temp deviation
        if (Math.random() > 0.85) {
          temp = Math.min(0.5, Math.max(-0.6, temp + (Math.random() * 0.2 - 0.1)));
        }

        // Push to heart rate history
        setHrHistory(history => {
          const next = [...history, hr];
          if (next.length > 20) next.shift();
          return next;
        });

        const updated = {
          ...prev,
          heartRate: hr,
          stepsToday: steps,
          caloriesBurned: Math.round(cals),
          activeEngine: engine,
          spO2,
          stressLevel: stress,
          distanceKm: parseFloat(dist.toFixed(2)),
          skinTempDelta: parseFloat(temp.toFixed(2)),
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Sync with local backend telemetry endpoint in background
        fetch('/api/watch/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(err => console.debug("Watch telemetry sync offline:", err));

        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [watchConnected, timerState]);

  const handleSyncWatchWorkout = async () => {
    setIsSyncingWatch(true);
    try {
      const response = await fetch('/api/watch/sync-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayType: isGymDay ? 'gym' : isRunningDay ? 'run' : 'rest',
          focusName: isGymDay ? currentGymRoutine?.focus : isRunningDay ? RUNNING_PHASES[activeRunningPhase].protocol : "Descanso Activo",
          durationMinutes: timerState === 'done' || timerTotalElapsed > 0 ? Math.round(timerTotalElapsed / 60) : 30,
          rating: 9,
          notes: `Entrenamiento completado y sincronizado desde mi OnePlus Watch 2 (${watchData.activeEngine}). Ritmo cardíaco medio estimado: ${watchData.heartRate} bpm. Pasos registrados: ${watchData.stepsToday}.`
        })
      });
      
      const data = await response.json();
      if (data.status === "success") {
        setLogDayType(isGymDay ? 'gym' : isRunningDay ? 'run' : 'rest');
        setLogFocusName(data.activity.focusName);
        setLogRating(data.activity.rating);
        setLogNotes(data.activity.notes);
        
        if (isGymDay && currentGymRoutine) {
          setLogExercises(currentGymRoutine.exercises.map(ex => ex.name));
        }

        gainXp(100, "¡Entrenamiento sincronizado de OnePlus Watch 2!");
        alert("¡Datos del OnePlus Watch 2 sincronizados! Hemos pre-llenado el formulario de Registro de Actividad para que lo guardes.");
      }
    } catch (e) {
      console.error("Watch sync failed:", e);
      alert("No se pudo conectar con el reloj.");
    } finally {
      setIsSyncingWatch(false);
    }
  };

  // Sync state with day of the week on load
  useEffect(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayIndex = new Date().getDay();
    const currentDayName = days[currentDayIndex];
    setActiveDay(currentDayName);

    // Load from LocalStorage
    try {
      const storedXp = localStorage.getItem("gaston_xp");
      if (storedXp) setXp(parseInt(storedXp, 10));

      const storedHydration = localStorage.getItem("gaston_hydration");
      if (storedHydration) setHydrationLiters(parseFloat(storedHydration));

      const storedMeals = localStorage.getItem("gaston_meals");
      if (storedMeals) setCheckedMeals(JSON.parse(storedMeals));

      const storedWeight = localStorage.getItem("gaston_weights");
      if (storedWeight) {
        setWeightLogs(JSON.parse(storedWeight));
      } else {
        localStorage.setItem("gaston_weights", JSON.stringify(INITIAL_WEIGHT_LOGS));
      }

      const storedCompletedEx = localStorage.getItem("gaston_completed_ex");
      if (storedCompletedEx) setCompletedExercises(JSON.parse(storedCompletedEx));

      const storedChat = localStorage.getItem("gaston_chat_history");
      if (storedChat) {
        setChatMessages(JSON.parse(storedChat));
      } else {
        // Initial welcome message
        const welcome: CoachMessage = {
          id: "welcome",
          role: "assistant",
          content: "¡Hola Gastón! Soy tu Coach Personal de IA. He cargado tu plan de resistencia e hipertrofia a un año. Estoy listo para darte motivación diaria, ajustar tus cargas, revisar tu hidratación o resolver cualquier duda biomecánica. ¿Cómo te sientes para tu sesión de hoy?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages([welcome]);
      }
    } catch (e) {
      console.warn("Could not read localStorage safely, using memory state", e);
    }

    // Initialize Firebase auth status listener
    const unsubscribeAuth = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        // Load logs from DB when successfully connected
        getActivityLogsDb().then(logs => setDbLogs(logs)).catch(err => console.error(err));
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setDbLogs([]);
      }
    );

    return () => unsubscribeAuth();
  }, []);

  // Save changes to LocalStorage and handle XP bonuses
  useEffect(() => {
    if (xp > 0) localStorage.setItem("gaston_xp", xp.toString());
  }, [xp]);

  useEffect(() => {
    localStorage.setItem("gaston_hydration", hydrationLiters.toString());
  }, [hydrationLiters]);

  useEffect(() => {
    localStorage.setItem("gaston_meals", JSON.stringify(checkedMeals));
  }, [checkedMeals]);

  useEffect(() => {
    localStorage.setItem("gaston_completed_ex", JSON.stringify(completedExercises));
  }, [completedExercises]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem("gaston_chat_history", JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  // Helper values for plan determination
  const isGymDay = activeDay === "monday" || activeDay === "tuesday" || activeDay === "thursday" || activeDay === "friday";
  const isRunningDay = activeDay === "monday" || activeDay === "wednesday" || activeDay === "friday";
  const isRestDayStr = !isGymDay && !isRunningDay;

  // Meal list for currently selected activeDay
  const getMealsForDay = () => {
    const capitalizedDay = activeDay.charAt(0).toUpperCase() + activeDay.slice(1);
    const meals = [];

    // Pre workout banana
    if (isGymDay) {
      meals.push({
        id: "pre_workout",
        title: "⚡ Pre-Entrenamiento (07:00)",
        items: [{ ingredient: "Plátano fresco", amount_g: 120 }],
        xpBonus: 10
      });
    }

    // Post workout shake
    if (activeDay !== "saturday" && activeDay !== "sunday") {
      meals.push({
        id: "post_shake",
        title: "🥤 Licuado Recuperador Post-Entreno (08:45)",
        items: [
          { ingredient: "Leche entera o vegetal", amount_ml: 250 },
          { ingredient: "Plátano fresco", amount_g: 120 },
          { ingredient: "Avena cruda en hojuelas", amount_g: 40 },
          { ingredient: "Crema de cacahuate natural", amount_g: 15 },
          { ingredient: "Proteína en polvo vegetal", amount_g: 30 },
          { ingredient: "Creatina monohidratada", amount_g: 5 }
        ],
        xpBonus: 20
      });

      meals.push({
        id: "breakfast",
        title: "🍳 Desayuno Constructor (09:30)",
        items: [
          { ingredient: "Huevos enteros cocidos al gusto (aprox. 2 huevos)", amount_g: 120 },
          { ingredient: "Tomate y cebolla picada con cilantro", amount_g: 50 },
          { ingredient: "Tortillas de maíz (2) ó Pan integral (2 rebanadas)", amount_g: "50-60" }
        ],
        xpBonus: 20
      });
    }

    // Lunch (Daily)
    meals.push({
      id: "lunch",
      title: "🍗 Comida de Fuerza Lumínica (14:00) + Multivitamínico",
      items: [
        { ingredient: "Proteína limpia (Pechuga de pollo, lomo de cerdo, res magra o atún drenado)", amount_g: "180g (150g si es atún)" },
        { ingredient: "Legumbres cocidas (Frijoles, lentejas o garbanzos)", amount_g: 200 },
        { ingredient: "Verduras al vapor o asadas (Brócoli, espinaca o calabacín)", amount_g: 150 },
        { ingredient: "Tableta de multivitamínico mineral", amount_g: "1 tableta" }
      ],
      xpBonus: 30
    });

    // Running snack
    if (isRunningDay) {
      meals.push({
        id: "pre_run_snack",
        title: "🍎 Snack Pre-Correr (18:30)",
        items: [{ ingredient: "Manzana fresca (1/2) ó Almendras enteras (aprox. 12 g/pzs)", amount_g: "100g manzana / 15g almendras" }],
        xpBonus: 15
      });
    }

    // Dinner (Daily)
    meals.push({
      id: "dinner",
      title: "🥑 Cena de Sueño Anabólico (20:30)",
      items: [
        { ingredient: "Opción Quesadillas: 2 tortillas, 60g queso bajo en grasa, 50g pechuga deshebrada" },
        { ingredient: "Opción Yogur Griego: 200g yogur natural sin azúcar, 40g granola, 10g miel pura, 30g proteína (fines de semana)" }
      ],
      xpBonus: 25
    });

    return meals;
  };

  const mealsList = getMealsForDay();

  // Active Gym workout
  const currentGymRoutine = isGymDay ? TRAINING_PLAN[activeDay as keyof typeof TRAINING_PLAN] : null;

  // Hydration interaction
  const addWater = (amountLiters: number) => {
    const prev = hydrationLiters;
    const next = Math.min(3.0, prev + amountLiters);
    setHydrationLiters(next);
    
    // Earn XP if hitting perfect hydration
    if (prev < 3.0 && next >= 3.0) {
      gainXp(50, "¡Meta de hidratación de 3 litros alcanzada!");
    } else {
      gainXp(5, "Hidratación registrada.");
    }
  };

  const resetWater = () => {
    setHydrationLiters(0);
  };

  // XP accumulation helper
  const gainXp = (amount: number, reason: string) => {
    setXp(prev => {
      const next = prev + amount;
      return next;
    });
    // Visual popups or system notifications of award updates can watch this
  };

  // Toggle meal checkmark
  const selectMealChecked = (mealId: string, bonus: number) => {
    const isChecked = !checkedMeals[mealId];
    setCheckedMeals(prev => ({
      ...prev,
      [mealId]: isChecked
    }));

    if (isChecked) {
      gainXp(bonus, "Nutrición registrada");
    } else {
      setXp(prev => Math.max(0, prev - bonus));
    }
  };

  // Toggle exercise checkbox
  const toggleExerciseCheck = (exName: string) => {
    const isCompleted = completedExercises.includes(exName);
    let next: string[] = [];
    if (isCompleted) {
      next = completedExercises.filter(e => e !== exName);
      setCompletedExercises(next);
      setXp(prev => Math.max(0, prev - 15));
    } else {
      next = [...completedExercises, exName];
      setCompletedExercises(next);
      gainXp(20, `Ejercicio completado: ${exName}`);
    }
  };

  // Weight Logging logic
  const handleLogWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(newWeight);
    if (isNaN(weightNum) || weightNum < 40 || weightNum > 80) {
      alert("Por favor introduce un peso válido entre 40kg y 80kg.");
      return;
    }

    const log: WeightLog = {
      date: weightDate,
      weightKg: weightNum
    };

    const nextLogs = [...weightLogs, log].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setWeightLogs(nextLogs);
    localStorage.setItem("gaston_weights", JSON.stringify(nextLogs));
    setNewWeight("");

    gainXp(40, "¡Nuevo registro de peso corporal!");

    // Check high weight milestone rewards
    if (weightNum >= 55) {
      // Trigger XP
      gainXp(100, "¡Hito alcanzado: Superado los 55kg!");
    }
    if (weightNum >= 65) {
      gainXp(500, "¡Hito final alcanzado: Llegaste a los 65kg!");
    }
  };

  const handleDeleteWeight = (indexToDelete: number) => {
    const nextLogs = weightLogs.filter((_, idx) => idx !== indexToDelete);
    setWeightLogs(nextLogs);
    localStorage.setItem("gaston_weights", JSON.stringify(nextLogs));
  };

  // Firebase Auth & Cloud Firestore Operations
  const fetchDbLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await getActivityLogsDb();
      setDbLogs(logs);
    } catch (e) {
      console.error("Error al cargar registros de Firestore:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setIsLoadingLogs(true);
        const logs = await getActivityLogsDb();
        setDbLogs(logs);
        gainXp(100, "Conexión exitosa con Google");
      }
    } catch (err) {
      console.error("Error al ingresar con Google:", err);
      const confirmLocal = window.confirm(
        "No se pudo conectar a Firebase (común en ejecución local por temas de dominio o bloqueo de popups).\n\n¿Deseas activar el 'Modo Local' para usar la app guardando tus datos en este navegador y poder sincronizar tu Google Calendar?"
      );
      if (confirmLocal) {
        setGoogleUser({
          uid: "local-user",
          email: "gastonmorante@gmail.com",
          displayName: "Gastón (Modo Local)",
        } as any);
        setAccessToken("local");
        setIsLoadingLogs(true);
        const logs = await getActivityLogsDb();
        setDbLogs(logs);
        gainXp(50, "Modo Local activado");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await userLogout();
      setGoogleUser(null);
      setAccessToken(null);
      setDbLogs([]);
    } catch (err) {
      console.error("Error al salir de Google:", err);
    }
  };

  const handleAutofillTodayRoutine = () => {
    if (isGymDay && currentGymRoutine) {
      setLogDayType('gym');
      setLogFocusName(currentGymRoutine.focus);
      setLogExercises(currentGymRoutine.exercises.map(e => e.name));
    } else if (isRunningDay) {
      setLogDayType('run');
      setLogFocusName(`Running Fase: ${RUNNING_PHASES[activeRunningPhase].protocol}`);
      setLogExercises([]);
    } else {
      setLogDayType('rest');
      setLogFocusName("Descanso y Superávit Anabólica");
      setLogExercises([]);
    }
    setLogDate(new Date().toISOString().split('T')[0]);
  };

  const handleRegisterAndSyncWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser || !accessToken) {
      alert("Por favor inicia sesión con Google primero para activar la sincronización en la nube.");
      return;
    }

    setIsSyncingCalendar(true);
    try {
      let isCalSynced = false;

      // Event content formatting
      const summaryText = `💪 Gastón Entreno (${logDayType === 'gym' ? 'Pesas' : logDayType === 'run' ? 'Running' : 'Descanso'}): ${logFocusName || 'Actividad General'}`;
      let descr = `Categoría: ${logDayType === 'gym' ? 'Gimnasio/Pesas' : logDayType === 'run' ? 'Running/Trote' : 'Descanso - Recuperación Anabólica'}\n`;
      if (logDayType === 'gym' && logExercises.length > 0) {
        descr += `Ejercicios Realizados:\n- ${logExercises.join('\n- ')}\n`;
      }
      descr += `Motivación: ${logRating}/10 (${logFeeling})\n`;
      if (logNotes) {
        descr += `Notas de Sesión:\n"${logNotes}"\n`;
      }
      descr += `Registrado automáticamente desde Gaston Performance Dashboard.`;

      // 1. Sync directly to Google Calendar
      let calendarResult = false;
      if (accessToken === "local") {
        try {
          const resSync = await fetch("/api/calendar/sync-single-workout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              summary: summaryText,
              description: descr,
              date: logDate
            })
          });
          calendarResult = resSync.ok;
        } catch (syncErr) {
          console.error("Error calling backend single sync:", syncErr);
        }
      } else {
        calendarResult = await syncToGoogleCalendar(accessToken, {
          summary: summaryText,
          description: descr,
          date: logDate
        });
      }

      if (calendarResult) {
        isCalSynced = true;
      } else {
        console.warn("No se pudo agregar sincronizado al Calendar.");
      }

      // 2. Save directly to Firestore collection
      const payload: Omit<DbActivityLog, 'userId' | 'createdAt'> = {
        date: logDate,
        dayType: logDayType,
        focusName: logFocusName || (logDayType === 'gym' ? 'Sesión de Pesas' : logDayType === 'run' ? 'Carrera Running' : 'Día de Descanso'),
        completedExercises: logDayType === 'gym' ? logExercises : [],
        rating: logRating,
        notes: logNotes,
        syncedToCalendar: isCalSynced
      };

      await addActivityLogDb(payload);

      // Refresh DB list
      await fetchDbLogs();

      // Rewards state XP bonuses
      const scoreBonus = logRating * 15;
      gainXp(scoreBonus + 50, `Entrenamiento registrado. Motivación: ${logRating}/10`);
      
      setLogNotes("");
      alert(isCalSynced 
        ? "¡Excelente Gastón! Tu actividad diaria se guardó en tu base de datos y se sincronizó exitosamente a tu Google Calendar como un hito destacado."
        : "Tu actividad diaria se guardó en tu base de datos de Firestore, pero hubo un detalle sincronizando a tu Google Calendar de forma remota."
      );
    } catch (err) {
      console.error("Error registrando entrenamiento:", err);
      alert("Error guardando el entrenamiento. Por favor intenta de nuevo.");
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleToggleLogExercise = (exName: string) => {
    if (logExercises.includes(exName)) {
      setLogExercises(prev => prev.filter(e => e !== exName));
    } else {
      setLogExercises(prev => [...prev, exName]);
    }
  };

  // Calculations for Gaston's "calificación de motivación semanal y mensual"
  const getMotivationStats = () => {
    const now = new Date();
    const parseLocalDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    };

    const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

    const weeklyLogs = dbLogs.filter(log => parseLocalDate(log.date) >= oneWeekAgo);
    const monthlyLogs = dbLogs.filter(log => parseLocalDate(log.date) >= oneMonthAgo);

    const weeklyAvg = weeklyLogs.length > 0 
      ? weeklyLogs.reduce((acc, curr) => acc + curr.rating, 0) / weeklyLogs.length 
      : null;

    const monthlyAvg = monthlyLogs.length > 0 
      ? monthlyLogs.reduce((acc, curr) => acc + curr.rating, 0) / monthlyLogs.length 
      : null;

    let level = "Estableciendo constancia";
    let colorClass = "text-slate-400 border-slate-500/20";
    if (monthlyAvg !== null) {
      if (monthlyAvg >= 9.0) {
        level = "⚡ CONSTANCIA ANABÓLICA DIAMANTE";
        colorClass = "text-amber-400 border-amber-500/30 bg-amber-500/5";
      } else if (monthlyAvg >= 7.5) {
        level = "💪 DISCIPLINA CONTUNDENTE";
        colorClass = "text-violet-400 border-orange-500/30 bg-violet-500/5";
      } else if (monthlyAvg >= 5.0) {
        level = "🔥 EN PROGRESO ESTABLE";
        colorClass = "text-sky-400 border-sky-500/30 bg-sky-500/5";
      } else {
        level = "💤 NECESITA MAYOR ENFOQUE";
        colorClass = "text-red-400 border-red-400/30 bg-red-400/5";
      }
    } else if (weeklyAvg !== null) {
      if (weeklyAvg >= 8.5) {
        level = "INICIO DE FUEGO ANABÓLICO";
        colorClass = "text-violet-400";
      }
    }

    return {
      weeklyAvg,
      monthlyAvg,
      weeklyCount: weeklyLogs.length,
      monthlyCount: monthlyLogs.length,
      level,
      colorClass
    };
  };

  const motivationStats = getMotivationStats();

  const handleDownloadReport = () => {
    if (dbLogs.length === 0) {
      alert("No hay registros guardados en tu base de datos para generar un reporte descargable. ¡Por favor registra tu primera actividad para iniciar!");
      return;
    }

    const { weeklyAvg, monthlyAvg, level } = motivationStats;

    let text = `========================================================================\n`;
    text    += `       RANGO DE EVOLUCIÓN Y CALIFICACIÓN DE MOTIVACIÓN DE GASTÓN        \n`;
    text    += `========================================================================\n\n`;
    text    += `Generado el: ${new Date().toLocaleString()}\n`;
    text    += `Usuario Conectado: gastonmorante@gmail.com\n`;
    text    += `Edad: 49 años | Meta de Peso: 53.0 kg -> 65.0 kg\n`;
    text    += `------------------------------------------------------------------------\n\n`;
    text    += `RESUMEN DE CONSTANCIA Y MOTIVACIÓN:\n`;
    text    += `• Estado de Motivación Global: ${level}\n`;
    text    += `• Calificación de Motivación Semanal (Últimos 7 días): ${weeklyAvg !== null ? `${weeklyAvg.toFixed(1)} / 10` : 'Sin registros suficientes aún'}\n`;
    text    += `• Calificación de Motivación Mensual (Últimos 30 días): ${monthlyAvg !== null ? `${monthlyAvg.toFixed(1)} / 10` : 'Sin registros suficientes aún'}\n`;
    text    += `• Puntos de Experiencia Acumulados (XP): ${xp} XP\n`;
    text    += `• Cantidad Total de Entrenamientos/Actividades Registradas: ${dbLogs.length} sesiones\n\n`;
    text    += `------------------------------------------------------------------------\n`;
    text    += `HISTORIAL DE ACTIVIDADES REALIZADAS (FIRESTORE SYNC):\n`;
    text    += `------------------------------------------------------------------------\n`;

    dbLogs.forEach((log, index) => {
      text += `[#${dbLogs.length - index}] Fecha: ${log.date}\n`;
      text += `     Actividad: ${log.dayType.toUpperCase()} - ${log.focusName}\n`;
      text += `     Calificación: ${log.rating} / 10 (${logFeeling})\n`;
      if (log.completedExercises && log.completedExercises.length > 0) {
        text += `     Ejercicios Hechos: ${log.completedExercises.join(', ')}\n`;
      }
      if (log.notes) {
        text += `     Notas de Sentimiento: "${log.notes}"\n`;
      }
      text += `     Sincronizado a Google Calendar: ${log.syncedToCalendar ? 'SÍ' : 'NO'}\n`;
      text += `------------------------------------------------------------------------\n`;
    });

    text += `\n========================================================================\n`;
    text += `     "Construcción de músculo magro libre de excusas. Hecho con amor y ciencia."\n`;
    text += `========================================================================\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_Motivacion_Gaston_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Running interval timer control
  const startRunningTimer = () => {
    if (timerRef.current) return;
    
    // Choose interval length depending on phase
    // Phase 1 (M 1-2): 5 min run (300) / 1 min walk (60)
    // Phase 2 (M 3-4): 8 min run (480) / 1 min walk (60)
    const runSecs = activeRunningPhase === 0 ? 300 : activeRunningPhase === 1 ? 480 : 1500; // continuous 25 min in phase 3
    const walkSecs = activeRunningPhase === 0 ? 60 : activeRunningPhase === 1 ? 60 : 0;

    setTimerState('running');
    setTimerSecondsLeft(runSecs);

    timerRef.current = window.setInterval(() => {
      setTimerSecondsLeft(prevSecs => {
        if (prevSecs <= 1) {
          // Switch state!
          if (timerState === 'running') {
            if (activeRunningPhase >= 2) {
              // Continuous run ended!
              handleTimerCompletedPhase();
              return 0;
            } else {
              // Switch to walking
              setTimerState('walking');
              return walkSecs;
            }
          } else if (timerState === 'walking') {
            // Next interval!
            setTimerCurrentInterval(prevInt => {
              const maxIntervals = activeRunningPhase === 0 ? 4 : 3;
              if (prevInt >= maxIntervals) {
                handleTimerCompletedPhase();
                return 1;
              }
              setTimerState('running');
              return prevInt + 1;
            });
            return runSecs;
          }
        }
        return prevSecs - 1;
      });
      setTimerTotalElapsed(prev => prev + 1);
    }, 1000);
  };

  const pauseRunningTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState('idle');
  };

  const resetRunningTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState('idle');
    setTimerSecondsLeft(activeRunningPhase === 0 ? 300 : activeRunningPhase === 1 ? 480 : 1500);
    setTimerTotalElapsed(0);
    setTimerCurrentInterval(1);
  };

  const handleTimerCompletedPhase = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState('done');
    gainXp(150, "¡Protocolo de Running completado del día!");
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format seconds to clock format MM:SS
  const formatTimeClock = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // AI Personal Coach conversational calling
  const handleSendCoachMessage = async (e?: React.FormEvent, customString?: string) => {
    if (e) e.preventDefault();
    const queryText = customString || chatInput;
    if (!queryText.trim()) return;

    const userMsg: CoachMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // Filter to limit tokens and history length to standard length
          messages: [...chatMessages, userMsg].slice(-8).map(m => ({
            role: m.role,
            content: m.content
          })),
          userContext: {
            activeDay,
            completedExercises,
            checkedMeals,
            hydrationLiters,
            duolingoData,
            watchConnected,
            watchData,
            pianoTimePracticed,
            pagesToday: readingLogs.filter((l: any) => l.date === new Date().toISOString().split('T')[0]).reduce((sum: number, l: any) => sum + (l.pagesRead || 0), 0),
            xp
          }
        })
      });

      const data = await response.json();
      const botMsg: CoachMessage = {
        id: "c-" + Date.now(),
        role: "assistant",
        content: data.content || "Perdón Gastón, tuve un problema analizando el plan. Mantén la disciplina, ¡vamos por el oro!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errMsg: CoachMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        content: "Gastón, parece que el servidor del gimnasio no responde, pero te sugiero seguir estrictamente tus tiempos de descanso (90-120 segundos) y tus series de hipertrofia. ¡Sigue con fuerza!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Get rewards unlock progress statistics
  const getRewardsStatus = () => {
    return DEFAULT_REWARDS.map(r => {
      let currentProgress = 0;
      let unlocked = false;

      if (r.id === "r1") {
        // Hydration tracker. Count based on current hydration completion ratios as progress
        currentProgress = hydrationLiters >= 3.0 ? 1 : 0;
      } else if (r.id === "r2") {
        // banana snack marked
        currentProgress = checkedMeals["pre_workout"] ? 1 : 0;
      } else if (r.id === "r3") {
        // complete a full session of gym exercises
        const dayExCount = currentGymRoutine ? currentGymRoutine.exercises.length : 5;
        const compCount = completedExercises.filter(e => {
          if (!currentGymRoutine) return false;
          return currentGymRoutine.exercises.some(ge => ge.name === e);
        }).length;
        currentProgress = isGymDay && compCount >= dayExCount ? 4 : Math.min(3, compCount);
      } else if (r.id === "r4") {
        // Completed run stopwatch
        currentProgress = timerState === 'done' ? 3 : (timerTotalElapsed > 120 ? 1 : 0);
      } else if (r.id === "r5") {
        // calendar log count
        currentProgress = completedExercises.length;
      } else if (r.id === "r6") {
        // >55kg
        const maxW = Math.max(...weightLogs.map(w => w.weightKg), 53);
        currentProgress = maxW >= 55 ? 1 : 0;
      } else if (r.id === "r7") {
        // >58kg
        const maxW = Math.max(...weightLogs.map(w => w.weightKg), 53);
        currentProgress = maxW >= 58 ? 1 : 0;
      } else if (r.id === "r8") {
        // Phase 2 completed
        currentProgress = activeRunningPhase >= 1 ? 1 : 0;
      } else if (r.id === "r9") {
        // final targets
        const maxW = Math.max(...weightLogs.map(w => w.weightKg), 53);
        currentProgress = maxW >= 65 ? 1 : 0;
      }

      unlocked = currentProgress >= r.progressMax;

      return {
        ...r,
        progressVal: currentProgress,
        unlocked
      };
    });
  };

  const processedRewards = getRewardsStatus();
  const unlockedCount = processedRewards.filter(r => r.unlocked).length;
  const currentW = weightLogs[weightLogs.length - 1]?.weightKg || 53.0;
  const diffW = currentW - 53.0;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full filter blur-3xl mix-blend-screen pointer-events-none bg-radial-glow animate-[pulseGlow_10s_infinite_alternate]" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-3xl mix-blend-screen pointer-events-none bg-radial-glow animate-[pulseGlow_12s_infinite_alternate_2s]" />

      {/* Main Header Display Bar */}
      <header className="sticky top-0 z-50 border-b-2 border-[#8b5cf6] bg-[#1e293b] px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            {calendarConnected && calendarUserPicture ? (
              <img 
                src={calendarUserPicture} 
                alt={calendarUserName} 
                className="w-11 h-11 rounded-full border-2 border-[#8b5cf6] object-cover shadow-md shadow-[#8b5cf6]/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#8b5cf6] flex items-center justify-center font-bold text-lg text-white shadow-md shadow-orange-500/20">
                G
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base md:text-lg font-bold text-white tracking-tight uppercase">
                  {calendarConnected && calendarUserName ? calendarUserName.split(' ')[0].toUpperCase() : "GASTÓN"} • BetterMe Dashboard
                </h1>
                <span className="text-[10px] font-mono bg-violet-500/10 border border-[#8b5cf6]/30 text-[#8b5cf6] px-2 py-0.5 rounded font-black tracking-widest uppercase">
                  Año 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans tracking-wide uppercase">
                Hypertrophy & Endurance • 49 Años • Coach Personalizado
              </p>
            </div>
          </div>

          {/* Core metrics tracker in header */}
          <div className="flex flex-wrap items-center gap-3.5 text-xs font-mono">
            {/* High Density Triple Box */}
            <div className="flex border border-[#334155] rounded-lg overflow-hidden bg-[#0f172a]/95 text-right">
              <div className="px-3 py-1.5 border-r border-[#334155]">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">START WEIGHT</p>
                <p className="text-xs font-bold text-slate-200">53.0<span className="text-[10px] text-slate-500 font-normal ml-0.5">kg</span></p>
              </div>
              <div className="px-3 py-1.5 border-r border-[#334155]">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">CURRENT</p>
                <p className="text-xs font-bold text-slate-200">
                  {currentW.toFixed(1)}
                  <span className={`text-[10px] font-bold ml-1 ${diffW >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {diffW >= 0 ? `+${diffW.toFixed(1)}` : diffW.toFixed(1)}
                  </span>
                </p>
              </div>
              <div className="px-3 py-1.5">
                <p className="text-[9px] text-[#8b5cf6] uppercase tracking-widest font-mono">TARGET</p>
                <p className="text-xs font-bold text-[#8b5cf6]">65.0<span className="text-[10px] font-normal ml-0.5">kg</span></p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0f172a] border border-[#334155] px-3 py-1.5 rounded-lg">
              <Zap className="w-4 h-4 text-[#8b5cf6] animate-pulse" />
              <span className="text-slate-400">XP:</span>
              <span className="text-[#8b5cf6] font-bold">{xp} pts</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0f172a] border border-[#334155] px-3 py-1.5 rounded-lg text-emerald-400">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">Logros: {unlockedCount}/{DEFAULT_REWARDS.length}</span>
            </div>

            {/* PWA Install Button */}
            <button
              onClick={handleInstallPwa}
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 border border-violet-500/30 px-3 py-1.5 rounded-lg text-white font-bold cursor-pointer transition-colors shadow-md shadow-violet-950/50"
              title="Descargar BetterMe en tu PC o Celular"
            >
              <Download className="w-3.5 h-3.5 text-violet-200" />
              <span>Instalar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Accounts, Tools and Navigation */}
        <div className="col-span-1 space-y-4">
          
          {/* Google Account Connection Status Panel */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#8b5cf6]" />
              Sincronización Google
            </h3>
            
            {!googleUser ? (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Conéctate para registrar tus entrenamientos y sincronizarlos directo con tu Google Calendar.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  id="btn-google-login-sidebar"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-semibold font-sans transition-all cursor-pointer shadow"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22c.87-2.6 3.3-4.53 6.16-4.53"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {isLoggingIn ? "Conectando..." : "Unir con Google"}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 bg-[#0f172a] p-2 rounded-lg border border-[#334155]/60 overflow-hidden">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt="Google Authed Avatar"
                      className="w-8 h-8 rounded-full border border-orange-500/30"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-350 border border-slate-705">
                      {googleUser.displayName?.charAt(0) || "G"}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-sans font-bold text-slate-200 truncate">
                      {googleUser.displayName || 'Gastón Morante'}
                    </p>
                    <p className="text-[9px] font-mono text-slate-500 truncate">
                      gastonmorante@gmail.com
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGoogleLogout}
                  id="btn-google-signout"
                  className="w-full text-center py-1.5 text-[10px] font-mono bg-[#0f172a] border border-[#334155] rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Desconectar Cuenta
                </button>
              </div>
            )}
          </div>

          {/* Left Column Navigation System */}
          <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 p-1.5 bg-[#1e293b] border border-[#334155] rounded-xl lg:h-fit shadow-sm w-full">
            
            <button
              onClick={() => setCurrentTab('hoy')}
              id="tab-hoy"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none ${currentTab === 'hoy' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'}`}
            >
              <Calendar className={`w-4 h-4 ${currentTab === 'hoy' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">Hoy (Plan Diario)</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">Programación activa</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentTab('programa')}
              id="tab-programa"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none ${currentTab === 'programa' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'}`}
            >
              <Activity className={`w-4 h-4 ${currentTab === 'programa' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">Plan a Escala</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">Peso y Fases de un Año</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentTab('ejercicios')}
              id="tab-ejercicios"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none ${currentTab === 'ejercicios' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'}`}
            >
              <Dumbbell className={`w-4 h-4 ${currentTab === 'ejercicios' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">Ejercicios Activos</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">Biomecánica y simulador</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentTab('logros')}
              id="tab-logros"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none ${currentTab === 'logros' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'}`}
            >
              <Trophy className={`w-4 h-4 ${currentTab === 'logros' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">Motivación y Reportes</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">Historial de logros y constancia</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentTab('coach')}
              id="tab-coach"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none relative ${currentTab === 'coach' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'}`}
            >
              <MessageSquare className={`w-4 h-4 ${currentTab === 'coach' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">Coach Personal IA</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">Gemini Chat Consejero</p>
              </div>
              {chatMessages.length <= 1 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8b5cf6] animate-ping" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('watch')}
              id="tab-watch"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none ${currentTab === 'watch' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'}`}
            >
              <Watch className={`w-4 h-4 ${currentTab === 'watch' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">Métricas Watch</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">OnePlus Telemetría en Vivo</p>
              </div>
            </button>
            <button
              onClick={() => setCurrentTab('calendar')}
              id="tab-calendar"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none ${currentTab === 'calendar' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-855 border border-transparent'}`}
            >
              <Calendar className={`w-4 h-4 ${currentTab === 'calendar' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">Google Calendar</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">Sincronizar Rutina</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentTab('bettermind')}
              id="tab-bettermind"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all font-sans font-medium tracking-tight whitespace-nowrap justify-start flex-1 lg:flex-none ${currentTab === 'bettermind' ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/40 text-[#8b5cf6] font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-855 border border-transparent'}`}
            >
              <Brain className={`w-4 h-4 ${currentTab === 'bettermind' ? 'text-[#8b5cf6]' : ''}`} />
              <div>
                <p className="font-semibold text-left text-xs">BetterMind</p>
                <p className="text-[10px] text-slate-500 text-left hidden sm:block">Duolingo, Piano, Lectura</p>
              </div>
            </button>

          </nav>

          {/* Sponsors Panel */}
          <div className="bg-[#1e293b]/85 border border-[#334155] rounded-xl p-4 shadow-xl space-y-3 overflow-hidden backdrop-blur-sm">
            <h3 className="font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#334155] pb-2 font-bold text-[10px]">
              <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
              Patrocinadores y Marcas BetterMe
            </h3>
            
            {/* Infinite scrolling logo marquee */}
            <div className="relative w-full overflow-hidden bg-slate-950/40 border border-slate-800 rounded-lg py-3 flex items-center">
              {/* Fade masks for smooth edges */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#1e293b] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#1e293b] to-transparent z-10 pointer-events-none" />
              <div className="animate-marquee flex items-center gap-8 px-4">
                {Array.from({ length: 2 }).map((_, loopIdx) => (
                  <React.Fragment key={loopIdx}>
                    {/* Logo 1: NegocioUp */}
                    <div className="flex items-center gap-2 text-slate-350 select-none opacity-70 hover:opacity-100 hover:text-white transition-opacity">
                      <svg viewBox="0 0 155 50" className="h-8 w-auto flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="silverArrow" x1="0" y1="1" x2="1" y2="0">
                            <stop offset="0%" stopColor="#cbd5e1" />
                            <stop offset="100%" stopColor="#ffffff" />
                          </linearGradient>
                        </defs>
                        <rect x="5" y="26" width="3.5" height="12" rx="1.75" fill="#3b82f6" />
                        <rect x="11" y="20" width="3.5" height="18" rx="1.75" fill="#ef4444" />
                        <rect x="17" y="13" width="3.5" height="25" rx="1.75" fill="#f59e0b" />
                        <rect x="23" y="6" width="3.5" height="32" rx="1.75" fill="#10b981" />
                        <path d="M 6.75 32 L 26.5 9" stroke="url(#silverArrow)" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 21.5 8.5 L 27.5 8 L 26.5 14" stroke="url(#silverArrow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <circle cx="6.75" cy="32" r="1.5" fill="#cbd5e1" stroke="#ffffff" strokeWidth="0.5" />
                        <text x="34" y="27" fill="#cbd5e1" fontSize="19" fontWeight="800" fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif" letterSpacing="-0.5">
                          Negocio<tspan fill="#3b82f6">Up</tspan>
                        </text>
                        <text x="34" y="38" fill="#94a3b8" fontSize="6.8" fontWeight="500" fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif" letterSpacing="0.2">
                          Más clientes • IA • Automatización
                        </text>
                      </svg>
                    </div>

                    {/* Logo 2: Ambitus */}
                    <div className="flex items-center gap-1.5 text-slate-350 select-none opacity-70 hover:opacity-100 hover:text-white transition-opacity">
                      <svg viewBox="0 0 110 50" className="h-8 w-auto flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Green back half */}
                        <path d="M 6 23 A 17 6 0 0 1 38 23" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        {/* Green top-right arrow */}
                        <path d="M 32 19.5 L 37.5 19.5 L 35.5 24" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        
                        {/* Grey oval */}
                        <g transform="rotate(8, 22, 23)">
                          <path d="M 20 6 A 8 16 0 1 1 15 35" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" />
                          {/* Grey bottom-left arrow */}
                          <path d="M 12 36 L 15 34 L 16 38.5" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </g>
                        
                        {/* Green front half */}
                        <path d="M 38 23 A 17 6 0 0 1 6 23" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        
                        {/* Text */}
                        <text x="44" y="27" fill="#cbd5e1" fontSize="20" fontWeight="700" fontFamily="'Space Grotesk', 'Inter', sans-serif" letterSpacing="-0.5">ambitus</text>
                        <text x="108" y="42" fill="#16a34a" fontSize="13" fontWeight="800" fontFamily="'Space Grotesk', 'Inter', sans-serif" textAnchor="end">360°</text>
                      </svg>
                    </div>

                    {/* Logo 3: Riviera Legacy */}
                    <div className="flex items-center gap-1.5 text-slate-350 select-none opacity-70 hover:opacity-100 hover:text-white transition-opacity">
                      <svg viewBox="0 0 115 50" className="h-8 w-auto flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 6 12 L 17 6 L 28 12 L 28 26 C 28 33 17 38 17 38 C 17 38 6 33 6 26 Z" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" />
                        <text x="17" y="26" fill="#fbbf24" fontSize="12" fontWeight="900" fontFamily="serif" textAnchor="middle">R</text>
                        <text x="36" y="26" fill="#cbd5e1" fontSize="19" fontWeight="800" fontFamily="Georgia, serif" fontStyle="italic" letterSpacing="-0.5">Riviera</text>
                        <text x="36" y="38" fill="#fbbf24" fontSize="9" fontWeight="800" fontFamily="sans-serif" letterSpacing="2.5">LEGACY</text>
                      </svg>
                    </div>

                    {/* Logo 4: Adidas */}
                    <div className="flex items-center gap-1 text-slate-350 select-none opacity-70 hover:opacity-100 hover:text-white transition-opacity">
                      <svg viewBox="0 0 53 48" className="h-8 w-auto flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="5,30 11,30 16,21 10,21" fill="#cbd5e1" />
                        <polygon points="16,30 22,30 32,12 26,12" fill="#cbd5e1" />
                        <polygon points="27,30 33,30 48,3 42,3" fill="#cbd5e1" />
                        <text x="26.5" y="44" fill="#cbd5e1" fontSize="13.5" fontWeight="800" fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif" textAnchor="middle" letterSpacing="-0.5">adidas</text>
                        <text x="47.5" y="37" fill="#cbd5e1" fontSize="4.5" fontFamily="sans-serif">®</text>
                      </svg>
                    </div>

                    {/* Logo 5: Kiubii */}
                    <div className="flex items-center gap-1.5 text-slate-350 select-none opacity-70 hover:opacity-100 hover:text-white transition-opacity">
                      <svg viewBox="0 0 95 50" className="h-8 w-auto flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* K */}
                        <path d="M12 10v22M23 10L13 21l10 11" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {/* i with pink dot */}
                        <line x1="29" y1="17" x2="29" y2="32" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="29" cy="11" r="2.5" fill="#ff52b2" />
                        {/* u */}
                        <path d="M36 17v10a4 4 0 008 0V17" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" fill="none" />
                        <line x1="44" y1="25" x2="44" y2="32" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                        {/* b */}
                        <line x1="51" y1="10" x2="51" y2="32" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="57" cy="24.5" r="7.5" stroke="#cbd5e1" strokeWidth="4" fill="none" />
                        {/* i with pink dot */}
                        <line x1="73" y1="17" x2="73" y2="32" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="73" cy="11" r="2.5" fill="#ff52b2" />
                        {/* i with pink dot */}
                        <line x1="81" y1="17" x2="81" y2="32" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="81" cy="11" r="2.5" fill="#ff52b2" />
                        
                        {/* Pink Wave Underline */}
                        <path d="M8 38 Q 25 43 45 35 Q 25 39 8 38" fill="#ff52b2" />
                        
                        {/* Tagline */}
                        <text x="94" y="38" fill="#94a3b8" fontSize="6.2" fontWeight="900" fontFamily="sans-serif" textAnchor="end" letterSpacing="0.2">WELLNESS</text>
                        <text x="94" y="45" fill="#94a3b8" fontSize="6.2" fontWeight="900" fontFamily="sans-serif" textAnchor="end" letterSpacing="0.2">SUPPLEMENTS</text>
                      </svg>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Data Administration and Backup Panel */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 shadow-xl space-y-4 text-xs">
            <h3 className="font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#334155] pb-2 font-bold">
              <Download className="w-3.5 h-3.5 text-[#8b5cf6]" />
              Gestión de Datos y Copias
            </h3>
            
            <div className="space-y-3">
              {/* Backups section */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 font-sans uppercase tracking-widest font-bold">Respaldos Automáticos (24h)</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleManualBackup}
                    className="py-2 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-350 font-semibold rounded-lg transition-colors cursor-pointer text-center text-[10px] font-sans flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3 text-[#8b5cf6]" />
                    Respaldar
                  </button>
                  <button
                    onClick={fetchAndRestoreLatestBackup}
                    className="py-2 px-2.5 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#8b5cf6] font-semibold rounded-lg transition-colors cursor-pointer text-center text-[10px] font-sans flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restaurar
                  </button>
                </div>
                {localStorage.getItem("betterme_last_backup_time") && (
                  <p className="text-[9px] text-slate-500 font-mono italic text-center mt-1">
                    Último: {new Date(parseInt(localStorage.getItem("betterme_last_backup_time") || "0", 10)).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Reset Section */}
              <div className="border-t border-[#334155] pt-3 space-y-2">
                <p className="text-[10px] text-slate-500 font-sans uppercase tracking-widest font-bold">Zona de Pruebas</p>
                
                {confirmReset ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-rose-400 leading-relaxed font-semibold">
                      ⚠️ ¿Confirmas restablecer todas tus métricas, XP y logs a cero? Esta acción no se puede deshacer.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleResetData}
                        className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-center text-[10px] uppercase shadow-md shadow-rose-950/50"
                      >
                        Sí, Reiniciar
                      </button>
                      <button
                        onClick={() => setConfirmReset(false)}
                        className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-350 font-bold rounded-lg transition-colors cursor-pointer text-center text-[10px] uppercase"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="w-full py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/40 text-rose-450 font-bold rounded-lg transition-all cursor-pointer text-center text-[10px] uppercase flex items-center justify-center gap-1 hover:border-rose-600/50"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    Reiniciar a Cero
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Columns: Main Content Views */}
        <section className="col-span-1 lg:col-span-3">

          {/* VIEW 1: HOY / DAILY PROGRAM */}
          {currentTab === 'hoy' && (
            <div id="view-hoy" className="space-y-6">
              
              {/* Day Selector Navigation Hub */}
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 shadow-md">
                <h3 className="text-xs text-slate-400 uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  Inspección y Registro de Alimentos/Entrenamientos
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[
                    { id: "monday", label: "LUN", task: "Torso A" },
                    { id: "tuesday", label: "MAR", task: "Pierna A" },
                    { id: "wednesday", label: "MIÉ", task: "Running" },
                    { id: "thursday", label: "JUE", task: "Torso B" },
                    { id: "friday", label: "VIE", task: "Pierna B" },
                    { id: "saturday", label: "SÁB", task: "Descanso" },
                    { id: "sunday", label: "DOM", task: "Descanso" }
                  ].map((day) => {
                    const isSelected = activeDay === day.id;
                    return (
                      <button
                        key={day.id}
                        onClick={() => {
                          setActiveDay(day.id);
                        }}
                        id={`btn-day-${day.id}`}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border text-center transition-all ${isSelected ? 'bg-[#8b5cf6]/15 border-[#8b5cf6] text-violet-400 font-bold shadow-inner' : 'bg-[#0f172a]/50 border-[#334155] text-slate-400 hover:bg-[#0f172a]'}`}
                      >
                        <span className="text-xs font-bold font-sans tracking-tight">{day.label}</span>
                        <span className="text-[9px] font-mono tracking-tighter opacity-70 truncate max-w-full">
                          {day.task}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Orientation Alert Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 3 LITER HYDRATION BLOCK */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl md:col-span-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-200">
                        🥤 Hidratación de Acero
                      </h3>
                      <p className="text-xs text-violet-400 font-mono mt-0.5">Meta: 3.0 Litros / Día</p>
                    </div>
                    <span className="p-1 rounded-lg bg-violet-500/10 text-[#8b5cf6]">
                      <Droplet className="w-5 h-5 animate-bounce" />
                    </span>
                  </div>

                  {/* Salty Lemons Context */}
                  <div className="bg-[#0f172a]/80 border border-[#334155] rounded-lg p-2.5 mb-4 text-[11px] text-slate-400 leading-relaxed font-sans mt-1">
                    <span className="text-violet-400 font-bold">Botellas de entrenamiento:</span> Distribuye el jugo de <strong>1 limón</strong> y <strong>3g de sal marina</strong> sin procesar para mantener el equilibrio de sodio durante los desvelos o entrenos.
                  </div>

                  {/* Progress Water Tank */}
                  <div className="relative h-28 bg-[#0f172a] border border-[#334155] rounded-lg overflow-hidden flex flex-col justify-end items-center mb-4">
                    {/* Water waves simulation styling */}
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-sky-600/60 to-sky-400/45 transition-all duration-500"
                      style={{ height: `${(hydrationLiters / 3.0) * 100}%` }}
                    />
                    
                    <div className="z-10 text-center pb-2">
                      <p className="font-mono text-3xl font-extrabold text-slate-50 tracking-wide drop-shadow-md">
                        {hydrationLiters.toFixed(2)}L
                      </p>
                      <p className="text-[10px] text-sky-200 font-mono tracking-widest uppercase mt-0.5">
                        {Math.round((hydrationLiters / 3.0) * 100)}% Completado
                      </p>
                    </div>
                  </div>

                  {/* Quick-add buttons stack */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    <button
                      onClick={() => addWater(0.25)}
                      id="btn-add-water-250"
                      className="py-1.5 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> 250ml
                    </button>
                    <button
                      onClick={() => addWater(0.5)}
                      id="btn-add-water-500"
                      className="py-1.5 rounded-lg border border-[#334155] bg-[#0f172a] hover:bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> 500ml
                    </button>
                    <button
                      onClick={() => addWater(1.0)}
                      id="btn-add-water-1000"
                      className="py-1.5 rounded-lg border border-orange-500/40 bg-orange-950/20 text-violet-400 hover:bg-orange-900/40 font-mono text-xs flex items-center justify-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> 1L
                    </button>
                  </div>

                  <button
                    onClick={resetWater}
                    id="btn-reset-water"
                    className="w-full py-1 text-center font-mono text-[10px] text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" /> Reiniciar Hidración
                  </button>
                </div>

                {/* FOOD PLAN / CHECKLIST DETAILS */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-200">
                        🍛 BetterFood ({activeDay === "saturday" || activeDay === "sunday" ? "Fin de Semana" : "Semana"})
                      </h3>
                      <p className="text-xs text-slate-400 font-sans tracking-tight">Carga calórica, proteína magra y balance anabólico (BetterFood)</p>
                    </div>
                    <UtensilsCrossed className="w-5 h-5 text-[#8b5cf6]" />
                  </div>

                  <div className="space-y-3">
                    {mealsList.map((meal) => {
                      const isMealChecked = checkedMeals[meal.id] || false;
                      return (
                        <div
                          key={meal.id}
                          className={`border rounded-xl p-3.5 transition-all ${isMealChecked ? 'bg-emerald-950/10 border-emerald-900/50' : 'bg-[#0f172a]/40 border-[#334155]'}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="font-sans font-bold text-xs md:text-sm text-slate-200">
                              {meal.title}
                            </h4>
                            <button
                              onClick={() => selectMealChecked(meal.id, meal.xpBonus)}
                              id={`chk-meal-${meal.id}`}
                              className={`p-1.5 px-3 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${isMealChecked ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-[#0f172a] border-[#334155] text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="hidden sm:inline">
                                {isMealChecked ? "Consumido (+XP)" : "Marcar Consumo"}
                              </span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-[#334155]/40">
                            {meal.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-[#0f172a]/60 p-1.5 rounded text-[11px] font-sans border border-[#334155]/20">
                                <span className="text-slate-300 font-medium truncate max-w-[70%]">
                                  {item.ingredient}
                                </span>
                                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  {item.amount_g ? `${item.amount_g}g` : item.amount_ml ? `${item.amount_ml}ml` : "Porción"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* GYM ROUTINE VS RUNNING ACTIVE LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Dynamic Fitness Track Panel */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl lg:col-span-2 space-y-4">
                  
                  {isGymDay && currentGymRoutine ? (
                    // --- DISPLAY GYM EXERCISES FOR THE DAY ---
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] tracking-widest font-mono text-[#8b5cf6] uppercase bg-orange-5050 animate-pulse bg-violet-500/10 border border-[#8b5cf6]/20 px-2 py-0.5 rounded">
                            Sesión de pesas activa ({activeDay.toUpperCase()})
                          </span>
                          <h3 className="font-display font-bold text-lg text-slate-100 mt-1">
                            Routine: {currentGymRoutine.focus}
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          Min. descanso: 90s - 120s
                        </span>
                      </div>

                      <div className="space-y-3">
                        {currentGymRoutine.exercises.map((ex, idx) => {
                          const isCompleted = completedExercises.includes(ex.name);
                          return (
                            <div
                              key={idx}
                              className={`border rounded-xl p-3.5 transition-all ${isCompleted ? 'bg-emerald-950/10 border-emerald-900/40' : 'bg-[#0f172a]/50 border-[#334155]'}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-2 max-w-[70%]">
                                  <span className="text-xs font-mono text-slate-500 bg-[#0f172a] border border-[#334155]/30 px-2 py-0.5 rounded mt-0.5">
                                    {(idx + 1).toString().padStart(2, '0')}
                                  </span>
                                  <div>
                                    <h4 className="font-sans font-bold text-xs md:text-sm text-slate-100 leading-tight">
                                      {ex.name}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 mt-1 font-sans">
                                      Sets: <strong className="text-slate-200">{ex.sets}</strong> • Reps: <strong className="text-slate-200">{ex.reps}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  {/* Quick simulation play redirect link */}
                                  <button
                                    onClick={() => {
                                      setSelectedExercise(ex.name);
                                      setCurrentTab('ejercicios');
                                    }}
                                    id={`btn-view-anatomy-${idx}`}
                                    className="p-1 px-2 rounded-lg border border-[#334155] bg-[#0f172a]/80 text-[10px] font-mono text-slate-300 hover:text-slate-100 flex items-center gap-1"
                                    title="Ver movimiento"
                                  >
                                    <Play className="w-3 h-3" /> Ver Técnica
                                  </button>

                                  <button
                                    onClick={() => toggleExerciseCheck(ex.name)}
                                    id={`chk-exercise-${idx}`}
                                    className={`p-1.5 px-3 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${isCompleted ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-[#0f172a] border-[#334155] text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{isCompleted ? "Completo (+20XP)" : "Marcar"}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : isRunningDay ? (
                    // --- DISPLAY RUNNING WORKOUT COMPONENT WITH TIMER ---
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] tracking-widest font-mono text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                          Rutina Cardiovascular ({activeDay.toUpperCase()})
                        </span>
                        <h3 className="font-display font-bold text-lg text-slate-100 mt-1">
                          Correr: {RUNNING_PHASES[activeRunningPhase].protocol}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">
                          {RUNNING_PHASES[activeRunningPhase].details}
                        </p>
                      </div>

                      {/* Interactive Interval Selector */}
                      <div className="bg-[#0f172a] border border-[#334155] p-3 rounded-xl">
                        <label className="block text-xs font-mono text-slate-400 mb-2">
                          Configuración del Trote Evolutivo actual (Ajusta según tu semana de avance):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          {RUNNING_PHASES.map((ph, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                  setActiveRunningPhase(idx);
                                  resetRunningTimer();
                              }}
                              className={`p-2 rounded-lg text-xs font-sans text-left border transition-all flex flex-col justify-between ${activeRunningPhase === idx ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300' : 'bg-[#0f172a] border-[#334155] text-slate-400'}`}
                            >
                              <span className="font-bold">{ph.months}</span>
                              <span className="text-[10px] opacity-75 mt-0.5 truncate max-w-full">{ph.protocol}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* STOPWATCH / TIMER WIDGET DISPLAY */}
                      <div className="bg-[#0f172a] border border-[#334155] p-5 rounded-2xl flex flex-col items-center">
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono px-3 py-1 rounded-full mb-3">
                          <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Intervalos de Trote Gastón - Enlace Directo</span>
                        </div>

                        {/* Interactive Large Clock */}
                        <div className="text-center">
                          <span className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-50 tracking-wider">
                            {formatTimeClock(timerSecondsLeft)}
                          </span>
                          <p className="text-xs font-mono text-slate-400 mt-2">
                            Estado actual:{" "}
                            <strong className={`uppercase ${timerState === 'running' ? 'text-emerald-400 animate-pulse' : timerState === 'walking' ? 'text-yellow-400 animate-pulse' : 'text-slate-500'}`}>
                              {timerState === 'running' ? "🏃 ¡CORRIENDO!" : timerState === 'walking' ? "🚶 CAMINANDO - Descanso Activo" : timerState === 'done' ? "🎉 ¡PROGRESO LOGRADO!" : "PAUSADO"}
                            </strong>
                          </p>
                        </div>

                        {/* Intervals and Total Stats Progress */}
                        {activeRunningPhase < 2 && (
                          <div className="w-full max-w-xs mt-4 flex justify-between text-xs font-mono border-t border-[#334155] pt-3">
                            <div>
                              <span className="text-slate-500">Intervalo actual:</span>
                              <span className="text-slate-300 font-bold ml-1.5">
                                {timerCurrentInterval} / {activeRunningPhase === 0 ? 4 : 3}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Total entrenado:</span>
                              <span className="text-slate-300 font-bold ml-1.5">
                                {formatTimeClock(timerTotalElapsed)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Control Buttons Stack */}
                        <div className="flex items-center gap-3 mt-5">
                          {timerState === 'idle' || timerState === 'done' ? (
                            <button
                              onClick={startRunningTimer}
                              id="btn-run-timer-play"
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 font-sans font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs sm:text-sm"
                            >
                              <Play className="w-4 h-4 fill-slate-950" /> Comenzar Trote
                            </button>
                          ) : (
                            <button
                              onClick={pauseRunningTimer}
                              id="btn-run-timer-pause"
                              className="px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-sans font-bold transition-all flex items-center gap-2 text-xs sm:text-sm"
                            >
                              <Pause className="w-4 h-4" /> Pausar
                            </button>
                          )}

                          <button
                            onClick={resetRunningTimer}
                            id="btn-run-timer-reset"
                            className="p-2.5 rounded-xl border border-[#334155] bg-[#0f172a] text-slate-400 hover:text-slate-300 transition-colors"
                            title="Reiniciar Cronómetro"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    // --- DISPLAY REST DAY ---
                    <div className="text-center py-10 space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xl">
                        💤
                      </div>
                      <div>
                        <h3 className="font-display font-medium text-lg text-slate-200">
                          Día de Descanso y Superávit Anabólico
                        </h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                          La masa muscular de Gastón no se construye levantando pesas, se esculpe durmiendo y asimilando los nutrientes de las legumbres, la avena y los huevos cocidos. ¡Mentaliza la meta de 65kg!
                        </p>
                      </div>

                      {/* Recoup check */}
                      <div className="max-w-xs mx-auto text-left bg-[#0f172a] p-4 border border-[#334155] rounded-xl space-y-2.5">
                        <label className="text-[11px] font-mono text-slate-500 block uppercase tracking-wider">
                          Recuperación e higiene de sueño:
                        </label>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Dormir mínimo 7.5 a 8 horas</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Nutrición limpia libre de alimentos procesados</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Carga acumulada de agua 3L</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Right Column: Mini Animator Quick preview */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 shadow-xl">
                    <h4 className="font-display font-bold text-xs text-slate-300 mb-2 uppercase tracking-wide">
                      Anatomía Técnica
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3 font-sans">
                      Hacer tus levantamientos con la biomecánica estricta previene lesiones y enfoca el crecimiento en el músculo magro.
                    </p>
                    <ExerciseAnimator exerciseName={isGymDay ? selectedExercise : "running"} />
                  </div>

                  {/* ONEPLUS WATCH 2 DUAL ENGINE TELEMETRY CARD */}
                  <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${watchConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                          <h4 className="font-display font-bold text-sm text-slate-200">
                            ⌚ OnePlus Watch 2
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {watchConnected ? "Wear OS 4 + RTOS Conectado" : "Desconectado"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWatchConnected(!watchConnected)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-all ${watchConnected ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : 'bg-rose-950/40 text-rose-400 border-rose-800'}`}
                      >
                        {watchConnected ? "Desconectar" : "Conectar"}
                      </button>
                    </div>

                    {watchConnected ? (
                      <div className="space-y-3.5">
                        {/* Live telemetry values */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Heart rate sensor */}
                          <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-2.5 flex items-center gap-3">
                            <span className={`text-2xl ${timerState === 'running' ? 'animate-bounce text-red-500' : 'text-red-500 animate-pulse'}`}>❤️</span>
                            <div>
                              <p className="text-[9px] font-mono text-slate-500 uppercase">Frec. Cardíaca</p>
                              <p className="text-base font-mono font-extrabold text-slate-200">{watchData.heartRate} <span className="text-[10px] font-normal text-slate-400">ppm</span></p>
                            </div>
                          </div>

                          {/* Step count */}
                          <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-2.5 flex items-center gap-3">
                            <span className="text-2xl text-sky-400">🏃</span>
                            <div>
                              <p className="text-[9px] font-mono text-slate-500 uppercase">Pasos Hoy</p>
                              <p className="text-base font-mono font-extrabold text-slate-200">{watchData.stepsToday}</p>
                            </div>
                          </div>
                        </div>

                        {/* Engine state and Battery */}
                        <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-400">Motor Activo:</span>
                            <span className={`px-2 py-0.5 rounded font-bold ${watchData.activeEngine.includes('RTOS') ? 'bg-teal-950 text-teal-400 border border-teal-900/50' : 'bg-amber-950 text-amber-400 border border-amber-900/50'}`}>
                              {watchData.activeEngine}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-400">Batería Watch:</span>
                            <span className="text-slate-200">{watchData.batteryLevel}%</span>
                          </div>

                          <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden border border-[#334155]">
                            <div className="bg-emerald-400 h-full transition-all" style={{ width: `${watchData.batteryLevel}%` }} />
                          </div>
                        </div>

                        {/* Synchronize Action Button */}
                        <button
                          type="button"
                          onClick={handleSyncWatchWorkout}
                          disabled={isSyncingWatch}
                          className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-slate-950 font-sans font-bold text-xs rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/10 cursor-pointer"
                        >
                          {isSyncingWatch ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
                              <span>Sincronizando reloj...</span>
                            </>
                          ) : (
                            <>
                              <span>⚡ Sincronizar Datos a Rutina</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-[#0f172a]/50 border border-dashed border-[#334155] rounded-lg text-slate-400 text-xs font-sans">
                        Reloj no vinculado. Enciende la comunicación para sincronizar sensores en tiempo real (Wear OS + RTOS).
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* REGISTRO DE ACTIVIDAD DIARIA & GOOGLE CALENDAR SYNC */}
              <div id="activity-logger-panel" className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155]/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-violet-500/10 border border-violet-500/20 text-[#8b5cf6] rounded-lg">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-100">
                        📋 Registro de Actividad y Logros Diarios
                      </h3>
                      <p className="text-xs text-slate-400">Guarda tus estadísticas de motivación en Firestore y sincroniza con tu Google Calendar.</p>
                    </div>
                  </div>
                  
                  {googleUser && (
                    <button
                      type="button"
                      onClick={handleAutofillTodayRoutine}
                      id="btn-autofill-logger"
                      className="text-[10px] sm:text-xs font-mono font-bold bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30 px-3 py-1.5 rounded-lg hover:bg-[#8b5cf6] hover:text-[#0f172a] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Autocompletar Rutina de Hoy
                    </button>
                  )}

                </div>
                {!googleUser ? (
                  <div className="bg-[#0f172a]/80 border border-amber-500/20 rounded-xl p-5 text-center space-y-3">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto text-lg">
                      🔑
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">¿Deseas registrar y calificar tus progresos en tu Calendario?</h4>
                      <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1 leading-relaxed">
                        Conéctate usando tu cuenta de Google (<strong>gastonmorante@gmail.com</strong>) usando el panel lateral de "Sincronización Google" para desbloquear el registro en la nube de motivaciones, gráficos interactivos y sincronización de Google Calendar en vivo.
                      </p>
                    </div>
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="mx-auto flex items-center gap-2 px-4 py-2 border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-[#0f172a] rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      {isLoggingIn ? "Conectando..." : "Iniciar Sesión con Google"}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterAndSyncWorkout} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Date & Type */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Fecha del Registro</label>
                        <input
                          type="date"
                          value={logDate}
                          onChange={(e) => setLogDate(e.target.value)}
                          className="w-full bg-[#0f172a] border border-[#334155] p-2.5 rounded-lg text-xs md:text-sm text-slate-200 focus:outline-none focus:border-[#8b5cf6]"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Tipo de Actividad</label>
                        <select
                          value={logDayType}
                          onChange={(e) => setLogDayType(e.target.value as 'gym' | 'run' | 'rest')}
                          className="w-full bg-[#0f172a] border border-[#334155] p-2.5 rounded-lg text-xs md:text-sm text-slate-205 focus:outline-none focus:border-[#8b5cf6]"
                        >
                          <option value="gym">🏋️ Pesas (Gimnasio)</option>
                          <option value="run">🏃 Trote / Cardio (Running)</option>
                          <option value="rest">💤 Descanso / Recuperación</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Foco / Detalle de la Sesión</label>
                        <input
                          type="text"
                          value={logFocusName}
                          onChange={(e) => setLogFocusName(e.target.value)}
                          placeholder="Ej. Torso A, Trote 8 Min, Descanso"
                          className="w-full bg-[#0f172a] border border-[#334155] p-2.5 rounded-lg text-xs md:text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#8b5cf6]"
                          required
                        />
                      </div>

                    </div>

                    {/* Sub-exercises selector for gym type only */}
                    {logDayType === 'gym' && isGymDay && currentGymRoutine && (
                      <div className="bg-[#0f172a]/60 border border-[#334155]/60 rounded-lg p-3 space-y-2">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Selecciona Ejercicios Completados en esta Sesión:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {currentGymRoutine.exercises.map((ex) => {
                            const isChecked = logExercises.includes(ex.name);
                            return (
                              <button
                                type="button"
                                key={ex.name}
                                onClick={() => handleToggleLogExercise(ex.name)}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border text-left text-xs transition-all ${isChecked ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-orange-200 shadow-sm' : 'bg-[#1e293b]/40 border-[#334155]/50 text-slate-450 hover:border-slate-500 hover:text-slate-200'}`}
                              >
                                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-[#8b5cf6] border-[#8b5cf6] text-[#0f172a]' : 'border-slate-600'}`}>
                                  {isChecked && "✓"}
                                </span>
                                <span className="font-medium truncate">{ex.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Motivation rating slider tracker */}
                    <div className="bg-[#0f172a]/65 border border-[#334155]/50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Califica tu Motivación Semanal/Diaria</span>
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl font-extrabold font-mono text-violet-400">{logRating} <span className="text-xs text-slate-500 font-normal">/10</span></span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/30">
                            {logRating >= 9 ? "🎯 ¡Fuego Máximo!" : logRating >= 7 ? "⚡ Fuerte & Disciplinado" : logRating >= 5 ? "👍 Cumplido" : "💤 Con pereza/Flojo"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={logRating}
                          onChange={(e) => setLogRating(parseInt(e.target.value, 10))}
                          className="w-full accent-[#8b5cf6] cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                          <span>1 (Baja)</span>
                          <span>3</span>
                          <span>5 (Estable)</span>
                          <span>7</span>
                          <span>9</span>
                          <span>10 (Invencible)</span>
                        </div>
                      </div>
                    </div>

                    {/* notes input sentiment */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Notas de Sentimiento o Peso</label>
                      <textarea
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="Ej: Rompí récords en press de banca plano, subí a 55kg de carga! O cansado del trote pero logré llegar a la marca de los 8 min enteros..."
                        rows={2}
                        className="w-full bg-[#0f172a] border border-[#334155] p-2.5 rounded-lg text-xs md:text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-[#8b5cf6]"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <Info className="w-3.5 h-3.5 text-violet-400" />
                        <span>Sincroniza directamente a tu Google Calendar</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSyncingCalendar}
                        id="btn-register-activity-submit"
                        className="px-5 py-2.5 rounded-xl bg-[#8b5cf6] text-[#0f172a] hover:bg-orange-400 transition-all font-sans font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-500/10"
                      >
                        {isSyncingCalendar ? (
                          <>
                            <span className="w-4 h-4 border-2 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
                            <span>Sincronizando con Google...</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span>Guardar Log & Sincronizar Google Calendar</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}
              </div>

            </div>
          )}


{currentTab === 'calendar' && (
            <div id="view-calendar" className="space-y-6">
              <div className="bg-gradient-to-r from-blue-950/40 to-[#1e293b]/60 border border-[#334155] p-6 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#8b5cf6]" />
                    Sincronización con Google Calendar
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sincroniza tus 4 días de entrenamiento de fuerza y tus 3 sesiones de running evolutivo con nutrición integrada directamente en tu Google Calendar personal.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-900 border border-[#334155] px-4 py-2 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-mono">MODO DE CONEXIÓN</span>
                    <span className="text-xs font-bold text-slate-300">{calendarSimulated ? "Simulado (Desarrollo)" : "Producción (Google OAuth)"}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!calendarSimulated} 
                      onChange={() => setCalendarSimulated(prev => !prev)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="bg-[#1e293b] border border-[#334155] p-6 rounded-xl space-y-6 shadow-lg">
                  <h3 className="font-bold text-base text-slate-200 flex items-center gap-2 border-b border-[#334155] pb-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Estado de la Cuenta
                  </h3>

                  {calendarConnected ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-950/20 border border-emerald-800/50 rounded-lg flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-300">VINCULADO CORRECTAMENTE</p>
                          <p className="text-[11px] text-slate-450 font-mono mt-0.5">{calendarEmail}</p>
                        </div>
                      </div>

                      <button
                        onClick={handleSyncCalendar}
                        disabled={isSyncingCalendar}
                        className="w-full py-3 bg-gradient-to-r from-[#8b5cf6] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-900 font-bold rounded-lg text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className={`w-4 h-4 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                        {isSyncingCalendar ? "Sincronizando..." : "Sincronizar Rutina Completa"}
                      </button>

                      <button
                        onClick={handleDisconnectCalendar}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Desconectar Cuenta
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-center space-y-2">
                        <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400">Tu Google Calendar no está conectado.</p>
                      </div>

                      <button
                        onClick={handleConnectCalendar}
                        className="w-full py-3 bg-[#8b5cf6] hover:bg-orange-600 text-slate-900 font-bold rounded-lg text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 fill-slate-900" />
                        Conectar Google Calendar
                      </button>

                      <p className="text-[10px] text-slate-500 leading-normal">
                        * Al sincronizar, se generará tu plan completo de entrenamientos y recordatorios nutricionales programados para las siguientes 4 semanas.
                      </p>
                    </div>
                  )}

                </div>

                <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] p-6 rounded-xl space-y-4 shadow-lg">
                  <h3 className="font-bold text-base text-slate-200 border-b border-[#334155] pb-3 flex justify-between items-center">
                    <span>📅 Vista Previa del Cronograma a Sincronizar</span>
                    <span className="text-xs font-mono bg-slate-800 text-sky-400 px-2 py-0.5 rounded border border-slate-700/50 font-semibold font-sans">Meses 1-12</span>
                  </h3>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full font-semibold">Lunes (07:00 - 08:30)</span>
                        <span className="text-xs font-bold text-slate-300">Gimnasio: Torso A (Empuje)</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 font-mono"><b>Rutina:</b> Press banca, Remo pesado, Press hombro, Jalón al pecho, Fondos.</p>
                      <p className="text-[11px] text-slate-500 leading-normal"><b>Nutrición:</b> 07:00 AM Plátano pre-entreno | 08:45 AM Licuado post-entreno con Creatina | 09:30 AM Desayuno huevos y tortillas.</p>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full font-semibold">Martes (07:00 - 08:30)</span>
                        <span className="text-xs font-bold text-slate-300">Gimnasio: Pierna A (Cuádriceps)</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 font-mono"><b>Rutina:</b> Sentadilla barra, Peso muerto rumano, Leg press, Extensiones, Pantorrillas.</p>
                      <p className="text-[11px] text-slate-500 leading-normal"><b>Nutrición:</b> Alimentación anabólica completa con 180g de proteína magra en la comida.</p>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-semibold">Miércoles (19:00 - 19:45)</span>
                        <span className="text-xs font-bold text-slate-300">Running: Trote o Intervalos</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 font-mono"><b>Rutina:</b> Sesión de trote aeróbico continuo evolutivo o intervalos de velocidad.</p>
                      <p className="text-[11px] text-slate-500 leading-normal"><b>Nutrición:</b> 18:30 PM Snack Pre-Correr (Media manzana o 12 almendras) | Cena de recuperación.</p>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full font-semibold">Jueves (07:00 - 08:30)</span>
                        <span className="text-xs font-bold text-slate-300">Gimnasio: Torso B (Tirón y Brazos)</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 font-mono"><b>Rutina:</b> Incline press, Dominadas o jalón supino, Remo cable, Laterales hombro, Superset.</p>
                      <p className="text-[11px] text-slate-500 leading-normal"><b>Nutrición:</b> Licuado post-entreno con 30g de proteína + 5g de Creatina monohidratada.</p>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full font-semibold">Viernes (07:00 - 08:30)</span>
                        <span className="text-xs font-bold text-slate-300">Gimnasio: Pierna B (Isquiotibiales)</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 font-mono"><b>Rutina:</b> Leg press pesado, Desplantes caminados, Curl femoral, Extensiones, Pantorrillas.</p>
                      <p className="text-[11px] text-slate-500 leading-normal"><b>Nutrición:</b> Hidratación intensiva de 3 litros con sal de grano durante la sesión.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

{currentTab === 'bettermind' && (
            <div id="view-bettermind" className="space-y-6">
              
              <div className="bg-gradient-to-r from-indigo-950/40 to-[#1e293b]/60 border border-[#334155] p-6 rounded-xl shadow-xl space-y-1">
                <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  BetterMind — Cuerpo Sano en Mente Sana
                </h2>
                <p className="text-xs text-slate-400">
                  Desarrolla tus habilidades cognitivas, ajedrez, piano y hábitos diarios para una mente expandida y enfocada.
                </p>
              </div>

{/* Daily Checklist Card */}
              <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl shadow-lg space-y-4">
                <h3 className="font-bold text-sm md:text-base text-slate-200 flex items-center gap-2 border-b border-[#334155] pb-2 font-sans">
                  <CheckSquare className="w-5 h-5 text-emerald-400 animate-pulse" />
                  Lista de Verificación Diaria (Hábitos de Hoy)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-left">
                  {/* Habit 1: Duolingo */}
                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-lg cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={habitsChecked.duolingo}
                      onChange={(e) => setHabitsChecked(prev => ({ ...prev, duolingo: e.target.checked }))}
                      className="mt-0.5 rounded text-emerald-500 bg-slate-900 border-slate-800 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className={`text-xs font-bold ${habitsChecked.duolingo ? 'text-slate-500 line-through' : 'text-slate-200'}`}>Duolingo</span>
                      <p className="text-[10px] text-slate-400">Completar racha de Idioma/Ajedrez</p>
                      {duolingoData.streak > 0 && (
                        <span className="inline-block text-[9px] font-mono text-violet-400 mt-1">🔥 Racha: {duolingoData.streak}d</span>
                      )}
                    </div>
                  </label>

                  {/* Habit 2: Piano */}
                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-lg cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={habitsChecked.piano}
                      onChange={(e) => setHabitsChecked(prev => ({ ...prev, piano: e.target.checked }))}
                      className="mt-0.5 rounded text-indigo-500 bg-slate-900 border-slate-800 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className={`text-xs font-bold ${habitsChecked.piano ? 'text-slate-500 line-through' : 'text-slate-200'}`}>Estudio de Piano</span>
                      <p className="text-[10px] text-slate-400">Práctica recomendada de 20 min</p>
                      <span className={`inline-block text-[9px] font-mono mt-1 ${pianoTimePracticed >= 1200 ? 'text-emerald-400 font-bold' : 'text-indigo-400'}`}>
                        ⏱️ Hoy: {Math.floor(pianoTimePracticed / 60)}m / 20m
                      </span>
                    </div>
                  </label>

                  {/* Habit 3: Reading */}
                  <label className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-lg cursor-pointer transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={habitsChecked.reading}
                      onChange={(e) => setHabitsChecked(prev => ({ ...prev, reading: e.target.checked }))}
                      className="mt-0.5 rounded text-amber-500 bg-slate-900 border-slate-800 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className={`text-xs font-bold ${habitsChecked.reading ? 'text-slate-500 line-through' : 'text-slate-200'}`}>Lectura Diaria</span>
                      <p className="text-[10px] text-slate-400">Meta recomendada: 15 páginas</p>
                      {(() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const pagesToday = readingLogs
                          .filter((l: any) => l.date === todayStr)
                          .reduce((sum: number, l: any) => sum + l.pagesRead, 0);
                        return (
                          <span className={`inline-block text-[9px] font-mono mt-1 ${pagesToday >= 15 ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                            📚 Hoy: {pagesToday}p / 15p
                          </span>
                        );
                      })()}
                    </div>
                  </label>
                </div>

                {/* Consistencia de Hábitos Semanal (Muestra Faltas e Índice) */}
                {(() => {
                  const weeklyStatus = getWeeklyHabitStatus();
                  return (
                    <div className="border-t border-[#334155] pt-4 mt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-sans">
                          📊 Consistencia Semanal de Hábitos (Piano y Lectura):
                          <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${
                            weeklyStatus.score >= 8 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 
                            weeklyStatus.score >= 5 ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' : 
                            'bg-rose-950/60 text-rose-300 border-rose-800/60'
                          }`}>
                            {weeklyStatus.score.toFixed(1)} / 10
                          </span>
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                          <span className="flex items-center gap-1">🔴 Faltas Piano: <strong className="text-rose-400 font-bold">{weeklyStatus.pianoFaltas}</strong></span>
                          <span className="flex items-center gap-1">🔴 Faltas Lectura: <strong className="text-rose-400 font-bold">{weeklyStatus.readingFaltas}</strong></span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1.5 text-center">
                        {weeklyStatus.weekDays.map((day: any, idx: number) => (
                          <div key={idx} className="bg-slate-950/40 border border-slate-850 p-2 rounded-lg flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 font-sans">{day.dayName}</span>
                            
                            <div className="flex gap-1.5">
                              {/* Piano indicator */}
                              <div 
                                title={`Piano: ${day.pianoStatus === 'check' ? 'Completado' : day.pianoStatus === 'falta' ? 'Falta (Sin registro)' : day.pianoStatus === 'pending' ? 'Pendiente' : 'Futuro'}`}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                                  day.pianoStatus === 'check' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                                  day.pianoStatus === 'falta' ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse' :
                                  day.pianoStatus === 'pending' ? 'bg-slate-800 text-slate-500 border-slate-700' :
                                  'bg-slate-900/20 text-slate-700 border-slate-900'
                                }`}
                              >
                                P
                              </div>
                              
                              {/* Reading indicator */}
                              <div 
                                title={`Lectura: ${day.readingStatus === 'check' ? 'Completado' : day.readingStatus === 'falta' ? 'Falta (Sin registro)' : day.readingStatus === 'pending' ? 'Pendiente' : 'Futuro'}`}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                                  day.readingStatus === 'check' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                                  day.readingStatus === 'falta' ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse' :
                                  day.readingStatus === 'pending' ? 'bg-slate-800 text-slate-500 border-slate-700' :
                                  'bg-slate-900/20 text-slate-700 border-slate-900'
                                }`}
                              >
                                L
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-[#1e293b] border border-[#334155] p-6 rounded-xl space-y-4 shadow-lg flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-base text-slate-200 border-b border-[#334155] pb-3 flex items-center justify-between font-sans">
                      <span className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pulse" />
                        Duolingo: Idiomas y Ajedrez
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">Duolingo Sync</span>
                    </h3>

                    <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-lg border border-slate-850">
                      <img 
                        src={duolingoData.avatarUrl} 
                        alt="Duolingo Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-slate-900"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">Usuario:</span>
                          <input 
                            type="text" 
                            value={duolingoUser} 
                            onChange={(e) => setDuolingoUser(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded font-mono w-28 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleFetchDuolingo(duolingoUser)}
                            disabled={duolingoLoading}
                            className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-emerald-900 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {duolingoLoading ? "Sincronizando..." : "Sincronizar"}
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 font-sans">
                          <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-200">{duolingoData.streak} Días de Racha</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <span>Total XP:</span>
                            <span className="font-bold text-slate-300">{duolingoData.totalXp}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">CURSOS ACTIVOS EN TU PERFIL</p>
                      
                      {duolingoData.courses && duolingoData.courses.map((course: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-850 rounded-lg hover:border-slate-800 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-200 font-sans">{course.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-slate-400">XP: {course.xp}</span>
                            <span className="text-violet-400 flex items-center gap-0.5 font-bold">
                              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                              {course.streak}d
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal border-t border-slate-850 pt-3 font-sans">
                    * Duolingo incluye soporte nativo para tus clases de idiomas y el nuevo curso interactivo de ♟️ <b>Ajedrez</b>. Tu racha se actualiza automáticamente en tu perfil público de Duolingo.
                  </p>
                </div>

                <div className="bg-[#1e293b] border border-[#334155] p-6 rounded-xl space-y-4 shadow-lg flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-base text-slate-200 border-b border-[#334155] pb-3 flex items-center justify-between font-sans">
                      <span className="flex items-center gap-2">
                        <Music className="w-5 h-5 text-indigo-400 animate-bounce" />
                        Estudio Diario de Piano
                      </span>
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-850/40">Diario (20m)</span>
                    </h3>

                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-850 text-center space-y-3">
                      <div className="font-mono text-3xl font-bold text-slate-100 tracking-wider">
                        {Math.floor(pianoTimePracticed / 60).toString().padStart(2, '0')}:{(pianoTimePracticed % 60).toString().padStart(2, '0')}
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {pianoTimerActive ? "Cronómetro activo. ¡A las teclas!" : "Presiona iniciar cuando comiences tu práctica."}
                      </p>
                      
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPianoTimerActive(prev => !prev)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${pianoTimerActive ? 'bg-amber-900 text-amber-200 hover:bg-amber-800' : 'bg-indigo-600 text-indigo-100 hover:bg-indigo-700'}`}
                        >
                          {pianoTimerActive ? "Pausar" : "Iniciar Práctica"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPianoTimerActive(false);
                            if (window.confirm("¿Seguro que deseas reiniciar el cronómetro de piano hoy?")) {
                              setPianoTimePracticed(0);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Reiniciar
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleAddPianoLog} className="space-y-3 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">GUARDAR SESIÓN DE HOY</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Pieza musical en estudio (ej. Para Elisa)"
                          value={pianoSongName}
                          onChange={(e) => setPianoSongName(e.target.value)}
                          className="bg-slate-950 border border-slate-850 text-slate-200 text-xs px-3 py-2 rounded-lg flex-1 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    <p className="text-[10px] font-bold text-slate-500 font-mono">REGISTROS RECIENTES DE PIANO</p>
                    {pianoLogs.map((log: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 rounded border border-slate-850">
                        <span className="font-semibold text-slate-300 font-sans">{log.song}</span>
                        <span className="text-slate-450 font-mono text-[10px]">{log.date} | {log.durationMinutes} min</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1e293b] border border-[#334155] p-6 rounded-xl space-y-4 shadow-lg md:col-span-2 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-base text-slate-200 border-b border-[#334155] pb-3 flex items-center justify-between font-sans">
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-amber-500" />
                        Lectura Diaria de Libros
                      </span>
                      <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">Diario (15p)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <form onSubmit={handleAddReadingLog} className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">REGISTRAR LECTURA DE HOY</p>
                        
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Título del Libro"
                            value={readingTitle}
                            onChange={(e) => setReadingTitle(e.target.value)}
                            className="bg-slate-950 border border-slate-850 text-slate-200 text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:border-amber-500 font-sans"
                          />
                          
                          <input
                            type="number"
                            placeholder="Páginas Leídas Hoy"
                            value={readingPages}
                            onChange={(e) => setReadingPages(e.target.value)}
                            className="bg-slate-950 border border-slate-850 text-slate-200 text-xs px-3 py-2 rounded-lg w-full focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer mt-2"
                        >
                          Guardar Registro (+3 XP por pág.)
                        </button>
                      </form>

                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-2">
                        <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono flex items-center gap-1">
                          <Book className="w-3.5 h-3.5 text-amber-500" />
                          Progreso de Lectura Activo
                        </p>
                        
                        <div className="space-y-2 font-sans">
                          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                            <div className="flex justify-between text-xs font-semibold text-slate-300">
                              <span>Hábitos Atómicos</span>
                              <span className="text-amber-400 font-mono text-[10px]">35 pág leídas</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2">
                              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "45%" }}></div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                            <div className="flex justify-between text-xs font-semibold text-slate-300">
                              <span>Pensar rápido, pensar despacio</span>
                              <span className="text-amber-400 font-mono text-[10px]">12 pág leídas</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2">
                              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "15%" }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 font-mono">REGISTROS RECIENTES DE LECTURA</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[100px] overflow-y-auto pr-1">
                      {readingLogs.map((log: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 rounded border border-slate-850 font-sans">
                          <span className="font-semibold text-slate-300 truncate max-w-[150px]">{log.title}</span>
                          <span className="text-slate-500 font-mono text-[10px]">{log.date} | {log.pagesRead} pág</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}



          {/* VIEW 2: PROGRAMA / TRANSFORMATION SCHEMATIC */}
          {currentTab === 'programa' && (
            <div id="view-programa" className="space-y-6">
              
              {/* General 1-year transformation plan metrics cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Targets Summary card */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-[#8b5cf6] bg-violet-500/10 px-2 py-0.5 rounded">
                      Metas Físicas
                    </span>
                    <h3 className="font-display font-bold text-base text-slate-200 mt-2">
                      Evolución del Peso Corporal
                    </h3>
                  </div>
                  <div>
                    <div className="flex items-end gap-1.5 justify-start">
                      <span className="font-mono text-3xl font-extrabold text-slate-200">53 kg</span>
                      <span className="text-slate-500 font-mono mb-1.5">inicial</span>
                      <ChevronRight className="w-5 h-5 text-[#8b5cf6] mb-1" />
                      <span className="font-mono text-3xl font-extrabold text-emerald-400">65 kg</span>
                      <span className="text-emerald-500/80 font-mono mb-1.5">meta</span>
                    </div>
                    {/* Progress slider visually */}
                    <div className="w-full bg-[#0f172a] h-2.5 rounded-full overflow-hidden mt-3 border border-[#334155]">
                      <div
                        className="bg-gradient-to-r from-[#8b5cf6] to-emerald-400 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((weightLogs[weightLogs.length - 1]?.weightKg - 53) / (65 - 53)) * 100))}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
                      <span>Ganado: {Math.max(0, weightLogs[weightLogs.length - 1]?.weightKg - 53).toFixed(1)} kg</span>
                      <span>Restan: {Math.max(0, 65 - weightLogs[weightLogs.length - 1]?.weightKg).toFixed(1)} kg</span>
                    </div>
                  </div>
                </div>

                {/* Submitting Weight diary logs form */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl md:col-span-2">
                  <h3 className="font-display font-bold text-base text-slate-200 flex items-center gap-1.5">
                    <Weight className="w-4 h-4 text-[#8b5cf6] animate-pulse" />
                    Balanza de Gastón: Registrar Peso Corporal
                  </h3>
                  
                  <form onSubmit={handleLogWeightSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Peso medido (kg):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ej: 54.5"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        className="w-full bg-[#0f172a] border border-[#334155] px-3 py-2 rounded-lg text-slate-200 text-xs font-mono focus:border-orange-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Fecha:
                      </label>
                      <input
                        type="date"
                        value={weightDate}
                        onChange={(e) => setWeightDate(e.target.value)}
                        className="w-full bg-[#0f172a] border border-[#334155] px-3 py-2 rounded-lg text-slate-200 text-xs font-mono focus:border-orange-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        id="btn-submit-weight"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 hover:scale-[1.01] font-sans font-bold text-xs py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Registrar Peso (+40XP)
                      </button>
                    </div>
                  </form>
                </div>

              </div>

              {/* Weight Graph tracker SVG custom-rendered */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-200">
                      📈 Curva de Progreso y Remisión (53kg → 65kg)
                    </h3>
                    <p className="text-xs text-slate-400 font-sans tracking-tight">Registro histórico local vs Curva guía esperable</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <span className="text-slate-400">Tus registros</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-400">Progreso Teórico</span>
                    </div>
                  </div>
                </div>

                {/* Draw SVG representation bar graph/chart line if there is weight log data */}
                <div className="bg-[#0f172a] p-4 border border-[#334155] rounded-xl relative">
                  {weightLogs.length > 0 ? (
                    (() => {
                      // Determine max weight min weight bounds dynamically
                      const allWeights = [...weightLogs.map(w => w.weightKg), 53, 65];
                      const minWeight = 50;
                      const maxWeight = 68;
                      const graphWidth = 600;
                      const graphHeight = 160;

                      // Map weights to dots coordinates
                      const getX = (idx: number, total: number) => {
                        return 40 + (idx / Math.max(1, total - 1)) * (graphWidth - 80);
                      };
                      const getY = (w: number) => {
                        return graphHeight - 20 - ((w - minWeight) / (maxWeight - minWeight)) * (graphHeight - 40);
                      };

                      return (
                        <div className="overflow-x-auto">
                          <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full min-w-[500px] h-44 block">
                            {/* Horizontal grid lines */}
                            {[53, 56, 59, 62, 65].map((gVal) => (
                              <g key={gVal}>
                                <line
                                  x1="30"
                                  y1={getY(gVal)}
                                  x2={graphWidth - 30}
                                  y2={getY(gVal)}
                                  stroke={gVal === 65 ? "#8b5cf6" : "#1e293b"}
                                  strokeDasharray={gVal === 65 ? "3 3" : "0"}
                                  strokeWidth="1"
                                />
                                <text
                                  x="15"
                                  y={getY(gVal) + 4}
                                  fill="#475569"
                                  fontSize="8"
                                  fontFamily="monospace"
                                >
                                  {gVal}kg
                                </text>
                              </g>
                            ))}

                            {/* Ideal linear progress vector toward 65 */}
                            <line
                              x1={getX(0, 10)}
                              y1={getY(53)}
                              x2={getX(9, 10)}
                              y2={getY(65)}
                              stroke="#059669"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />

                            {/* Actual user logged path */}
                            {weightLogs.length > 1 && (
                              <path
                                d={weightLogs.reduce((acc, curr, idx) => {
                                  const x = getX(idx, weightLogs.length);
                                  const y = getY(curr.weightKg);
                                  return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }, "")}
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                            )}

                            {/* Data Points */}
                            {weightLogs.map((log, idx) => {
                              const x = getX(idx, weightLogs.length);
                              const y = getY(log.weightKg);
                              return (
                                <g key={idx}>
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="5"
                                    fill="#0f172a"
                                    stroke="#8b5cf6"
                                    strokeWidth="2.5"
                                  />
                                  <text
                                    x={x}
                                    y={y - 10}
                                    fill="#94a3b8"
                                    fontSize="8"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                  >
                                    {log.weightKg.toFixed(1)}k
                                  </text>
                                  <text
                                    x={x}
                                    y={graphHeight - 4}
                                    fill="#475569"
                                    fontSize="7"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                  >
                                    {log.date.substring(5)}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-slate-500 text-center font-mono py-8">No hay registros suficientes de peso corporal.</p>
                  )}
                </div>
              </div>

              {/* Running Progression Roadmap */}
              <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl">
                <h3 className="font-display font-bold text-base text-slate-200 mb-4">
                  🏃 Cronograma 1 Año de Trote y Running Evolutivo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {RUNNING_PHASES.map((ph, idx) => {
                    const isPassed = activeRunningPhase >= idx;
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all relative overflow-hidden ${isPassed ? 'bg-[#0f172a] border-[#334155] border-t-2 border-t-[#8b5cf6] shadow-md' : 'bg-[#0f172a] bg-opacity-40 border-[#334155]'}`}
                      >
                        {isPassed && (
                          <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}

                        <div>
                          <p className={`font-mono text-[10px] font-bold tracking-wider uppercase ${isPassed ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {ph.months}
                          </p>
                          <h4 className="font-display font-bold text-xs md:text-sm text-slate-200 mt-1">
                            {ph.protocol}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
                            {ph.details}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setActiveRunningPhase(idx);
                            gainXp(10, "Fase seleccionada");
                          }}
                          className={`w-full text-center py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer ${activeRunningPhase === idx ? 'bg-emerald-500 text-slate-950 border-transparent' : 'bg-[#0f172a] hover:bg-slate-900 border-[#334155] text-slate-400'}`}
                        >
                          {activeRunningPhase === idx ? "🔥 ACTIVO" : "Fase activa"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weight logs journal list */}
              <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-xl">
                <h3 className="font-sans font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">
                  Historial de Pesajes Registrados en Clientes
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {weightLogs.map((log, index) => (
                    <div key={index} className="bg-[#0f172a] p-2.5 border border-[#334155] rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-mono text-slate-500">{log.date}</p>
                        <p className="text-sm font-mono font-bold text-slate-200">{log.weightKg.toFixed(1)} kg</p>
                      </div>
                      {index > 0 && (
                        <button
                          onClick={() => handleDeleteWeight(index)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition-colors"
                          title="Eliminar peso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}


          {/* VIEW 3: EJERCICIOS / INTERACTIVE MECHANICAL DIRECTORY */}
          {currentTab === 'ejercicios' && (
            <div id="view-ejercicios" className="space-y-6">
              
              <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-100">
                      🏋️ Biblioteca Interactiva de Ejercicios
                    </h2>
                    <p className="text-xs text-slate-400">Selecciona cualquier levantamiento para ver su biomecánica de forma visual.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* List selector of exercises */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 shadow-xl lg:col-span-1 space-y-4">
                  <h3 className="text-xs text-slate-400 uppercase font-mono tracking-wider border-b border-[#334155] pb-2">
                    Ejercicios del Programa
                  </h3>
                  
                  <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                    {Object.keys(EXERCISE_DETAILS).map((exName) => {
                      const ex = EXERCISE_DETAILS[exName];
                      const isSelected = selectedExercise === exName;
                      return (
                        <button
                          key={exName}
                          onClick={() => setSelectedExercise(exName)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs font-sans transition-all border flex items-center justify-between gap-2 cursor-pointer ${isSelected ? 'bg-[#8b5cf6]/15 border-[#8b5cf6]/40 text-violet-400 font-bold shadow-sm' : 'bg-[#0f172a]/40 border-[#334155] text-slate-400 hover:bg-[#0f172a]/80 hover:text-slate-200'}`}
                        >
                          <span className="truncate font-semibold max-w-[85%]">{exName}</span>
                          <span className="text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#0f172a] text-slate-500">
                            {ex.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Exercise detail showcase & Animator */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Canvas Animation block */}
                  <ExerciseAnimator exerciseName={selectedExercise} />

                  {/* Scientific execution description */}
                  <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl space-y-4">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-200">
                        {selectedExercise}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {EXERCISE_DETAILS[selectedExercise]?.description || "Descripción biomecánica optimizada para ganancia de masa magra de Gastón."}
                      </p>
                    </div>

                    <div className="border-t border-[#334155]/60 pt-4">
                      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                        Consejos de Ejecución del Coach Personal
                      </h4>
                      <ul className="space-y-2">
                        {(EXERCISE_DETAILS[selectedExercise]?.tips || [
                          "Mantén las escápulas retraídas.",
                          "Controla el ritmo excéntrico durante 2-3 segundos.",
                          "Garantiza el rango completo de movimiento."
                        ]).map((tip, index) => (
                          <li key={index} className="flex gap-2.5 items-start text-xs text-slate-300 leading-relaxed font-sans">
                            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded">
                              {index + 1}
                            </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}


          {/* VIEW 4: ACHIEVEMENTS / MOTIVATION HUB */}
          {currentTab === 'logros' && (
            <div id="view-logros" className="space-y-6">
              
              {/* Rewards introduction header */}
              <div className="border border-[#334155] rounded-xl p-5 shadow-xl bg-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
                    Bento de Logros & Recompensas Gastón
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">Completa tus metas, suma puntos de experiencia (XP) y desbloquea medallas de superación.</p>
                </div>
                <div className="text-center bg-[#0f172a] px-4 py-2 border border-[#334155] rounded-lg">
                  <span className="block text-[10px] uppercase font-mono text-slate-500">Puntos Totales</span>
                  <span className="font-mono text-xl font-extrabold text-amber-400 tracking-wide">{xp} XP</span>
                </div>
              </div>

              {/* Grid bento layout for medals and trophies */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Categoría: Weekly Medals */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl space-y-4 col-span-1 md:col-span-3">
                  <h3 className="font-display font-medium text-xs md:text-sm text-slate-400 uppercase tracking-widest border-b border-[#334155] pb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Hitos Semanales y de Periodización
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {processedRewards.map((reward) => (
                      <div
                        key={reward.id}
                        className={`border rounded-2xl p-4 flex gap-3 relative overflow-hidden transition-all ${reward.unlocked ? 'bg-emerald-950 bg-opacity-10 border-emerald-500/30' : 'bg-[#0f172a] bg-opacity-20 border-[#334155]'}`}
                      >
                        {/* Circle Icon Badge */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${reward.unlocked ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md' : 'bg-[#0f172a] border-[#334155] text-slate-500'}`}>
                          {reward.icon === "droplet" ? <Droplet className="w-5 h-5" /> : reward.icon === "banana" ? <Apple className="w-5 h-5" /> : reward.icon === "footprints" ? <Footprints className="w-5 h-5 animate-pulse" /> : reward.icon === "dumbbell" ? <Dumbbell className="w-5 h-5" /> : reward.icon === "calendar" ? <Calendar className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                        </div>

                        <div className="space-y-1 my-auto flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className={`font-sans font-bold text-xs sm:text-xs md:text-sm ${reward.unlocked ? 'text-slate-100' : 'text-slate-400'}`}>
                              {reward.title}
                            </h4>
                            <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/5 px-1 rounded">
                              +{reward.xpValue}XP
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                            {reward.description}
                          </p>

                          {/* Medidas bars details */}
                          <div className="w-full bg-[#0f172a] h-1.5 rounded-full overflow-hidden mt-2 border border-[#334155]/40">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${reward.unlocked ? 'bg-emerald-500' : 'bg-slate-700'}`}
                              style={{ width: `${Math.min(100, (reward.progressVal / reward.progressMax) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1">
                            <span>{reward.category.toUpperCase()}</span>
                            <span>{reward.progressVal}/{reward.progressMax}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MOTIVATION CHARTS & CLOUD HISTORY SECTION */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl space-y-6 col-span-1 md:col-span-3">
                  
                  {/* KPI metrics row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Weekly average rating card */}
                    <div className="bg-[#0f172a] border border-[#334155] p-4 rounded-xl relative overflow-hidden">
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Calificación de Motivación Semanal</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        {motivationStats.weeklyAvg !== null ? (
                          <>
                            <span className="text-3xl font-extrabold font-mono text-[#8b5cf6]">{motivationStats.weeklyAvg.toFixed(1)}</span>
                            <span className="text-xs text-slate-500 font-mono">/ 10</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-slate-500 font-sans">Sin registros suficientes</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-sans">Últimos 7 días • {motivationStats.weeklyCount} entrenamientos</p>
                    </div>

                    {/* Monthly average rating card */}
                    <div className="bg-[#0f172a] border border-[#334155] p-4 rounded-xl relative overflow-hidden">
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Calificación de Motivación Mensual</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        {motivationStats.monthlyAvg !== null ? (
                          <>
                            <span className="text-3xl font-extrabold font-mono text-emerald-400">{motivationStats.monthlyAvg.toFixed(1)}</span>
                            <span className="text-xs text-slate-500 font-mono">/ 10</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-slate-500 font-sans">Sin registros suficientes</span>
                        )}
                      </div>
                      <div className={`mt-1.5 border px-1.5 py-0.5 rounded text-[9px] font-mono font-bold w-fit ${motivationStats.colorClass}`}>
                        {motivationStats.level}
                      </div>
                    </div>

                    {/* Download report box */}
                    <div className="bg-[#0f172a] border border-[#334155] p-4 rounded-xl flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Descargas e Impresión</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-sans">Guarda tu reporte para compartir con tu coach personal mediante WhatsApp o correo.</p>
                      </div>
                      <button
                        onClick={handleDownloadReport}
                        id="btn-download-motivation"
                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-slate-950 font-sans font-bold text-xs rounded-lg hover:from-violet-500 hover:to-indigo-500 cursor-pointer shadow transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar Reporte (.TXT)
                      </button>
                    </div>

                  </div>

                  {/* SVG Custom Motivation Rating Bar Chart */}
                  <div className="bg-[#0f172a] border border-[#334155]/60 rounded-xl p-4.5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-bold text-xs text-slate-205 uppercase tracking-wider">📊 Motivómetro Interactivo de Gastón (Últimos Registros)</h4>
                        <p className="text-[11px] text-slate-450">Fluctuación de tus entrenamientos de pesas, running y motivación al día.</p>
                      </div>
                      <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-20 py-0.5 rounded font-mono font-bold">
                        BBDD Sincronizada
                      </span>
                    </div>

                    {dbLogs.length === 0 ? (
                      <div className="py-8 bg-[#1e293b]/20 border border-dashed border-slate-700 rounded-lg text-center">
                        <p className="text-xs text-slate-500 font-mono">No hay registros suficientes en Firestore en la nube de tu Gmail. ¡Registra hoy tu primer entreno para pintar la gráfica!</p>
                      </div>
                    ) : (
                      (() => {
                        const chartWidth = 700;
                        const chartHeight = 150;
                        const margin = { top: 15, right: 20, bottom: 25, left: 35 };
                        const innerWidth = chartWidth - margin.left - margin.right;
                        const innerHeight = chartHeight - margin.top - margin.bottom;

                        // Display at most the last 12 logs
                        const lastLogs = [...dbLogs].slice(-12).reverse();

                        return (
                          <div className="overflow-x-auto">
                            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[550px] block">
                              {/* Y Axis Guide Lines */}
                              {[2, 4, 6, 8, 10].map((v) => {
                                const y = margin.top + innerHeight - (v / 10) * innerHeight;
                                return (
                                  <g key={v}>
                                    <line
                                      x1={margin.left}
                                      y1={y}
                                      x2={chartWidth - margin.right}
                                      y2={y}
                                      stroke="#1e293b"
                                      strokeWidth="1"
                                      strokeDasharray="2 2"
                                    />
                                    <text
                                      x={margin.left - 10}
                                      y={y + 3}
                                      fill="#64748b"
                                      fontSize="8"
                                      fontFamily="monospace"
                                      textAnchor="end"
                                    >
                                      {v}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Bars rendering */}
                              {lastLogs.map((log, index) => {
                                const barWidth = Math.max(15, innerWidth / (lastLogs.length * 2));
                                const x = margin.left + (index / lastLogs.length) * innerWidth + (innerWidth / (lastLogs.length * 2) - barWidth / 2);
                                const h_pct = log.rating / 10;
                                const barHeight = h_pct * innerHeight;
                                const y = margin.top + innerHeight - barHeight;

                                const isGym = log.dayType === 'gym';
                                const isRun = log.dayType === 'run';
                                const colorGrad = isGym ? '#8b5cf6' : isRun ? '#06b6d4' : '#64748b';

                                return (
                                  <g key={log.id || index} className="group cursor-pointer">
                                    <title>
                                      {`Fecha: ${log.date}\nActividad: ${log.focusName}\nCalificación: ${log.rating}/10\nSincronizado: ${log.syncedToCalendar ? 'Sí' : 'No'}`}
                                    </title>
                                    
                                    {/* background bar highlight hover */}
                                    <rect
                                      x={x - 4}
                                      y={margin.top}
                                      width={barWidth + 8}
                                      height={innerHeight}
                                      fill="#8b5cf6"
                                      fillOpacity="0"
                                      className="hover:fill-opacity-[0.03] transition-all"
                                      rx="3"
                                    />

                                    {/* Main colored pill bar */}
                                    <rect
                                      x={x}
                                      y={y}
                                      width={barWidth}
                                      height={barHeight}
                                      fill={colorGrad}
                                      rx="3"
                                    />

                                    {/* Rating Text Above Bar */}
                                    <text
                                      x={x + barWidth / 2}
                                      y={y - 5}
                                      fill="#e2e8f0"
                                      fontSize="7"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      {log.rating}
                                    </text>

                                    {/* Date Label Below Bar */}
                                    <text
                                      x={x + barWidth / 2}
                                      y={chartHeight - margin.bottom + 12}
                                      fill="#64748b"
                                      fontSize="7"
                                      fontFamily="monospace"
                                      textAnchor="middle"
                                    >
                                      {log.date.substring(5)}
                                    </text>

                                    {/* Small Icon shape representation indicator */}
                                    <circle
                                      cx={x + barWidth / 2}
                                      cy={chartHeight - margin.bottom + 20}
                                      r="2.5"
                                      fill={colorGrad}
                                    />
                                  </g>
                                );
                              })}
                            </svg>
                            
                            {/* Legend */}
                            <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500 justify-center pt-2">
                              <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Pesas / Gym</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-[#06b6d4]" /> Running / Cardio</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-full bg-[#64748b]" /> Descanso</span>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Firestore Database Session History Log Table */}
                  <div className="bg-[#0f172a] border border-[#334155]/60 rounded-xl overflow-hidden shadow-inner">
                    <div className="p-3.5 bg-slate-900 border-b border-[#334155] flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-slate-200">🗄️ Historial de Sesiones Almacenadas en la Nube (Google Firestore)</span>
                      <span className="text-[10px] font-mono text-slate-500">Últimos {dbLogs.length} logs</span>
                    </div>

                    {dbLogs.length === 0 ? (
                      <p className="p-8 text-xs text-slate-500 font-mono text-center">No hay entrenamientos cargados en Firestore en el servidor. Inicia tu primer registro arriba en la pestaña Diario.</p>
                    ) : (
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#0f172a] text-slate-400 font-mono text-[9px] border-b border-[#334155]">
                              <th className="p-3">FECHA</th>
                              <th className="p-3">CATEGORÍA</th>
                              <th className="p-3">ACTIVIDAD / PLAN</th>
                              <th className="p-3">CALIFICACIÓN</th>
                              <th className="p-3">CALENDAR SYNC</th>
                              <th className="p-3 text-center">ACCIONES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#334155]/40">
                            {dbLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-[#1e293b]/30 transition-all font-sans">
                                <td className="p-3 font-mono font-semibold text-slate-200">{log.date}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${log.dayType === 'gym' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : log.dayType === 'run' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-slate-500/10 text-slate-450 border border-slate-500/20'}`}>
                                    {log.dayType === 'gym' ? '🏆 GYM' : log.dayType === 'run' ? '⚡ CARDIO' : '💤 REST'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div>
                                    <p className="font-semibold text-slate-300">{log.focusName}</p>
                                    {log.notes && <p className="text-[10px] text-slate-550 italic mt-0.5">{log.notes}</p>}
                                  </div>
                                </td>
                                <td className="p-3 font-mono font-bold text-amber-400">{log.rating} / 10</td>
                                <td className="p-3">
                                  {log.syncedToCalendar ? (
                                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/25 w-fit">
                                      ✓ SINCRONIZADO
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-slate-500">No habilitado</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={async () => {
                                      if (confirm(`¿Estás seguro que deseas eliminar el registro del ${log.date}? Esta acción borrará el registro de la nube.`)) {
                                        if (log.id) {
                                          await deleteActivityLogDb(log.id);
                                          await fetchDbLogs();
                                        }
                                      }
                                    }}
                                    className="p-1 px-2.5 rounded bg-red-950/20 border border-red-950/50 text-red-400 hover:bg-red-500 hover:text-slate-950 text-[10px] font-bold font-sans transition-all cursor-pointer"
                                  >
                                    Borrar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}


          {/* VIEW 5: PERSONAL AI COACH / GEMINI BOT */}
          {currentTab === 'coach' && (
            <div id="view-coach" className="space-y-6">
              
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 justify-between">
                
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full filter blur-xl pointer-events-none" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-orange-500/30 flex items-center justify-center text-violet-400">
                    <Crown className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-100 flex items-center gap-1.5">
                      Consultas con Coach Gastón (AI)
                    </h2>
                    <p className="text-xs text-slate-400">Asesor de nutrición, biomecánica y motivación con la mente puesta en tus 65 kg.</p>
                  </div>
                </div>
                
                <span className="text-[10px] font-mono bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/30 px-2.5 py-1 rounded">
                  Modelo: Gemini 3.5 Flash
                </span>
              </div>

              {/* Chat panel container */}
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl shadow-xl flex flex-col h-[520px]">
                
                {/* Messages balloon logs list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg) => {
                    const isBot = msg.role === 'assistant';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-start'}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono font-bold border ${isBot ? 'bg-[#0f172a] text-[#8b5cf6] border-[#334155]' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {isBot ? "C" : "G"}
                        </div>

                        {/* Balloon body */}
                        <div className={`rounded-2xl p-3.5 text-xs md:text-sm leading-relaxed ${isBot ? 'bg-[#0f172a] border border-[#334155] text-slate-100 rounded-tl-none' : 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-orange-100 rounded-tr-none'}`}>
                          <p className="font-sans whitespace-pre-wrap">{msg.content}</p>
                          <span className="block text-[9px] text-slate-500 font-mono mt-2 text-right">
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {chatLoading && (
                    <div className="flex gap-3 max-w-[85%] mr-auto items-start">
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono font-bold border bg-[#0f172a] text-[#8b5cf6] border-[#334155] animate-pulse">
                        C
                      </div>
                      <div className="rounded-2xl p-3.5 bg-[#0f172a] border border-[#334155] rounded-tl-none flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-ping" />
                        <span className="text-xs text-slate-400 font-mono">El Coach está pensando en tu próximo set...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Pre-suggested quick prompt chips */}
                <div className="border-t border-[#334155]/60 p-3 bg-[#0f172a]/50 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 my-auto mr-1 block">Sugeridos Gastón:</span>
                  {[
                    "¿Tienen que ser a las 7:00 mis plátanos pre-entreno?",
                    "Me canso mucho al trotar 8 min seguidos, ¿qué hago?",
                    "Explícame los 3g de sal marina y limón",
                    "Dame una arenga de motivación para romper récords hoy de sentadillas"
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSendCoachMessage(undefined, chip)}
                      className="text-[10px] font-sans text-neutral-300 hover:text-[#8b5cf6] hover:border-[#8b5cf6]/60 bg-[#1e293b] border border-[#334155] px-2.5 py-1 rounded-full text-left transition-colors cursor-pointer truncate max-w-[280px]"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Chat send text form */}
                <form onSubmit={handleSendCoachMessage} className="border-t border-[#334155] p-3.5 bg-[#0f172a] flex gap-2">
                  <input
                    type="text"
                    placeholder="Pregúntale al Coach sobre cargas, huevos, repes..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-[#1e293b] border border-[#334155] px-4 py-2.5 rounded-xl text-xs md:text-sm text-slate-100 placeholder-slate-505 focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    id="btn-send-coach-chat"
                    className="p-2.5 px-4 rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-[#0f172a] transition-all font-sans font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    disabled={chatInput.trim().length === 0 || chatLoading}
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Preguntar</span>
                  </button>
                </form>

              </div>

            </div>
          )}

          {/* VIEW 6: WATCH METRICS DASHBOARD */}
          {currentTab === 'watch' && (
            <div id="view-watch" className="space-y-6">
              
              {/* Header Status Card */}
              <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full filter blur-xl pointer-events-none" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-orange-500/30 flex items-center justify-center text-violet-400">
                    <Watch className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-100 flex items-center gap-1.5">
                      Panel de Métricas - OnePlus Watch 2
                    </h2>
                    <p className="text-xs text-slate-400">Telemetría médica y deportiva en tiempo real sincronizada con Wear OS de Google y coprocesador RTOS.</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <span className={`text-[10px] font-mono border px-2.5 py-1 rounded font-bold ${watchConnected ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800' : 'bg-rose-950/40 text-rose-400 border-rose-800'}`}>
                    {watchConnected ? "🔌 VINCULADO" : "❌ DESCONECTADO"}
                  </span>
                  <span className="text-[10px] font-mono bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/30 px-2.5 py-1 rounded">
                    Batería: {watchData.batteryLevel}%
                  </span>
                </div>
              </div>

              {/* BIOMETRICS QUICK GRID (4 Columns) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Heart Rate Card */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Frec. Cardíaca</span>
                    <span className={`w-2 h-2 rounded-full ${watchConnected ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-mono font-extrabold text-slate-100">{watchData.heartRate}</span>
                    <span className="text-xs font-mono text-slate-500">ppm</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2 border-t border-[#334155]/30 pt-1.5">
                    <span>Reposo: 68</span>
                    <span>Máx: 160</span>
                  </div>
                </div>

                {/* SpO2 Card */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Oxígeno SpO2</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">Óptimo</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-mono font-extrabold text-slate-100">{watchData.spO2}%</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2 border-t border-[#334155]/30 pt-1.5">
                    <span>Rango: 96%-99%</span>
                    <span>24h Avg: 98%</span>
                  </div>
                </div>

                {/* Stress Level Card */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Nivel de Estrés</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${watchData.stressLevel < 35 ? 'text-teal-400 bg-teal-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                      {watchData.stressLevel < 35 ? "Bajo" : "Moderado"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-mono font-extrabold text-slate-100">{watchData.stressLevel}</span>
                    <span className="text-xs font-mono text-slate-500">/ 100</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2 border-t border-[#334155]/30 pt-1.5">
                    <span>HRV: 64 ms</span>
                    <span>Estado: Estable</span>
                  </div>
                </div>

                {/* Skin Temperature Card */}
                <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col justify-between shadow-md">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Temp. Cutánea</span>
                    <span className="text-[9px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded font-bold">Estable</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-2xl font-mono font-extrabold text-slate-100 flex items-center">
                      {watchData.skinTempDelta >= 0 ? `+${watchData.skinTempDelta}` : watchData.skinTempDelta} °C
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2 border-t border-[#334155]/30 pt-1.5">
                    <span>Línea base: 36.4°C</span>
                    <span>Desv: Normal</span>
                  </div>
                </div>

              </div>

              {/* Live Graphs Grid: Waveform & Step progress */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* HEART RATE WAVEFORM (Col Span 2) */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl lg:col-span-2 flex flex-col justify-between space-y-4 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-200 flex items-center gap-2">
                        <span className={`text-red-500 ${timerState === 'running' ? 'animate-bounce' : 'animate-pulse'}`}>❤️</span> 
                        Electrocardiograma / Pulso en Vivo
                      </h3>
                      <p className="text-xs text-slate-450 mt-0.5">Gráfico de latidos por minuto (LPM) continuo. Variabilidad detectada por fotopletismografía (PPG).</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-mono font-extrabold text-slate-100">{watchData.heartRate}</span>
                      <span className="text-xs font-mono text-slate-400 ml-1">ppm</span>
                    </div>
                  </div>

                  {/* SVG Real-time Heart Rate Line Graph */}
                  <div className="bg-[#0f172a] p-4 border border-[#334155] rounded-xl">
                    {watchConnected ? (
                      (() => {
                        const width = 500;
                        const height = 120;
                        const padding = 10;
                        const minHr = 50;
                        const maxHr = 170;

                        const points = hrHistory.map((val, idx) => {
                          const x = padding + (idx / Math.max(1, hrHistory.length - 1)) * (width - 2 * padding);
                          const y = height - padding - ((val - minHr) / (maxHr - minHr)) * (height - 2 * padding);
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 block">
                            {[70, 100, 130, 160].map((level) => {
                              const y = height - padding - ((level - minHr) / (maxHr - minHr)) * (height - 2 * padding);
                              return (
                                <g key={level}>
                                  <line x1="0" y1={y} x2={width} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                                  <text x="5" y={y - 2} fill="#475569" fontSize="7" fontFamily="monospace">{level} ppm</text>
                                </g>
                              );
                            })}

                            {hrHistory.length > 1 && (
                              <>
                                <path
                                  d={`M ${points}`}
                                  fill="none"
                                  stroke="#ef4444"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="drop-shadow-[0_0_4px_rgba(239,68,110,0.5)]"
                                />
                                <path
                                  d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
                                  fill="url(#heartGrad2)"
                                  opacity="0.1"
                                />
                              </>
                            )}

                            <defs>
                              <linearGradient id="heartGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                          </svg>
                        );
                      })()
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-500 font-mono">
                        Reloj desconectado. Sincroniza la señal para graficar el pulso cardíaco.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Muestreo: Sensor PPG Dual (BES2700 + Snapdragon W5)</span>
                    <span>Zona: {watchData.heartRate >= 130 ? "🔥 Umbral Anaeróbico" : watchData.heartRate >= 100 ? "⚡ Zona Aeróbica" : "💤 Zona Activa Mínima / Reposo"}</span>
                  </div>
                </div>

                {/* STEP PROGRESS & CALORIES (Col Span 1) */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl flex flex-col justify-between shadow-xl">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base text-slate-200">
                      👣 Actividad Física
                    </h3>
                    <p className="text-xs text-slate-450">Podómetro y estimador de gasto energético diario.</p>
                  </div>

                  {/* Circular Step Progress Ring */}
                  <div className="flex justify-center items-center py-4 relative">
                    {(() => {
                      const radius = 60;
                      const circumference = 2 * Math.PI * radius;
                      const percentage = Math.min(100, (watchData.stepsToday / 10000) * 100);
                      const strokeDashoffset = circumference - (percentage / 100) * circumference;
                      return (
                        <div className="relative flex justify-center items-center">
                          <svg className="w-36 h-36 transform -rotate-90">
                            <circle
                              cx="72"
                              cy="72"
                              r={radius}
                              className="stroke-slate-800"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="72"
                              cy="72"
                              r={radius}
                              className="stroke-sky-400 transition-all duration-500 ease-out"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-2xl font-mono font-extrabold text-slate-100 block">{watchData.stepsToday}</span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Pasos</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#334155]/40 text-center font-mono">
                    <div className="bg-[#0f172a] p-2 rounded-lg border border-[#334155]/30">
                      <p className="text-[9px] text-slate-550 uppercase">Calorías</p>
                      <p className="text-base font-extrabold text-slate-200">{watchData.caloriesBurned} kcal</p>
                    </div>
                    <div className="bg-[#0f172a] p-2 rounded-lg border border-[#334155]/30">
                      <p className="text-[9px] text-slate-550 uppercase">Distancia</p>
                      <p className="text-base font-extrabold text-slate-200">{watchData.distanceKm} km</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Advanced Diagnostics Grid: Sleep & VO2 Max */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SLEEP ARCHITECTURE (Col Span 2) */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl lg:col-span-2 flex flex-col justify-between space-y-4 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-200 flex items-center gap-2">
                        🌙 Calidad de Sueño y Regeneración Anabólica
                      </h3>
                      <p className="text-xs text-slate-450 mt-0.5">La asimilación de proteínas de Gastón ocurre durante el sueño profundo (hormona de crecimiento).</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-mono font-extrabold text-slate-100">{watchData.sleepScore}</span>
                      <span className="text-xs font-mono text-emerald-400 ml-1 font-bold">/100</span>
                    </div>
                  </div>

                  {/* Sleep phases details */}
                  <div className="space-y-4">
                    
                    {/* General sleep KPI row */}
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-[#0f172a] p-2 rounded-lg border border-[#334155]/35">
                        <p className="text-[9px] text-slate-555 uppercase">Duración</p>
                        <p className="text-sm font-extrabold text-slate-200">{watchData.sleepDuration} horas</p>
                      </div>
                      <div className="bg-[#0f172a] p-2 rounded-lg border border-[#334155]/35">
                        <p className="text-[9px] text-slate-555 uppercase">FC Mín Sueño</p>
                        <p className="text-sm font-extrabold text-slate-200">54 ppm</p>
                      </div>
                      <div className="bg-[#0f172a] p-2 rounded-lg border border-[#334155]/35">
                        <p className="text-[9px] text-slate-555 uppercase">Frec. Resp.</p>
                        <p className="text-sm font-extrabold text-slate-200">13.8 / min</p>
                      </div>
                    </div>

                    {/* Stacked bar representing sleep phases */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-mono text-slate-400">
                        <span>Fases del Sueño:</span>
                        <span>Restaurativo (89%)</span>
                      </div>
                      <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex border border-[#334155]">
                        <div style={{ width: '22%' }} className="bg-indigo-600 h-full" title="Sueño Profundo: 22%" />
                        <div style={{ width: '53%' }} className="bg-blue-500 h-full" title="Sueño Ligero: 53%" />
                        <div style={{ width: '18%' }} className="bg-purple-500 h-full" title="Sueño REM: 18%" />
                        <div style={{ width: '7%' }} className="bg-amber-500 h-full" title="Despierto: 7%" />
                      </div>

                      {/* Legend labels grid */}
                      <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono text-center pt-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-2.5 h-1.5 bg-indigo-600 rounded-sm" />
                          <span className="text-slate-400">Profundo (22%)</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-2.5 h-1.5 bg-blue-500 rounded-sm" />
                          <span className="text-slate-400">Ligero (53%)</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-2.5 h-1.5 bg-purple-500 rounded-sm" />
                          <span className="text-slate-400">REM (18%)</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-2.5 h-1.5 bg-amber-500 rounded-sm" />
                          <span className="text-slate-400">Despierto (7%)</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* VO2 MAX & FITNESS LEVEL (Col Span 1) */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl flex flex-col justify-between shadow-xl">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base text-slate-200">
                      🫁 Capacidad Cardio (VO2 Máx)
                    </h3>
                    <p className="text-xs text-slate-450">Índice del consumo máximo de oxígeno.</p>
                  </div>

                  <div className="space-y-4 py-3">
                    <div className="text-center">
                      <span className="text-4xl font-mono font-extrabold text-[#8b5cf6]">{watchData.vo2Max}</span>
                      <span className="text-[10px] font-mono text-slate-555 block uppercase mt-0.5">ml / kg / min</span>
                    </div>

                    <div className="bg-[#0f172a] p-3 rounded-lg border border-[#334155]/30 text-center space-y-1">
                      <p className="text-[11px] text-slate-300 font-sans">
                        Tu edad biológica estimada en base a tu capacidad cardiorrespiratoria es de:
                      </p>
                      <p className="text-base font-bold text-emerald-400 font-sans">
                        🌟 38 Años <span className="text-xs font-normal text-slate-400">(Edad real: 49)</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-[9px] font-mono text-slate-500 text-center border-t border-[#334155]/30 pt-2">
                    Clasificación: Excelente para tu grupo de edad
                  </div>
                </div>

              </div>

              {/* Dual Engine Diagnostics & Configuration Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* DUAL ENGINE INFO PANEL (Col Span 2) */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl space-y-4 md:col-span-2 shadow-xl">
                  <h3 className="font-display font-bold text-base text-slate-200 flex items-center gap-2">
                    <Zap className="w-4.5 h-4.5 text-yellow-400" />
                    Arquitectura de Doble Motor (Dual-Engine)
                  </h3>
                  
                  <div className="text-xs text-slate-300 space-y-3 font-sans leading-relaxed">
                    <p>
                      Tu <strong>OnePlus Watch 2</strong> está operando de forma coordinada e inteligente para extender su batería al máximo sin perder datos:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      <div className={`p-3 rounded-lg border ${watchData.activeEngine.includes('RTOS') ? 'bg-teal-950/20 border-teal-800 text-teal-300' : 'bg-slate-900 border-[#334155] text-slate-400'}`}>
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <span className={`w-2 h-2 rounded-full ${watchData.activeEngine.includes('RTOS') ? 'bg-teal-400 animate-pulse' : 'bg-slate-600'}`} />
                          Coprocesador RTOS (BES2700)
                        </div>
                        <p className="text-[11px] leading-normal opacity-90">
                          Encargado de tareas en segundo plano, sensor de frecuencia cardíaca pasiva, podómetro y la pantalla siempre encendida. Ahorra hasta un 95% de energía.
                        </p>
                      </div>

                      <div className={`p-3 rounded-lg border ${watchData.activeEngine.includes('Wear OS') ? 'bg-amber-950/20 border-amber-800 text-amber-300' : 'bg-slate-900 border-[#334155] text-slate-400'}`}>
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <span className={`w-2 h-2 rounded-full ${watchData.activeEngine.includes('Wear OS') ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                          Procesador Principal (Snapdragon W5)
                        </div>
                        <p className="text-[11px] leading-normal opacity-90">
                          Se activa automáticamente cuando inicias un entrenamiento guiado, abres la interfaz inteligente, envías mensajes o el coach calcula un reporte interactivo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SIMULATION & TELEMETRY ADJUSTMENTS (Col Span 1) */}
                <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-xl space-y-4 shadow-xl">
                  <h3 className="font-display font-bold text-base text-slate-200">
                    🛠️ Panel de Pruebas
                  </h3>
                  
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-450 font-mono">Prueba la interactividad simulando cambios físicos en tu reloj:</p>
                    
                    {/* Add steps */}
                    <button
                      type="button"
                      onClick={() => setWatchData(prev => ({ ...prev, stepsToday: prev.stepsToday + 1000, caloriesBurned: prev.caloriesBurned + 50 }))}
                      disabled={!watchConnected}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      🚶 Simular +1,000 Pasos
                    </button>

                    {/* Reset telemetry values */}
                    <button
                      type="button"
                      onClick={() => setWatchData(prev => ({ ...prev, stepsToday: 0, caloriesBurned: 0, distanceKm: 0 }))}
                      disabled={!watchConnected}
                      className="w-full py-2 bg-[#0f172a] hover:bg-slate-900 text-slate-400 border border-[#334155] text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      🔄 Reiniciar Pasos Hoy
                    </button>

                    {/* Quick sync watch trigger */}
                    <button
                      type="button"
                      onClick={handleSyncWatchWorkout}
                      disabled={!watchConnected || isSyncingWatch}
                      className="w-full py-2 bg-gradient-to-r from-[#8b5cf6]/20 to-amber-500/20 text-violet-400 border border-[#8b5cf6]/35 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      ⚡ Probar Sincronización Completa
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </section>

      </main>

      <footer className="border-t border-[#334155] mt-12 py-6 px-4 bg-[#0f172a]/80 backdrop-blur text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 BetterMe - Planificación Personalizada de Transformación Anual</p>
          <p className="flex items-center gap-1.5">
            Hecho con amor y ciencia anabólica <Heart className="w-3.5 h-3.5 text-red-500" />
          </p>
        </div>
      </footer>

    </div>
  );
}