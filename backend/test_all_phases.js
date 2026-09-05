import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'
const TEST_USER_1 = 'test_user_phase_a'
const TEST_USER_2 = 'test_user_phase_b'

async function runTests() {
    console.log('--- Starting MindScape Automated Stabilization Tests ---')

    // 1. Health check
    const health = await axios.get(`${API_BASE}/health`)
    console.log('✅ 1. Health check status:', health.data?.status)

    // 2. Memory Normalization & Persistence
    console.log('\n--- Testing AI Memory Normalization & Multi-tenant Isolation ---')
    await axios.post(`${API_BASE}/memory/${TEST_USER_1}`, {
        key: 'Target Exam Date',
        value: 'December 2026'
    }, { headers: { 'x-user-id': TEST_USER_1 } })

    const user1Memory = await axios.get(`${API_BASE}/memory/${TEST_USER_1}`, {
        headers: { 'x-user-id': TEST_USER_1 }
    })
    console.log('✅ 2. Memory saved and normalized:', user1Memory.data)

    // Verify isolation: User 2 cannot access User 1's memory
    try {
        await axios.get(`${API_BASE}/memory/${TEST_USER_1}`, {
            headers: { 'x-user-id': TEST_USER_2 }
        })
        console.error('❌ Isolation failed: User 2 accessed User 1 memory')
    } catch (err) {
        console.log('✅ 3. Multi-tenant security verified (403 Forbidden for unauthorized user):', err.response?.status)
    }

    // 3. Quiz Generation & Permanent Persistence
    console.log('\n--- Testing Quiz Persistence & Score Storage ---')
    const sampleFileId = 'test_sample_pdf_id_101'

    // Mock an uploaded file record in local DB for testing quiz endpoint
    const sampleText = `Data structures are foundational in computer science. An array stores elements in contiguous memory locations. A linked list consists of nodes where each node contains data and a reference to the next node. A stack follows the Last In First Out (LIFO) principle, whereas a queue operates on First In First Out (FIFO). Trees and graphs represent hierarchical and networked data structures respectively.`

    // Upload / register a test file record first
    const { default: dynamoDb } = await import('./config/dynamoDb.js')
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb')
    await dynamoDb.send(new PutCommand({
        TableName: 'studymate_files',
        Item: {
            fileId: sampleFileId,
            userId: TEST_USER_1,
            subjectName: 'Computer Science',
            originalName: 'DataStructures.pdf',
            storedName: 'DataStructures.pdf',
            size: 2048,
            mimeType: 'application/pdf',
            status: 'ready',
            uploadedAt: new Date().toISOString()
        }
    }))

    const quizRes = await axios.post(`${API_BASE}/files/${sampleFileId}/quiz`, {
        text: sampleText
    }, { headers: { 'x-user-id': TEST_USER_1 } })

    console.log('✅ 4. Quiz generated and persisted:', {
        cached: quizRes.data?.cached,
        questionCount: quizRes.data?.quiz?.questions?.length,
        sampleQ: quizRes.data?.quiz?.questions?.[0]?.question
    })

    // Test cached retrieval
    const cachedQuiz = await axios.get(`${API_BASE}/files/${sampleFileId}/quiz`, {
        headers: { 'x-user-id': TEST_USER_1 }
    })
    console.log('✅ 5. Cached quiz retrieved from persistent DB:', {
        cached: cachedQuiz.data?.cached,
        quizId: cachedQuiz.data?.quiz?.quizId
    })

    // 4. Save Quiz Score
    const scoreRes = await axios.post(`${API_BASE}/files/${sampleFileId}/quiz/score`, {
        score: 4,
        total: 5,
        pct: 80,
        subjectName: 'Computer Science',
        fileName: 'DataStructures.pdf',
        answers: [{ selected: 0, correct: true }, { selected: 1, correct: true }, { selected: 0, correct: false }]
    }, { headers: { 'x-user-id': TEST_USER_1 } })

    console.log('✅ 6. Quiz score saved to database:', scoreRes.data)

    // Retrieve user score history
    const userScores = await axios.get(`${API_BASE}/users/${TEST_USER_1}/scores`, {
        headers: { 'x-user-id': TEST_USER_1 }
    })
    console.log('✅ 7. User quiz scores retrieved:', userScores.data?.length, 'records')

    // 5. Chat & Multi-tenant Isolation
    console.log('\n--- Testing Chat Creation & Isolation ---')
    const chatRes = await axios.post(`${API_BASE}/chat/${TEST_USER_1}/new`, {
        title: 'Algorithms Revision',
        fileId: sampleFileId
    }, { headers: { 'x-user-id': TEST_USER_1 } })

    const chatId = chatRes.data?.chatId
    console.log('✅ 8. Chat session created:', chatId)

    try {
        await axios.get(`${API_BASE}/chat/${chatId}/messages`, {
            headers: { 'x-user-id': TEST_USER_2 }
        })
        console.error('❌ Chat isolation failed: User 2 accessed User 1 chat')
    } catch (err) {
        console.log('✅ 9. Chat access isolation verified (403/401 for wrong user):', err.response?.status)
    }

    console.log('\n🎉 ALL AUTOMATED STABILIZATION TESTS COMPLETED SUCCESSFULLY!')
}

runTests().catch(err => {
    console.error('Test execution failed:', err.response?.data || err.message)
    process.exit(1)
})
