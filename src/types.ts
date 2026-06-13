export interface UserProfile {
  name: string;
  age: number;
  heightCm: number;
  startingWeightKg: number;
  targetWeightKg: number;
  primaryGoal: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  category: 'empuje' | 'jalon' | 'piernas' | 'brazos' | 'pantorrillas' | 'global';
  description: string;
  tips: string[];
}

export interface DayRoutine {
  focus: string;
  exercises: Exercise[];
}

export interface RoutineSchedule {
  monday: DayRoutine;
  tuesday: DayRoutine;
  thursday: DayRoutine;
  friday: DayRoutine;
}

export interface RunningPhase {
  months: string;
  protocol: string;
  details: string;
}

export interface WeightLog {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface MealItem {
  ingredient: string;
  amount_g?: number | string;
  amount_ml?: number;
  note?: string;
}

export interface HydrationPlan {
  dailyTargetLiters: number;
  additives: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  xpValue: number;
  category: 'weekly' | 'monthly' | 'stage';
  unlockedAt?: string;
  icon: string;
  progressMax: number;
}

export interface LoggedWorkout {
  date: string;
  dayType: 'gym' | 'run' | 'rest';
  focusName: string;
  completedExercises: string[]; // exercise list names
  runCompletedSeconds?: number;
  feeling?: 'excelente' | 'bueno' | 'cansado' | 'pesado';
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
