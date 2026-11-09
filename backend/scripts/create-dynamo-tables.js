// Creates every DynamoDB table the app needs, from the same key schema the local store uses.
// Usage: AWS credentials in env, then `node scripts/create-dynamo-tables.js`
import '../config/env.js'
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { TABLES } from '../config/tables.js'

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' })
for (const [TableName, { pk, sk }] of Object.entries(TABLES)) {
  try {
    await client.send(new DescribeTableCommand({ TableName }))
    console.log(`exists   ${TableName}`)
    continue
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') throw err
  }
  await client.send(new CreateTableCommand({
    TableName,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: pk, AttributeType: 'S' }, ...(sk ? [{ AttributeName: sk, AttributeType: 'S' }] : [])],
    KeySchema: [{ AttributeName: pk, KeyType: 'HASH' }, ...(sk ? [{ AttributeName: sk, KeyType: 'RANGE' }] : [])]
  }))
  console.log(`created  ${TableName} (${pk}${sk ? ` + ${sk}` : ''})`)
}
