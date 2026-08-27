import express from 'express';
import { chatHandler, getAssistantSuggestions } from '../controllers/assistantController.js';

const router = express.Router();

router.post('/chat', chatHandler);
router.get('/suggestions', getAssistantSuggestions);

export default router;
