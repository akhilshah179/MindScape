import express from 'express'
import {
    createChat,
    getUserChats,
    getChatMessages,
    sendMessage,
    renameChat,
    deleteChat,
    searchChats
} from '../controllers/chatController.js'

const router = express.Router()

// Chat session management
router.post('/:userId/new', createChat)
router.get('/:userId/list', getUserChats)
router.get('/:userId/search', searchChats)

// Message operations (chatId-based)
router.get('/:chatId/messages', getChatMessages)
router.post('/:chatId/send', sendMessage)

// Chat actions
router.put('/:userId/:chatId/rename', renameChat)
router.delete('/:userId/:chatId', deleteChat)

export default router
