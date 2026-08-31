export interface CreateDayRequest {
  logDate: string;
}

export interface DayExerciseSummary {
  exerciseId: number;
  exerciseName: string;
  accumulatedReps: number;
}

export interface DaySession {
  id: string;
  logDate: string;
  exercises: DayExerciseSummary[];
  createdAt: string;
}

export interface DayRangeQuery {
  from: string;
  to: string;
}
