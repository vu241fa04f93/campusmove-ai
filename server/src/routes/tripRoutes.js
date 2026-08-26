import express from 'express';
import { planTripHandler, getTripSuggestions } from '../controllers/tripController.js';

const router = express.Router();

router.post('/plan', planTripHandler);
router.get('/suggestions', getTripSuggestions);

export default router;
