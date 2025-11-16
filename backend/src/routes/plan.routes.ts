import { Router } from 'express';
import { planController } from '../controllers/plan.controller';

const router = Router();

// GET /api/plans - List all plans
router.get('/', (req, res) => {
  planController.listPlans(req, res);
});

// GET /api/plans/:id - Get single plan with full data
router.get('/:id', (req, res) => {
  planController.getPlanById(req, res);
});

// GET /api/plans/:id/debug - Get debug data for a plan
router.get('/:id/debug', (req, res) => {
  planController.getPlanDebug(req, res);
});

export default router;
