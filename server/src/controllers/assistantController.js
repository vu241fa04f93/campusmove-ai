import { aiAssistantService } from '../services/aiAssistantService.js';

/**
 * @desc Process natural language assistant chat query
 * @route POST /api/assistant/chat or POST /api/agent/chat
 * @access Public / Student / All Authenticated
 */
export const chatHandler = async (req, res, next) => {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message text is required.',
        intent: 'UNKNOWN',
        response: 'Please provide a message to chat with CampusMove AI.',
      });
    }

    const result = await aiAssistantService.handleChat(message, context);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get recommended assistant prompts & sample questions
 * @route GET /api/assistant/suggestions
 */
export const getAssistantSuggestions = async (req, res, next) => {
  try {
    const suggestions = [
      {
        id: 'p1',
        text: 'When will Bus 12 arrive?',
        category: 'ETA',
        intent: 'BUS_ETA',
      },
      {
        id: 'p2',
        text: 'Where is Bus 04 right now?',
        category: 'Tracking',
        intent: 'BUS_LOCATION',
      },
      {
        id: 'p3',
        text: 'Fastest route to Central Library by 9 AM',
        category: 'Trip Planning',
        intent: 'ROUTE_SEARCH',
      },
      {
        id: 'p4',
        text: 'I am at Hostel 3. Find me the fastest bus to college.',
        category: 'Trip Planning',
        intent: 'ROUTE_SEARCH',
      },
      {
        id: 'p5',
        text: 'Bus 04 is delayed. What should I take instead?',
        category: 'Alternatives',
        intent: 'ROUTE_SEARCH',
      },
      {
        id: 'p6',
        text: 'What is the next stop for Bus 12?',
        category: 'Next Stop',
        intent: 'NEXT_STOP',
      },
      {
        id: 'p7',
        text: 'Show delayed buses',
        category: 'Fleet Status',
        intent: 'BUS_STATUS',
      },
      {
        id: 'p8',
        text: 'How crowded is Bus 12?',
        category: 'Predictions',
        intent: 'CROWD_ESTIMATION',
      },
      {
        id: 'p9',
        text: 'Which route is less crowded?',
        category: 'Predictions',
        intent: 'CROWD_ESTIMATION',
      },
    ];

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};
