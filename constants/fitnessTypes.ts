export type FitnessMeta = {
  plan_name?: string;
  coach_name?: string;
  duration_weeks?: number;
  level?: string;
  days_per_week?: number;
  split?: string;
  equipment?: string;
};

export type Exercise = {
  name: string;
  sets?: number | string;
  reps?: string;
  rest_seconds?: number;
  tempo?: string;
  notes?: string;
  media_url?: string;
  source_pages?: number[];
};

export type Workout = {
  name: string;
  day_label?: string;
  exercises: Exercise[];
  source_pages?: number[];
};

export type CardioSession = {
  type: string;
  duration_minutes?: number;
  intensity?: string;
  frequency?: string;
  protocol?: string;
  notes?: string;
};

export type Meal = {
  name: string;
  time?: string;
  foods?: string[];
  macros?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
};

export type DailyMealPlan = {
  day: string;
  meals: Meal[];
  daily_totals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type Supplement = {
  name: string;
  dosage: string;
  timing?: string;
  notes?: string;
};

export type RehabMobility = {
  category: string;
  exercises: string[];
};

export type Stretching = {
  post_workout?: string[];
  evening_routine?: string[];
  pre_workout?: string[];
};

export type ProgressTracking = {
  weekly_measurements?: string[];
  monthly_assessments?: string[];
  check_in_frequency?: string;
  required_photos?: string[];
};

export type ProfileGoals = {
  primary_goal?: string;
  secondary_goals?: string[];
  target_weight?: string;
  target_body_fat?: string;
  timeline?: string;
  age?: number;
  height?: string;
  current_weight?: string;
  current_body_fat?: string;
  injuries?: string;
  constraints?: string;
};

export type RuleWarning = {
  type: "rule" | "warning";
  text: string;
};

export type WaterIntake = {
  daily_goal_liters?: number;
  notes?: string;
};

export type FitnessPlan = {
  meta: FitnessMeta;
  profile_goals?: ProfileGoals;
  workouts: Workout[];
  cardio?: CardioSession[];
  rehab_mobility?: RehabMobility[];
  stretching?: Stretching;
  meals?: DailyMealPlan[];
  water_intake?: WaterIntake;
  supplements?: Supplement[];
  progress_tracking?: ProgressTracking;
  rules_warnings?: RuleWarning[];
};
