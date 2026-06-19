const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyD1JcQCcBdCfd46H1CwLgC156h5fzcZDaM');

async function test() {
  try {
    // Test direct API call
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Translate "Hello, how are you?" to Korean. Only return the translated text.');
    console.log('Direct Gemini OK:', result.response.text());

    // Test via local dev server
    const res = await fetch('http://localhost:3000/api/talk/chat-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello, how are you?', targetLocale: 'ko', sourceLocale: 'en', persist: false }),
    });
    const data = await res.json();
    console.log('API route response:', data);
  } catch (e) {
    console.error('ERR:', e.message);
  }
}

test();
