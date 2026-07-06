import dynamoDb from './config/dynamoDb.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

async function test() {
  try {
    console.log("Testing DynamoDB...");
    await dynamoDb.send(new PutCommand({
      TableName: 'studymate_submissions',
      Item: {
        submissionId: "test-id",
        userId: "test-user",
        problemId: "two-sum",
        code: "test",
        timestamp: new Date().toISOString()
      }
    }));
    console.log("DynamoDB write successful!");
  } catch (err) {
    console.error("DynamoDB Error:");
    console.error(err);
  }
}

test();
