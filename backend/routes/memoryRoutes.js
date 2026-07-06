import express from 'express'
import { getMemory, setMemory, deleteMemory, clearAllMemory } from '../controllers/memoryController.js'

const router = express.Router()

router.get('/:userId', getMemory)
router.post('/:userId', setMemory)
router.delete('/:userId/clear', clearAllMemory)
router.delete('/:userId/:key', deleteMemory)

export default router
