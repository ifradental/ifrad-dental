// Quick test script to verify sync push/pull API
const testMutation = {
  clientId: 'test-desktop-01',
  timestamp: Date.now(),
  mutations: [
    {
      collection: 'patients',
      action: 'INSERT',
      documentId: 'p_test_99',
      payload: {
        id: 'p_test_99',
        regNo: 9999,
        name: 'Test Patient Offline',
        age: '32',
        sex: 'M',
        mobile: '01700000000',
        address: 'Dhaka',
      }
    }
  ]
};

console.log('Test payload structured properly:', JSON.stringify(testMutation, null, 2));

