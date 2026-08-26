import { planTrip } from '../services/tripPlannerService.js';

// @desc Plan a campus trip with multi-factor ranking, live GPS ETAs, safety buffers, and delay handling
// @route POST /api/trips/plan
export const planTripHandler = async (req, res, next) => {
  try {
    const { origin, destination, requiredArrivalTime, preference, currentTime } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Both origin and destination stops are required.',
      });
    }

    const result = await planTrip({
      origin,
      destination,
      requiredArrivalTime,
      preference: preference || 'fastest',
      currentTime,
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc Get popular campus trip suggestions
// @route GET /api/trips/suggestions
export const getTripSuggestions = async (req, res, next) => {
  try {
    const suggestions = [
      {
        id: 'sug-1',
        title: 'Morning Class Rush',
        origin: 'Hostel 3 (Men’s Residence)',
        destination: 'Block C (Computer Science)',
        targetTime: '09:00',
        icon: 'GraduationCap',
        description: 'Direct North-South Express corridor to CS & AI Labs',
      },
      {
        id: 'sug-2',
        title: 'Central Library Study Session',
        origin: 'Hostel 7 (Women’s Residence)',
        destination: 'Central Library & Knowledge Hub',
        targetTime: '10:00',
        icon: 'BookOpen',
        description: 'Hostel Loop connection to main campus library',
      },
      {
        id: 'sug-3',
        title: 'Campus Gate Departure',
        origin: 'Administrative Building',
        destination: 'Main Campus Gate (Gate 1)',
        targetTime: '17:30',
        icon: 'Navigation',
        description: 'Express return line to City Transit Terminal',
      },
      {
        id: 'sug-4',
        title: 'Evening Sports & Fitness',
        origin: 'Block C (Computer Science)',
        destination: 'Sports Complex & Student Arena',
        targetTime: '18:00',
        icon: 'Activity',
        description: 'Direct connector to Athletic tracks and Arena',
      },
    ];

    res.status(200).json({ success: true, count: suggestions.length, data: suggestions });
  } catch (error) {
    next(error);
  }
};
