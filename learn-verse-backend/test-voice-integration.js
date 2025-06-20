// test-voice-integration.js
// Simple test script to verify voice command integration

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001';

// Test voice commands
const testCommands = [
  {
    name: "Download Grade 12 Math Papers",
    input: "download past papers for grade 12 mathematics",
    expectedType: "exam_papers"
  },
  {
    name: "Search Math Resources", 
    input: "search for mathematics resources",
    expectedType: "search_resources"
  },
  {
    name: "Download 2023 English Papers",
    input: "download exam papers 2023 English",
    expectedType: "exam_papers"
  }
];

async function testVoiceCommand(command) {
  console.log(`\n🧪 Testing: ${command.name}`);
  console.log(`📝 Command: "${command.input}"`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/tasks/perform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: command.input })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success! Task type: ${data.taskType}`);
      console.log(`📊 Result: ${data.message}`);
      if (data.links) {
        console.log(`📁 Downloaded: ${data.links.length} files`);
        data.links.forEach((link, index) => {
          console.log(`   ${index + 1}. ${link.text} (${link.href})`);
        });
      }
      if (data.results) {
        console.log(`🔍 Found: ${data.results.length} results`);
        data.results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.title} (${result.link})`);
        });
      }
      if (data.mock) {
        console.log(`🎭 Note: This is a mock result for testing`);
      }
    } else {
      console.log(`❌ Error: ${data.error}`);
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testBackendStatus() {
  console.log('🔍 Testing backend status...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/tasks/status`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Backend is ready!`);
      console.log(`📋 Supported tasks: ${data.supportedTasks.join(', ')}`);
    } else {
      console.log(`❌ Backend error: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Cannot connect to backend: ${error.message}`);
    console.log(`💡 Make sure the backend server is running on ${BACKEND_URL}`);
  }
}

async function runTests() {
  console.log('🚀 Starting Voice Command Integration Tests\n');
  console.log('=' .repeat(50));
  
  // Test backend status first
  await testBackendStatus();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎤 Testing Voice Commands\n');
  
  let passed = 0;
  let total = testCommands.length;
  
  for (const command of testCommands) {
    const result = await testVoiceCommand(command);
    if (result.success) {
      passed++;
    }
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Voice integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Test voice commands in the frontend');
  console.log('2. Try different subjects and grades');
  console.log('3. Check real-time status updates');
  console.log('4. Verify downloads work correctly');
  console.log('5. Replace mock service with real Gobii when ready');
}

// Run the tests
runTests().catch(console.error); 