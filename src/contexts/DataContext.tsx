import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import type {
  Program,
  WorkoutLog,
  WeightEntry,
  MeasurementEntry,
  ExerciseTemplate,
} from '../types';

interface DataContextType {
  programs: Program[];
  workoutLogs: WorkoutLog[];
  weightEntries: WeightEntry[];
  measurements: MeasurementEntry[];
  exerciseTemplates: ExerciseTemplate[];
  loading: boolean;
  saveProgram: (program: Program) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  saveWorkoutLog: (log: WorkoutLog) => Promise<void>;
  deleteWorkoutLog: (id: string) => Promise<void>;
  saveWeightEntry: (entry: WeightEntry) => Promise<void>;
  deleteWeightEntry: (id: string) => Promise<void>;
  saveMeasurement: (entry: MeasurementEntry) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
  saveExerciseTemplate: (template: ExerciseTemplate) => Promise<void>;
  deleteExerciseTemplate: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType>(null!);

export function useData() {
  return useContext(DataContext);
}

const LS_KEYS = {
  programs: 'salimake_programs',
  workoutLogs: 'salimake_workout_logs',
  weightEntries: 'salimake_weight_entries',
  measurements: 'salimake_measurements',
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [exerciseTemplates, setExerciseTemplates] = useState<ExerciseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const migrated = useRef(false);

  // Migrate localStorage data to Firestore on first login
  useEffect(() => {
    if (!user || loading || migrated.current) return;
    migrated.current = true;

    const hasCloud =
      programs.length > 0 ||
      workoutLogs.length > 0 ||
      weightEntries.length > 0 ||
      measurements.length > 0;
    if (hasCloud) return;

    const localPrograms = parseLocal<Program>(LS_KEYS.programs);
    const localLogs = parseLocal<WorkoutLog>(LS_KEYS.workoutLogs);
    const localWeights = parseLocal<WeightEntry>(LS_KEYS.weightEntries);
    const localMeasurements = parseLocal<MeasurementEntry>(LS_KEYS.measurements);

    const hasLocal =
      localPrograms.length > 0 ||
      localLogs.length > 0 ||
      localWeights.length > 0 ||
      localMeasurements.length > 0;

    if (!hasLocal) return;

    const uid = user.uid;
    const batch = writeBatch(db);

    for (const p of localPrograms) {
      batch.set(doc(db, 'users', uid, 'programs', p.id), p);
    }
    for (const l of localLogs) {
      batch.set(doc(db, 'users', uid, 'workoutLogs', l.id), l);
    }
    for (const w of localWeights) {
      batch.set(doc(db, 'users', uid, 'weightEntries', w.id), w);
    }
    for (const m of localMeasurements) {
      batch.set(doc(db, 'users', uid, 'measurements', m.id), m);
    }

    batch.commit().then(() => {
      Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
    });
  }, [user, loading, programs, workoutLogs, weightEntries, measurements]);

  // Subscribe to Firestore collections
  useEffect(() => {
    if (!user) {
      setPrograms([]);
      setWorkoutLogs([]);
      setWeightEntries([]);
      setMeasurements([]);
      setExerciseTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const uid = user.uid;
    let loaded = 0;
    const total = 5;
    const checkDone = () => {
      if (++loaded >= total) setLoading(false);
    };

    const unsub1 = onSnapshot(
      collection(db, 'users', uid, 'programs'),
      (snap) => {
        setPrograms(
          snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Program)
        );
        checkDone();
      }
    );

    const unsub2 = onSnapshot(
      collection(db, 'users', uid, 'workoutLogs'),
      (snap) => {
        setWorkoutLogs(
          snap.docs.map((d) => ({ ...d.data(), id: d.id }) as WorkoutLog)
        );
        checkDone();
      }
    );

    const unsub3 = onSnapshot(
      collection(db, 'users', uid, 'weightEntries'),
      (snap) => {
        setWeightEntries(
          snap.docs.map((d) => ({ ...d.data(), id: d.id }) as WeightEntry)
        );
        checkDone();
      }
    );

    const unsub4 = onSnapshot(
      collection(db, 'users', uid, 'measurements'),
      (snap) => {
        setMeasurements(
          snap.docs.map(
            (d) => ({ ...d.data(), id: d.id }) as MeasurementEntry
          )
        );
        checkDone();
      }
    );

    const unsub5 = onSnapshot(
      collection(db, 'users', uid, 'exerciseTemplates'),
      (snap) => {
        setExerciseTemplates(
          snap.docs.map(
            (d) => ({ ...d.data(), id: d.id }) as ExerciseTemplate
          )
        );
        checkDone();
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [user]);

  const userDoc = (colName: string, docId: string) =>
    doc(db, 'users', user!.uid, colName, docId);

  const saveProgram = async (program: Program) => {
    await setDoc(userDoc('programs', program.id), stripUndefined(program));
  };

  const deleteProgram = async (id: string) => {
    await deleteDoc(userDoc('programs', id));
  };

  const saveWorkoutLog = async (log: WorkoutLog) => {
    await setDoc(userDoc('workoutLogs', log.id), stripUndefined(log));
  };

  const deleteWorkoutLog = async (id: string) => {
    await deleteDoc(userDoc('workoutLogs', id));
  };

  const saveWeightEntry = async (entry: WeightEntry) => {
    await setDoc(userDoc('weightEntries', entry.id), stripUndefined(entry));
  };

  const deleteWeightEntry = async (id: string) => {
    await deleteDoc(userDoc('weightEntries', id));
  };

  const saveMeasurement = async (entry: MeasurementEntry) => {
    await setDoc(userDoc('measurements', entry.id), stripUndefined(entry));
  };

  const deleteMeasurement = async (id: string) => {
    await deleteDoc(userDoc('measurements', id));
  };

  const saveExerciseTemplate = async (template: ExerciseTemplate) => {
    await setDoc(userDoc('exerciseTemplates', template.id), stripUndefined(template));
  };

  const deleteExerciseTemplate = async (id: string) => {
    await deleteDoc(userDoc('exerciseTemplates', id));
  };

  return (
    <DataContext.Provider
      value={{
        programs,
        workoutLogs,
        weightEntries,
        measurements,
        exerciseTemplates,
        loading,
        saveProgram,
        deleteProgram,
        saveWorkoutLog,
        deleteWorkoutLog,
        saveWeightEntry,
        deleteWeightEntry,
        saveMeasurement,
        deleteMeasurement,
        saveExerciseTemplate,
        deleteExerciseTemplate,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

function parseLocal<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Firestore does not accept undefined values. Recursively strip them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = stripUndefined(value);
      }
    }
    return result;
  }
  return obj;
}
