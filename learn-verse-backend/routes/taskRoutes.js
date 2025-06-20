import express from 'express';
import { parseTaskCommand } from '../services/taskParser.js';
import { performTask } from '../services/gobiiService.js';

const router = express.Router();

// POST /api/tasks/perform
router.post('/perform', async (req, res) => {
  try {
    const { input, taskType, grade, subject, year, website, customQuery } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'No input provided' });
    }

    // If voice command provided detailed parameters, use them directly
    let params;
    if (taskType && (grade || subject || year || website)) {
      params = {
        website: website || 'https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx',
        grade,
        subject,
        year: year || new Date().getFullYear().toString(),
        taskType,
        customQuery
      };
    } else {
      // Fall back to parsing the input text
      params = parseTaskCommand(input);
    }

    if (!params.website) {
      return res.status(400).json({ error: 'Could not determine website from input.' });
    }

    console.log('Performing task with params:', params);
    const result = await performTask(params);
    
    // Add metadata for voice assistant
    result.voiceCommand = input;
    result.taskType = params.taskType;
    result.timestamp = new Date().toISOString();
    
    res.json(result);
  } catch (err) {
    console.error('Task execution error:', err);
    res.status(500).json({ 
      error: err.message,
      voiceCommand: req.body.input,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/tasks/status - for checking task status
router.get('/status', (req, res) => {
  res.json({ 
    status: 'ready',
    supportedTasks: ['exam_papers', 'search_resources'],
    timestamp: new Date().toISOString()
  });
});

export { router as taskRoutes };



 