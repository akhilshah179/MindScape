// Database client. The driver is chosen ONCE at startup (not per request):
//   DB_DRIVER=dynamodb  -> AWS DynamoDB (requires AWS credentials and tables from scripts/create-dynamo-tables.js)
//   DB_DRIVER=local     -> file-backed store at LOCAL_DB_PATH (default backend/local-db.json)
// If DB_DRIVER is unset, DynamoDB is used when AWS credentials are present, otherwise local.
import './env.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { LocalStore } from './localStore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const hasAwsCreds = Boolean(
  (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) || process.env.AWS_PROFILE
)
export const DB_MODE = (process.env.DB_DRIVER || (hasAwsCreds ? 'dynamodb' : 'local')).toLowerCase()

let client
if (DB_MODE === 'dynamodb') {
  const base = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' })
  client = DynamoDBDocumentClient.from(base, { marshallOptions: { removeUndefinedValues: true } })
} else if (DB_MODE === 'local') {
  const file = process.env.LOCAL_DB_PATH
    ? path.resolve(process.env.LOCAL_DB_PATH)
    : path.join(__dirname, '..', 'local-db.json')
  const store = new LocalStore(file)
  // Keep the async DocumentClient interface so controllers are driver-agnostic.
  client = { send: async (command) => store.send(command), store, file }
} else {
  throw new Error(`Unknown DB_DRIVER "${DB_MODE}" (expected "local" or "dynamodb")`)
}

export default client
