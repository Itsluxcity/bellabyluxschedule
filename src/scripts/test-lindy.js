// Test script for Lindy integration
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const LINDY_API_URL = `${BASE_URL}/api/lindy`;

async function testLindyIntegration() {
  try {
    console.log('=== TESTING LINDY INTEGRATION ===');
    
    // Generate a unique thread ID
    const threadId = uuidv4();
    console.log('Generated threadId:', threadId);
    
    // Create a test message
    const message = {
      message: 'Hello, this is a test message',
      threadId: threadId
    };
    
    console.log('Sending message to Lindy:', message);
    
    // Send the message to Lindy
    const response = await fetch(LINDY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`API error: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    console.log('=== TEST COMPLETED ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLindyIntegration(); 