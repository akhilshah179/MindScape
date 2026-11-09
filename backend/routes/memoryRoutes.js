import express from 'express'
import { getMemory, setMemory, deleteMemory, clearAllMemory } from '../controllers/memoryController.js'
import { asyncHandler } from '../middleware/http.js'

const router = express.Router()
router.get('/', asyncHandler(getMemory))
router.post('/', asyncHandler(setMemory))
router.delete('/', asyncHandler(clearAllMemory))
router.delete('/:key', asyncHandler(deleteMemory))
export default router
