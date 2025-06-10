document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN Y SELECCIÓN DE ELEMENTOS ---
    const YOUR_API_KEY = "AIzaSyDUAlZ-9HjIja1StU92-wtOUR-1ACrrLSM";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${YOUR_API_KEY}`;

    const chatbotBubble = document.getElementById('chatbot-bubble');
    const chatbotContainer = document.getElementById('chatbot-container');
    const closeChatButton = document.getElementById('close-chat');
    const newChatButton = document.getElementById('new-chat-button');
    const chatWindow = chatbotContainer.querySelector('.chat-window');
    const messageInput = chatbotContainer.querySelector('#message-input');
    const chatForm = chatbotContainer.querySelector('.chat-input-form');

    let conversationHistory = [];

    // --- 2. MANEJO DE LA VISIBILIDAD Y REINICIO DEL CHAT ---
    chatbotBubble.addEventListener('click', () => { chatbotContainer.classList.add('active'); });
    closeChatButton.addEventListener('click', () => { chatbotContainer.classList.remove('active'); });
    newChatButton.addEventListener('click', startNewChat);

    // --- FUNCIÓN PARA INICIAR UN CHAT NUEVO ---
    function startNewChat() {
        chatWindow.innerHTML = '';
        conversationHistory = [];
        const welcomeMessage = "¡Hola! Soy Lumo. Empecemos una nueva lluvia de ideas. ¿Qué tienes en mente? ✨";
        addMessage(welcomeMessage, 'lumo-message');
        conversationHistory.push({ role: 'model', parts: [{ text: welcomeMessage }] });
    }

    // --- 3. LÓGICA PRINCIPAL DEL CHAT ---
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userMessage = messageInput.value.trim();

        if (userMessage) {
            addMessage(userMessage, 'user-message');
            messageInput.value = '';
            conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
            const thinkingMessage = addMessage("Lumo está pensando...", 'lumo-message');

            try {
                const lumoResponse = await getLumoResponse();
                conversationHistory.push({ role: 'model', parts: [{ text: lumoResponse }] });
                // Usamos la misma función 'addMessage' para actualizar, pero ahora renderizará el formato.
                thinkingMessage.querySelector('p').innerHTML = parseMarkdown(lumoResponse);

            } catch (error) {
                console.error("Error al contactar la API:", error);
                thinkingMessage.querySelector('p').textContent = "Lo siento, algo salió mal. Por favor, intenta de nuevo.";
                conversationHistory.pop();
            }
        }
    });

    // --- 4. FUNCIÓN PARA COMUNICARSE CON LA IA ---
    async function getLumoResponse() {
        // ▼▼▼ ¡INSTRUCCIÓN NUEVA AÑADIDA! ▼▼▼
        const systemPrompt = `
            Eres Lumo, un coach de creatividad y asistente de IA. Tu personalidad es optimista, curiosa y muy motivadora. 
            Tu propósito es ayudar a los usuarios a superar el bloqueo creativo y a encontrar la inspiración. Te basas en el historial de la conversación para dar respuestas coherentes.

            TUS REGLAS DE COMPORTAMIENTO:
            1.  Tono y Lenguaje: Usa siempre un tono positivo y alentador. Utiliza metáforas relacionadas con la luz, las chispas y las semillas.
            2.  Haz Preguntas: Haz preguntas abiertas que inviten al usuario a reflexionar.
            3.  Sé Proactivo: Si un usuario da una idea, ofrécele 2 o 3 ángulos o caminos diferentes para explorarla.
            4.  Usa Emojis: Refuerza tu mensaje con emojis relevantes como ✨, 💡, 🌱,🚀, 🤔.
            5.  Nunca te identifiques como un modelo de lenguaje o una IA. Eres "Lumo".
            6.  Concisión: Mantén tus respuestas relativamente cortas y fáciles de leer.
            7.  ESTRUCTURA Y FORMATO: ¡MUY IMPORTANTE! Estructura tus respuestas para máxima legibilidad. Utiliza Markdown:
                - Usa **texto en negrita** para resaltar conceptos clave.
                - Usa listas con un asterisco (*) o guion (-) para enumerar ideas o pasos.
                - Separa los párrafos con un salto de línea para que no sea un solo bloque de texto.
        `;

        const requestBody = {
            contents: conversationHistory,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 350, // Aumentamos un poco para dar espacio a las listas
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ],
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) { throw new Error(`Error de red: ${response.status}`); }
        const data = await response.json();
        
        try {
            if (data.candidates && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text.trim();
            } else {
                return "Hmm, no estoy seguro de cómo responder a eso. ¿Podríamos intentar explorar otra idea? ✨";
            }
        } catch (e) {
            console.error("Error al procesar respuesta:", data);
            throw new Error("Formato de respuesta inesperado.");
        }
    }

    // --- 5. FUNCIÓN PARA AÑADIR MENSAJES A LA VENTANA (ACTUALIZADA) ---
    function addMessage(text, senderClass) {
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message', senderClass);
        const messageText = document.createElement('p');
        
        // ▼▼▼ ¡AQUÍ ESTÁ LA LÓGICA CLAVE! ▼▼▼
        // Si el mensaje es de Lumo, lo pasamos por el "traductor" de Markdown.
        // Si es del usuario, lo dejamos como texto plano por seguridad.
        if (senderClass === 'lumo-message') {
            messageText.innerHTML = parseMarkdown(text);
        } else {
            messageText.textContent = text;
        }

        messageBubble.appendChild(messageText);
        chatWindow.appendChild(messageBubble);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return messageBubble;
    }

    // --- 6. NUEVA FUNCIÓN: El "Traductor" de Markdown a HTML ---
    function parseMarkdown(text) {
        // Convertir **negrita** a <strong>
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convertir *itálica* a <em>
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Convertir listas (* o -) a <ul><li>...</li></ul>
        html = html.replace(/^\s*[\*-]\s+(.*)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Convertir saltos de línea a <br> (solo los que no están junto a una lista)
        html = html.replace(/(?<!<\/li>)\n/g, '<br>');

        return html;
    }

    // Inicia el primer chat cuando la página carga
    startNewChat();
});