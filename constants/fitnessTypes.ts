// ============================================
// NEW WORKER CONTRACT - ALL FIELDS OPTIONAL
// ============================================

// Meta information about the fitness plan
export type FitnessMeta = {
  plan_name?: string | null;
  coach_name?: string | null;
  duration_weeks?: number | null;
  language?: string | null;
  target_gender?: string | null;
  target_level?: string | null;
};

// Profile information
export type Profile = {
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  body_fat_percent?: number | null;
  injuries?: string[];
  constraints?: string[];
};

// Goals
export type Goals = {
  primary?: string | null;
  secondary?: string[];
  timeframe_weeks?: number | null;
};

// Exercise within a workout
export type Exercise = {
  name: string;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  media_url?: string | null;
  source_pages?: number[];
};

// Workout session
export type Workout = {
  name: string;
  day_label?: string | null;
  phase?: string | null;  // NEW
  source_pages?: number[];
  exercises?: Exercise[];
};

// Cardio week plan (NEW)
export type CardioWeekPlan = {
  week: number;
  days_per_week?: number | null;
  duration_minutes?: number | null;
  intensity?: string | null;
  notes?: string | null;
};

// Cardio session
export type CardioSession = {
  name: string;
  intensity?: string | null;
  duration_minutes?: number | null;
  frequency_per_week?: number | null;
  per_week_plan?: CardioWeekPlan[];  // NEW – week-by-week progression
  notes?: string | null;
  source_pages?: number[];
};

// Meal item
export type MealItem = {
  name: string;
  quantity?: string | null;
  calories_kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fats_g?: number | null;
  variant_label?: string | null;  // e.g. "Option 1", "Option 2"
};

// Meal
export type Meal = {
  name: string;
  time?: string | null;
  selection_rule?: string | null;  // e.g. "Choose one option"
  items?: MealItem[];
  notes?: string | null;
  source_pages?: number[];
};

// Water intake
export type WaterIntake = {
  recommended_liters_per_day?: number | null;
  notes?: string | null;
  source_pages?: number[];
};

// Supplement
export type Supplement = {
  name: string;
  dosage?: string | null;
  timing?: string | null;
  notes?: string | null;
  source_pages?: number[];
};

// Rehab/Mobility Exercise
export type RehabExercise = {
  name: string;
  sets?: number | null;
  reps?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
};

// Rehab and Mobility
export type RehabMobility = {
  name: string;
  target_area?: string | null;
  frequency_per_week?: number | null;
  exercises?: RehabExercise[];
  notes?: string | null;
  source_pages?: number[];
};

// Stretching
export type Stretching = {
  name: string;
  body_part?: string | null;
  sets?: number | null;
  duration_seconds?: number | null;
  frequency_per_week?: number | null;
  notes?: string | null;
  source_pages?: number[];
};

// Warmup Exercise (NEW)
export type WarmupExercise = {
  name: string;
  category?: string | null;  // "activation" | "mobility" | etc.
  sets?: number | null;
  reps?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
  media_url?: string | null;
};

// Warmup (NEW)
export type Warmup = {
  name: string;
  type?: string | null;  // "general" | "upper_body" | "lower_body" | "specific"
  selection_rule?: string | null;  // e.g. "Pick 3–4 exercises from this list"
  exercises?: WarmupExercise[];
  notes?: string | null;
  source_pages?: number[];
};

// Weekly Schedule (NEW)
export type WeeklyScheduleDay = {
  day_number: number;  // 1–7
  day_label?: string | null;  // "Day 1", "Monday"
  workout_name?: string | null;
  is_rest_day?: boolean | null;
  notes?: string | null;
};

// Education Section (NEW)
export type EducationSection = {
  title: string;
  category?: string | null;  // "warmup_guidelines", "tempo_guidelines", etc.
  content: string;
  bullet_points?: string[];
  source_pages?: number[];
};

// Food Source Item (NEW)
export type FoodSourceItem = {
  name: string;
  notes?: string | null;
};

// Food Sources (NEW)
export type FoodSource = {
  macro: string;  // "protein", "carb", "fat", "fruits", "vegetables", "salad"
  items?: FoodSourceItem[];
  source_pages?: number[];
};

// Assessment sections (NEW)
export type Demographic = {
  age?: number | null;
  gender?: string | null;
  location?: string | null;
  lifestyle_summary?: string | null;
};

