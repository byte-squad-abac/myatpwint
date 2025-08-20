/**
 * Test N8N Integration - End-to-End Test
 * This script tests the complete workflow from book publishing to N8N automation
 */

const testBookData = {
  name: "မြန်မာ့ ရှေးဟောင်း သမိုင်း",
  author: "မင်းလွင်", 
  description: "မြန်မာနိုင်ငံ၏ ရှေးဟောင်းသမိုင်းကို အသေးစိတ် ဖော်ပြထားသော စာအုပ်ကောင်း",
  category: "History",
  tags: ["မြန်မာ", "သမိုင်း", "ရှေးဟောင်း", "history"],
  price: 18000,
  edition: "First Edition",
  image_url: "/images/myanmar-history-book.jpg"
};

async function testN8NConnection() {
  console.log('🔗 Testing N8N Connection...');
  
  try {
    const response = await fetch('http://localhost:3000/api/books/publish', {
      method: 'GET'
    });
    
    const result = await response.json();
    console.log('N8N Status:', result);
    
    return result.n8n_status === 'connected';
  } catch (error) {
    console.error('❌ N8N Connection Failed:', error.message);
    return false;
  }
}

async function testBookPublishing() {
  console.log('📚 Testing Book Publishing with N8N Automation...');
  
  try {
    const response = await fetch('http://localhost:3000/api/books/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBookData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Book Published Successfully:', result.book.id);
    console.log('🚀 Marketing Automation:', result.success ? 'Triggered' : 'Failed');
    
    return result;
  } catch (error) {
    console.error('❌ Book Publishing Failed:', error.message);
    return null;
  }
}

async function testN8NWebhookDirectly() {
  console.log('🎯 Testing N8N Webhook Directly...');
  
  try {
    const response = await fetch('http://localhost:5678/webhook/6960fcf1-92c8-4a9c-b54a-7ba6eb296d10', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...testBookData,
        id: 'test-' + Date.now(),
        timestamp: new Date().toISOString(),
        event: 'book_published'
      })
    });
    
    if (!response.ok) {
      throw new Error(`N8N Webhook failed: ${response.status}`);
    }
    
    const result = await response.text();
    console.log('✅ N8N Webhook Response:', result);
    
    return true;
  } catch (error) {
    console.error('❌ N8N Webhook Failed:', error.message);
    return false;
  }
}

async function runCompleteTest() {
  console.log('🧪 Starting Complete N8N Integration Test\n');
  
  // Step 1: Test N8N Connection
  const isN8NConnected = await testN8NConnection();
  if (!isN8NConnected) {
    console.log('\n❌ Test Failed: N8N is not connected');
    console.log('💡 Make sure N8N is running: n8n start');
    return;
  }
  
  console.log('✅ N8N Connection: OK\n');
  
  // Step 2: Test Direct N8N Webhook
  const webhookWorking = await testN8NWebhookDirectly();
  if (!webhookWorking) {
    console.log('\n❌ Test Failed: N8N webhook not responding');
    console.log('💡 Check your N8N workflow is activated');
    return;
  }
  
  console.log('✅ N8N Webhook: OK\n');
  
  // Step 3: Test Complete Book Publishing Flow
  const publishResult = await testBookPublishing();
  if (!publishResult) {
    console.log('\n❌ Test Failed: Book publishing failed');
    console.log('💡 Check your Next.js app is running: npm run dev');
    return;
  }
  
  console.log('✅ Book Publishing: OK\n');
  
  // Summary
  console.log('🎉 Complete N8N Integration Test: PASSED');
  console.log('\n📋 Summary:');
  console.log('- ✅ N8N Connection Working');
  console.log('- ✅ N8N Webhook Responding');
  console.log('- ✅ Book Publishing with Automation');
  console.log('- ✅ Ready for Professor Demo!');
  
  console.log('\n🎓 Next Steps:');
  console.log('1. Run your Next.js app: npm run dev');
  console.log('2. Run N8N: n8n start');
  console.log('3. Visit: http://localhost:3000/publisher/publish-book');
  console.log('4. Test the complete workflow live!');
}

// Run the test if called directly
if (typeof window === 'undefined' && require.main === module) {
  runCompleteTest().catch(console.error);
}

module.exports = {
  testN8NConnection,
  testBookPublishing,
  testN8NWebhookDirectly,
  runCompleteTest
};