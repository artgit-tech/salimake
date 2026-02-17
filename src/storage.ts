import type { Program, WorkoutLog, WeightEntry, MeasurementEntry } from './types';

const KEYS = {
  programs: 'salimake_programs',
  workoutLogs: 'salimake_workout_logs',
  weightEntries: 'salimake_weight_entries',
  measurements: 'salimake_measurements',
};

function load<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Programs
export function getPrograms(): Program[] {
  return load<Program>(KEYS.programs);
}

export function savePrograms(programs: Program[]): void {
  save(KEYS.programs, programs);
}

export function getProgram(id: string): Program | undefined {
  return getPrograms().find((p) => p.id === id);
}

export function saveProgram(program: Program): void {
  const programs = getPrograms();
  const idx = programs.findIndex((p) => p.id === program.id);
  if (idx >= 0) {
    programs[idx] = program;
  } else {
    programs.push(program);
  }
  savePrograms(programs);
}

export function deleteProgram(id: string): void {
  savePrograms(getPrograms().filter((p) => p.id !== id));
}

// Workout logs
export function getWorkoutLogs(): WorkoutLog[] {
  return load<WorkoutLog>(KEYS.workoutLogs);
}

export function saveWorkoutLog(log: WorkoutLog): void {
  const logs = getWorkoutLogs();
  const idx = logs.findIndex((l) => l.id === log.id);
  if (idx >= 0) {
    logs[idx] = log;
  } else {
    logs.push(log);
  }
  save(KEYS.workoutLogs, logs);
}

export function deleteWorkoutLog(id: string): void {
  save(
    KEYS.workoutLogs,
    getWorkoutLogs().filter((l) => l.id !== id)
  );
}

// Weight entries
export function getWeightEntries(): WeightEntry[] {
  return load<WeightEntry>(KEYS.weightEntries);
}

export function saveWeightEntry(entry: WeightEntry): void {
  const entries = getWeightEntries();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  save(KEYS.weightEntries, entries);
}

export function deleteWeightEntry(id: string): void {
  save(
    KEYS.weightEntries,
    getWeightEntries().filter((e) => e.id !== id)
  );
}

// Measurement entries
export function getMeasurements(): MeasurementEntry[] {
  return load<MeasurementEntry>(KEYS.measurements);
}

export function saveMeasurement(entry: MeasurementEntry): void {
  const entries = getMeasurements();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  save(KEYS.measurements, entries);
}

export function deleteMeasurement(id: string): void {
  save(
    KEYS.measurements,
    getMeasurements().filter((e) => e.id !== id)
  );
}
