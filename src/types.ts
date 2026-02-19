export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string; // e.g. "8-12" or "10"
  restSeconds: number;
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g. "Päivä A - Yläkroppa"
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

export interface LoggedSet {
  reps: number;
  weight: number; // kg
}

export interface LoggedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
  notes?: string;
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
}

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
