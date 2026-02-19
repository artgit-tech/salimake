// === Program / Template types ===

export interface AlternativeExercise {
  id: string;
  name: string;
  equipment?: string;
  sets?: number;
  reps?: string;
  restSeconds?: number;
}

export interface Exercise {
  id: string;
  name: string;
  equipment?: string; // e.g. "rintaprässi", "tasapenkki", "smith-kone"
  sets: number;
  reps: string; // e.g. "8-12" or "10"
  restSeconds: number;
  notes?: string;
  links?: string[]; // e.g. YouTube tutorial URLs
  alternatives?: AlternativeExercise[];
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g. "Päivä A - Rintapäivä"
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  days: WorkoutDay[];
  createdAt: string;
  updatedAt: string;
}

// === Exercise template library ===

export interface ExerciseTemplate {
  id: string;
  name: string;
  equipment?: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  links?: string[];
  alternatives?: AlternativeExercise[];
  category?: string; // e.g. "Rinta", "Selkä", "Jalat", "Olkapää"
}

// === Workout logging types ===

export interface LoggedSet {
  reps: number;
  weight: number; // kg
}

export interface LoggedExercise {
  exerciseId: string;
  exerciseName: string;
  equipment?: string;
  sets: LoggedSet[];
  notes?: string;
  orderIndex: number;
  wasSubstitute?: boolean;
  originalExerciseId?: string;
}

export interface WorkoutLog {
  id: string;
  programId: string;
  dayId: string;
  dayName: string;
  date: string;
  exercises: LoggedExercise[];
  durationMinutes?: number;
  notes?: string;
  skipped?: boolean;
}

// === Body tracking types ===

export interface WeightEntry {
  id: string;
  date: string;
  weight: number; // kg
  notes?: string;
}

export interface MeasurementEntry {
  id: string;
  date: string;
  chest?: number; // cm
  waist?: number;
  hips?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
  shoulders?: number;
  neck?: number;
  notes?: string;
}
