import express from 'express';
import { generateToken, createRoom } from '../controllers/meetingController.js';

const router = express.Router();

router.get('/token', generateToken);
router.post('/create-room', createRoom);

export default router;
