// Universal Fitness Plan Schema - matches frontend types
// This is the contract between Worker, Backend, and Frontend

export interface PageSummary {
  page: number;
  summary: string;
  mapped_to?: string[];
  unmapped_raw_text?: string;
}

export interface Debug {
  page_summaries?: PageSummary[];
}

export interface FitnessMeta {
  plan_name?: string | null;
  coach_name?: string | null;
  duration_weeks?: number | null;
  language?: string | null;
  target_gender?: string | null;
  target_level?: string | null;
}

export interface Profile {
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  body_fat_percent?: number | null;
  injuries?: string[];
  constraints?: string[];
}

export interface Goals {
  primary?: string | null;
  secondary?: string[];
  timeframe_weeks?: number | null;
}

export interface Exercise {
  name: string;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  media_url?: string | null;
  source_pages?: number[];
}

export interface Workout {
  name: string;
  day_label?: string | null;
  phase?: string | null;
  source_pages?: number[];
  exercises?: Exercise[];
}

export interface CardioWeekPlan {
  week: number;
  days_per_week?: number | null;
  duration_minutes?: number | null;
  intensity?: string | null;
  notes?: string | null;
}

export interface CardioSession {
  name: string;
  intensity?: string | null;
  duration_minutes?: number | null;
  frequency_per_week?: number | null;
  per_week_plan?: CardioWeekPlan[];
  notes?: string | null;
  source_pages?: number[];
}

export interface MealItem {
  name: string;
  quantity?: string | null;
  calories_kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fats_g?: number | null;
  variant_label?: string | null;
}

export interface Meal {
  name: string;
  time?: string | null;
  selection_rule?: string | null;
  items?: MealItem[];
  notes?: string | null;
  source_pages?: number[];
}

export interface WaterIntake {
  recommended_liters_per_day?: number | null;
  notes?: string | null;
  source_pages?: number[];
}

export interface Supplement {
  name: string;
  dosage?: string | null;
  timing?: string | null;
  notes?: string | null;
  source_pages?: number[];
}

export interface RehabExercise {
  name: string;
  sets?: number | null;
  reps?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
}

export interface RehabMobility {
  name: string;
  target_area?: string | null;
  frequency_per_week?: number | null;
  exercises?: RehabExercise[];
  notes?: string | null;
  source_pages?: number[];
}

export interface Stretching {
  name: string;
  body_part?: string | null;
  sets?: number | null;
  duration_seconds?: number | null;
  frequency_per_week?: number | null;
  notes?: string | null;
  source_pages?: number[];
}

export interface WarmupExercise {
  name: string;
  category?: string | null;
  sets?: number | null;
  reps?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
  media_url?: string | null;
}

export interface Warmup {
  name: string;
  type?: string | null;
  selection_rule?: string | null;
  exercises?: WarmupExercise[];
  notes?: string | null;
  source_pages?: number[];
}

export interface WeeklyScheduleDay {
  day_number: number;
  day_label?: string | null;
  workout_name?: string | null;
  is_rest_day?: boolean | null;
  notes?: string | null;
}

export interface EducationSection {
  title: string;
  category?: string | null;
  content: string;
  bullet_points?: string[];
  source_pages?: number[];
}

export interface FoodSourceItem {
  name: string;
  notes?: string | null;
}

export interface FoodSource {
  macro: string;
  items?: FoodSourceItem[];
  source_pages?: number[];
}

export interface Demographic {
  age?: number | null;
  gender?: string | null;
  location?: string | null;
  lifestyle_summary?: string | null;
}

export interface HealthStatus {
  medical_history?: string[] | null;
  current_medications?: string[] | null;
  chronic_conditions?: string[] | null;
  pain_points?: string[] | null;
}

export interface FitnessStatus {
  current_level?: string | null;
  training_history?: string | null;
  cardio_fitness_summary?: string | null;
  strength_baseline_summary?: string | null;
}

export interface Psychology {
  motivation_summary?: string | null;
  adherence_history?: string | null;
  body_image_notes?: string | null;
}

export interface Lifestyle {
  work_schedule?: string | null;
  sleep_summary?: string | null;
  stress_summary?: string | null;
  available_training_time?: string | null;
  equipment_context?: string | null;
}

export interface Assessment {
  demographic?: Demographic | null;
  health_status?: HealthStatus | null;
  fitness_status?: FitnessStatus | null;
  psychology?: Psychology | null;
  lifestyle?: Lifestyle | null;
}

export interface MonitoringAndTracking {
  performance_metrics?: string | null;
  body_comp_tracking?: string | null;
  recovery_metrics?: string | null;
  health_markers?: string | null;
  lifestyle_tracking?: string | null;
  tech_integration?: string | null;
}

export interface BehaviorAndPsychology {
  habits_and_routines?: string | null;
  motivation_strategies?: string | null;
  adherence_strategies?: string | null;
  mental_health_notes?: string | null;
  education_and_empowerment?: string | null;
}

export interface AdaptationAndPeriodization {
  progress_review_protocol?: string | null;
  adjustment_rules?: string | null;
  periodization_phases?: string | null;
  troubleshooting_protocols?: string | null;
  long_term_sustainability?: string | null;
}

export interface CommunicationAndSupport {
  check_in_frequency?: string | null;
  communication_channels?: string | null;
  emergency_protocols?: string | null;
  support_structure?: string | null;
}

export interface OtherSection {
  title: string;
  content: string;
  source_pages?: number[];
}

export interface FitnessPlanFields {
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
  warmup?: Warmup[] | null;
  weekly_schedule?: WeeklyScheduleDay[] | null;
  education_sections?: EducationSection[] | null;
  food_sources?: FoodSource[] | null;
  assessment?: Assessment | null;
  monitoring_and_tracking?: MonitoringAndTracking | null;
  behavior_and_psychology?: BehaviorAndPsychology | null;
  adaptation_and_periodization?: AdaptationAndPeriodization | null;
  communication_and_support?: CommunicationAndSupport | null;
  other_sections?: OtherSection[] | null;
  debug?: Debug | null;
}

export interface GenericDocumentFields {
  summary: string;
  debug?: Debug;
}

export interface SourceCoverage {
  pages_covered?: number[];
  pages_with_no_mapped_content?: number[];
}

export interface Domain {
  type: string;
  confidence: number;
  fields: FitnessPlanFields | GenericDocumentFields | Record<string, unknown>;
  missing_fields?: string[];
  source_coverage?: SourceCoverage;
}

export interface UniversalEnvelope {
  domains: Domain[];
}

// Per-page request to worker
export interface PageParseRequest {
  page_number: number;
  image_base64: string | null;
  text: string;
}

// Per-page response from worker
export interface PageParseResponse {
  domains: Domain[];
}
