// Key schema for every table. This is the single source of truth used by both
// the local JSON store and `scripts/create-dynamo-tables.js` for real DynamoDB.
export const TABLES = {
  studymate_auth_users: { pk: 'email' },
  studymate_users: { pk: 'userId' },
  studymate_chats: { pk: 'userId', sk: 'chatId' },
  studymate_chat_messages: { pk: 'chatId', sk: 'messageId' },
  studymate_ai_memory: { pk: 'userId', sk: 'memoryKey' },
  studymate_files: { pk: 'userId', sk: 'fileId' },
  studymate_summaries: { pk: 'userId', sk: 'fileId' },
  studymate_quizzes: { pk: 'userId', sk: 'fileId' },
  studymate_scores: { pk: 'userId', sk: 'scoreId' },
  studymate_submissions: { pk: 'userId', sk: 'submissionId' },
  studymate_gamification: { pk: 'userId' },
  studymate_contests: { pk: 'contestId' },
  studymate_meetings: { pk: 'roomId' },
}

export function getSchema(tableName) {
  const schema = TABLES[tableName]
  if (!schema) throw new Error(`Unknown table: ${tableName}`)
  return schema
}
