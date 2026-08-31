import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  AddUserExerciseRequest,
  CreateExerciseRequest,
  Exercise,
  UserExercise,
} from '@exercise-tracker/shared-types';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

/** Thin HTTP wrapper over `/exercises` and `/users/me/exercises`. */
@Injectable({ providedIn: 'root' })
export class ExerciseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  search(query: string): Promise<Exercise[]> {
    return firstValueFrom(
      this.http.get<Exercise[]>(`${this.baseUrl}/exercises`, { params: { query } }),
    );
  }

  listMine(): Promise<Exercise[]> {
    return firstValueFrom(this.http.get<Exercise[]>(`${this.baseUrl}/exercises/mine`));
  }

  create(request: CreateExerciseRequest): Promise<Exercise> {
    return firstValueFrom(this.http.post<Exercise>(`${this.baseUrl}/exercises`, request));
  }

  listUserExercises(): Promise<UserExercise[]> {
    return firstValueFrom(this.http.get<UserExercise[]>(`${this.baseUrl}/users/me/exercises`));
  }

  addUserExercise(request: AddUserExerciseRequest): Promise<UserExercise> {
    return firstValueFrom(this.http.post<UserExercise>(`${this.baseUrl}/users/me/exercises`, request));
  }

  removeUserExercise(exerciseId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/users/me/exercises/${exerciseId}`));
  }
}
