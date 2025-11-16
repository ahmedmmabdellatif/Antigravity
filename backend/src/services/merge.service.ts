import {
  PageParseResponse,
  FitnessPlanFields,
  UniversalEnvelope,
  Debug,
  FoodSource,
} from '../types/fitnessPlan';

export class MergeService {
  mergePageResults(pageResults: PageParseResponse[]): UniversalEnvelope {
    console.log(`[Merge Service] Merging ${pageResults.length} page results...`);

    const mergedFitnessPlan: FitnessPlanFields = {};
    const allDebugPages: any[] = [];

    for (const pageResult of pageResults) {
      for (const domain of pageResult.domains) {
        if (domain.type === 'fitness_plan') {
          const fields = domain.fields as FitnessPlanFields;

          // Merge meta (only if not already set)
          if (fields.meta && !mergedFitnessPlan.meta) {
            mergedFitnessPlan.meta = fields.meta;
          }

          // Merge profile (only if not already set)
          if (fields.profile && !mergedFitnessPlan.profile) {
            mergedFitnessPlan.profile = fields.profile;
          }

          // Merge goals (only if not already set)
          if (fields.goals && !mergedFitnessPlan.goals) {
            mergedFitnessPlan.goals = fields.goals;
          }

          // Merge arrays by concatenation
          if (fields.workouts) {
            mergedFitnessPlan.workouts = [
              ...(mergedFitnessPlan.workouts || []),
              ...fields.workouts,
            ];
          }

          if (fields.cardio) {
            mergedFitnessPlan.cardio = [
              ...(mergedFitnessPlan.cardio || []),
              ...fields.cardio,
            ];
          }

          if (fields.meals) {
            mergedFitnessPlan.meals = [
              ...(mergedFitnessPlan.meals || []),
              ...fields.meals,
            ];
          }

          if (fields.supplements) {
            mergedFitnessPlan.supplements = [
              ...(mergedFitnessPlan.supplements || []),
              ...fields.supplements,
            ];
          }

          if (fields.rehab_and_mobility) {
            mergedFitnessPlan.rehab_and_mobility = [
              ...(mergedFitnessPlan.rehab_and_mobility || []),
              ...fields.rehab_and_mobility,
            ];
          }

          if (fields.stretching) {
            mergedFitnessPlan.stretching = [
              ...(mergedFitnessPlan.stretching || []),
              ...fields.stretching,
            ];
          }

          if (fields.warmup) {
            mergedFitnessPlan.warmup = [
              ...(mergedFitnessPlan.warmup || []),
              ...fields.warmup,
            ];
          }

          if (fields.weekly_schedule) {
            mergedFitnessPlan.weekly_schedule = [
              ...(mergedFitnessPlan.weekly_schedule || []),
              ...fields.weekly_schedule,
            ];
          }

          if (fields.education_sections) {
            mergedFitnessPlan.education_sections = [
              ...(mergedFitnessPlan.education_sections || []),
              ...fields.education_sections,
            ];
          }

          if (fields.other_sections) {
            mergedFitnessPlan.other_sections = [
              ...(mergedFitnessPlan.other_sections || []),
              ...fields.other_sections,
            ];
          }

          // Merge food_sources by macro keys
          if (fields.food_sources) {
            if (!mergedFitnessPlan.food_sources) {
              mergedFitnessPlan.food_sources = [];
            }

            for (const newSource of fields.food_sources) {
              const existingSource = mergedFitnessPlan.food_sources.find(
                (s) => s.macro === newSource.macro
              );

              if (existingSource) {
                // Merge items
                existingSource.items = [
                  ...(existingSource.items || []),
                  ...(newSource.items || []),
                ];
                // Merge source pages
                existingSource.source_pages = [
                  ...(existingSource.source_pages || []),
                  ...(newSource.source_pages || []),
                ];
              } else {
                mergedFitnessPlan.food_sources.push(newSource);
              }
            }
          }

          // Merge water_intake (only if not already set)
          if (fields.water_intake && !mergedFitnessPlan.water_intake) {
            mergedFitnessPlan.water_intake = fields.water_intake;
          }

          // Merge assessment (only if not already set)
          if (fields.assessment && !mergedFitnessPlan.assessment) {
            mergedFitnessPlan.assessment = fields.assessment;
          }

          // Merge monitoring_and_tracking (only if not already set)
          if (fields.monitoring_and_tracking && !mergedFitnessPlan.monitoring_and_tracking) {
            mergedFitnessPlan.monitoring_and_tracking = fields.monitoring_and_tracking;
          }

          // Merge behavior_and_psychology (only if not already set)
          if (fields.behavior_and_psychology && !mergedFitnessPlan.behavior_and_psychology) {
            mergedFitnessPlan.behavior_and_psychology = fields.behavior_and_psychology;
          }

          // Merge adaptation_and_periodization (only if not already set)
          if (
            fields.adaptation_and_periodization &&
            !mergedFitnessPlan.adaptation_and_periodization
          ) {
            mergedFitnessPlan.adaptation_and_periodization =
              fields.adaptation_and_periodization;
          }

          // Merge communication_and_support (only if not already set)
          if (fields.communication_and_support && !mergedFitnessPlan.communication_and_support) {
            mergedFitnessPlan.communication_and_support = fields.communication_and_support;
          }

          // Collect debug page summaries
          if (fields.debug && fields.debug.page_summaries) {
            allDebugPages.push(...fields.debug.page_summaries);
          }
        }
      }
    }

    // Add merged debug data
    mergedFitnessPlan.debug = {
      page_summaries: allDebugPages,
    };

    const finalEnvelope: UniversalEnvelope = {
      domains: [
        {
          type: 'fitness_plan',
          confidence: 1.0,
          fields: mergedFitnessPlan,
          missing_fields: [],
        },
      ],
    };

    console.log('[Merge Service] Successfully merged all pages');
    return finalEnvelope;
  }
}

export const mergeService = new MergeService();