export type HealthStatus = {
  medical_history?: string[] | null;
  current_medications?: string[] | null;
  chronic_conditions?: string[] | null;
  pain_points?: string[] | null;
};

export type FitnessStatus = {
  current_level?: string | null;
  training_history?: string | null;
  cardio_fitness_summary?: string | null;
  strength_baseline_summary?: string | null;
};

export type Psychology = {
  motivation_summary?: string | null;
  adherence_history?: string | null;
  body_image_notes?: string | null;
};

export type Lifestyle = {
  work_schedule?: string | null;
  sleep_summary?: string | null;
  stress_summary?: string | null;
  available_training_time?: string | null;
  equipment_context?: string | null;
};

export type Assessment = {
  demographic?: Demographic | null;
  health_status?: HealthStatus | null;
  fitness_status?: FitnessStatus | null;
  psychology?: Psychology | null;
  lifestyle?: Lifestyle | null;
};

// Monitoring and Tracking (NEW)
export type MonitoringAndTracking = {
  performance_metrics?: string | null;
  body_comp_tracking?: string | null;
  recovery_metrics?: string | null;
  health_markers?: string | null;
  lifestyle_tracking?: string | null;
  tech_integration?: string | null;
};

// Behavior and Psychology (NEW)
export type BehaviorAndPsychology = {
  habits_and_routines?: string | null;
  motivation_strategies?: string | null;
  adherence_strategies?: string | null;
  mental_health_notes?: string | null;
  education_and_empowerment?: string | null;
};

// Adaptation and Periodization (NEW)
export type AdaptationAndPeriodization = {
  progress_review_protocol?: string | null;
  adjustment_rules?: string | null;
  periodization_phases?: string | null;
  troubleshooting_protocols?: string | null;
  long_term_sustainability?: string | null;
};

// Communication and Support (NEW)
export type CommunicationAndSupport = {
  check_in_frequency?: string | null;
  communication_channels?: string | null;
  emergency_protocols?: string | null;
  support_structure?: string | null;
};

// Other Sections (NEW)
export type OtherSection = {
  title: string;
  content: string;
  source_pages?: number[];
};

// Debug Page Summary (NEW)
export type PageSummary = {
  page: number;  // 1-based
  summary: string;
  mapped_to?: string[];  // JSON paths like "workouts[0].exercises[2]"
  unmapped_raw_text?: string;
};

// Debug (NEW)
export type Debug = {
  page_summaries?: PageSummary[];
};

// Main Fitness Plan Fields
export type FitnessPlanFields = {
  meta?: FitnessMeta | null;
  profile?: Profile | null;
  goals?: Goals | null;
  workouts?: Workout[] | null;
  cardio?: CardioSession[] | null;
  meals?: Meal[] | null;
  water_intake?: WaterIntake | null;
  supplements?: Supplement[] | null;
  rehab_and_mobility?: RehabMobility[] | null;
  stretching?: Stretching[] | null;
  warmup?: Warmup[] | null;  // NEW
  weekly_schedule?: WeeklyScheduleDay[] | null;  // NEW
  education_sections?: EducationSection[] | null;  // NEW
  food_sources?: FoodSource[] | null;  // NEW
  assessment?: Assessment | null;  // NEW
  monitoring_and_tracking?: MonitoringAndTracking | null;  // NEW
  behavior_and_psychology?: BehaviorAndPsychology | null;  // NEW
  adaptation_and_periodization?: AdaptationAndPeriodization | null;  // NEW
  communication_and_support?: CommunicationAndSupport | null;  // NEW
  other_sections?: OtherSection[] | null;  // NEW
  debug?: Debug | null;  // NEW
};

// Generic Document Fields (for non-fitness documents)
export type GenericDocumentFields = {
  summary: string;
  debug?: Debug;
};

// Domain type from worker
export type Domain = {
  type: string;  // "fitness_plan" | "generic_document" | ...
  confidence: number;
  fields: FitnessPlanFields | GenericDocumentFields | Record<string, unknown>;
  missing_fields?: string[];
  source_coverage?: {
    pages_covered?: number[];
    pages_with_no_mapped_content?: number[];
  };
};

// Universal Envelope (top-level response)
export type UniversalEnvelope = {
  domains: Domain[];
};
