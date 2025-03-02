// Access DOM elements
const sendButton = document.getElementById('send-button');
const voiceButton = document.getElementById('voice-button');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const stopVoiceImage = document.getElementById('stop-voice-image');

// Global state variables
let isVoiceActive = false;
let voices = [];
let conversationHistory = [];

// Function to send a user message and get bot response
async function sendMessage() {
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    addMessage(userMessage, true); // Display user message
    userInput.value = ''; // Clear input field

    try {
        const botResponse = await generateResponse(userMessage); // Get bot response
        const cleanedResponse = cleanMarkdown(botResponse); // Clean response
        addMessage(cleanedResponse, false); // Display bot response

        // Update conversation history
        conversationHistory.push({ role: 'user', text: userMessage });
        conversationHistory.push({ role: 'bot', text: cleanedResponse });

        // Speak the bot response if voice is active
        if (isVoiceActive) speakResponse(cleanedResponse);
    } catch (error) {
        console.error('Error:', error);
        addMessage('Sorry, I encountered an error. Please try again.', false);
    }
}

// Function to handle voice recognition
function startVoiceRecognition() {
    window.speechSynthesis.cancel(); // Stop ongoing speech synthesis
    addMessage('Listening...', false);

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.start();

    recognition.onresult = async (event) => {
        const spokenText = event.results[0][0].transcript;
        userInput.value = spokenText; // Populate input field
        removeLastBotMessage(); // Remove "Listening..." message
        await sendMessage(); // Send the voice input
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        removeLastBotMessage();
        addMessage('Voice input failed. Please try again.', false);
    };
}

// Function to generate bot response with healthcare filtering
async function generateResponse(prompt) {
    const restrictedKeywords = ['diagnose', 'symptoms', 'prescription', 'treatment', 'medicine'];
    if (restrictedKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
        return "I'm here to provide general information. For personalized medical advice, please consult a licensed healthcare professional.";
    }

    const API_KEY = 'AIzaSyA7wZtC-BqoEEY4aQfNusNfcyC_DOtveng';
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

    const context = conversationHistory
        .map(item => `${item.role === 'user' ? 'User' : 'Bot'}: ${item.text}`)
        .join('\n') + `\nUser: ${prompt}\nBot:`;

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: context }] }]
        }),
    });

    if (!response.ok) throw new Error('Failed to generate response');

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Function to clean markdown content
function cleanMarkdown(text) {
    return text.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// Function to display messages in the chat
function addMessage(message, isUser) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', isUser ? 'user-message' : 'bot-message');

    const profileImage = document.createElement('img');
    profileImage.src = isUser ? 'user.jpg' : 'bot.jpg';
    profileImage.alt = isUser ? 'User' : 'Bot';

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.textContent = message;

    messageElement.appendChild(profileImage);
    messageElement.appendChild(messageContent);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to remove the last bot message (used for "Listening...")
function removeLastBotMessage() {
    const lastMessage = chatMessages.lastChild;
    if (lastMessage && lastMessage.classList.contains('bot-message')) {
        chatMessages.removeChild(lastMessage);
    }
}

// Function to convert text to speech
function speakResponse(text) {
    window.speechSynthesis.cancel();
    if (voices.length === 0) voices = window.speechSynthesis.getVoices();

    let lang = 'en-IN';
    if (userInput.value.match(/[ा-ृे-ो]/)) lang = userInput.value.match(/[अ-ज्ञं]/) ? 'hi-IN' : 'mr-IN';

    const selectedVoice = voices.find(voice => voice.lang === lang) || voices.find(voice => voice.lang === 'en-IN');
    const speech = new SpeechSynthesisUtterance(text);

    if (selectedVoice) speech.voice = selectedVoice;
    speech.onstart = () => updateVoiceState(true);
    speech.onend = () => updateVoiceState(false);

    window.speechSynthesis.speak(speech);
}

// Function to update the "Stop Voice" button's state
function updateVoiceState(active) {
    isVoiceActive = active;
    stopVoiceImage.classList.toggle('active', active);
    stopVoiceImage.classList.toggle('inactive', !active);
    saveVoiceState();
}

// Function to toggle voice state on button click
function toggleVoice() {
    if (isVoiceActive) {
        window.speechSynthesis.cancel();
        updateVoiceState(false);
    } else {
        const lastBotResponse = chatMessages.querySelector('.bot-message:last-child .message-content')?.textContent;
        if (lastBotResponse) speakResponse(lastBotResponse);
    }
}

// Function to save voice state
function saveVoiceState() {
    localStorage.setItem('isVoiceActive', JSON.stringify(isVoiceActive));
}

// Function to load voice state
function loadVoiceState() {
    const savedState = JSON.parse(localStorage.getItem('isVoiceActive'));
    if (savedState !== null) updateVoiceState(savedState);
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
voiceButton.addEventListener('click', startVoiceRecognition);
stopVoiceImage.addEventListener('click', toggleVoice);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

window.speechSynthesis.onvoiceschanged = () => (voices = window.speechSynthesis.getVoices());
window.onload = loadVoiceState;
