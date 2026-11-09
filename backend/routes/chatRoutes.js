import express from 'express'
import { createChat, getUserChats, getChatMessages, sendMessage, updateChat, deleteChat, searchChats } from '../controllers/chatController.js'
import { asyncHandler } from '../middleware/http.js'

const router = express.Router()
router.get('/', asyncHandler(getUserChats))
router.post('/', asyncHandler(createChat))
router.get('/search', asyncHandler(searchChats))
router.get('/:chatId/messages', asyncHandler(getChatMessages))
router.post('/:chatId/messages', asyncHandler(sendMessage))
router.patch('/:chatId', asyncHandler(updateChat))
router.delete('/:chatId', asyncHandler(deleteChat))
export default router
