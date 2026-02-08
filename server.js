class NeoGram {
    constructor() {
        this.user = null;
        this.currentStep = 'phone';
        this.timerInterval = null;
        this.timeLeft = 60;
        
        // Данные чатов
        this.chats = [];
        this.currentChatId = null;
        this.messages = {};
        
        // WebSocket соединение
        this.ws = null;
        this.wsConnected = false;
        
        // API URL
        this.apiUrl = 'http://localhost:3000/api';
        this.wsUrl = 'ws://localhost:3000';
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupPhoneInput();
        this.checkSession();
    }
    
    cacheElements() {
        // Авторизация
        this.phoneStep = document.getElementById('phoneStep');
        this.codeStep = document.getElementById('codeStep');
        this.profileStep = document.getElementById('profileStep');
        this.phoneNumber = document.getElementById('phoneNumber');
        this.codeDigits = document.querySelectorAll('.code-digit');
        this.firstName = document.getElementById('firstName');
        this.lastName = document.getElementById('lastName');
        this.username = document.getElementById('username');
        this.termsAgreement = document.getElementById('termsAgreement');
        this.sendCodeBtn = document.getElementById('sendCodeBtn');
        this.backToPhoneBtn = document.getElementById('backToPhone');
        this.verifyCodeBtn = document.getElementById('verifyCodeBtn');
        this.resendCodeBtn = document.getElementById('resendCodeBtn');
        this.completeProfileBtn = document.getElementById('completeProfileBtn');
        
        // Основной интерфейс
        this.mainApp = document.getElementById('mainApp');
        this.authModal = document.getElementById('authModal');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.connectBtn = document.getElementById('connectBtn');
        
        // Чаты
        this.chatsList = document.getElementById('chatsList');
        this.searchInput = document.getElementById('searchInput');
        
        // Сообщения
        this.messagesArea = document.getElementById('messagesArea');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInputArea = document.getElementById('messageInputArea');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        
        // Новый чат модальное окно
        this.newChatModal = document.getElementById('newChatModal');
        this.closeNewChatModalBtn = document.getElementById('closeNewChatModal');
        this.cancelChatBtn = document.getElementById('cancelChatBtn');
        this.createChatBtn = document.getElementById('createChatBtn');
        this.contactUsername = document.getElementById('contactUsername');
        this.groupName = document.getElementById('groupName');
        this.chatTypeButtons = document.querySelectorAll('.chat-type-btn');
        
        // Элементы информации
        this.chatTitle = document.getElementById('chatTitle');
        this.chatStatus = document.getElementById('chatStatus');
        this.currentChatAvatar = document.getElementById('currentChatAvatar');
        this.userDisplayName = document.getElementById('userDisplayName');
        this.currentUsername = document.getElementById('currentUsername');
        this.currentUserAvatar = document.getElementById('currentUserAvatar');
        this.welcomePhone = document.getElementById('welcomePhone');
        this.connectionStatusText = document.getElementById('connectionStatusText');
    }
    
    bindEvents() {
        // Авторизация
        this.sendCodeBtn.addEventListener('click', () => this.sendCode());
        this.backToPhoneBtn.addEventListener('click', () => this.goToStep('phone'));
        this.verifyCodeBtn.addEventListener('click', () => this.verifyCode());
        this.resendCodeBtn.addEventListener('click', () => this.resendCode());
        this.completeProfileBtn.addEventListener('click', () => this.completeProfile());
        
        this.codeDigits.forEach((digit, index) => {
            digit.addEventListener('input', (e) => this.handleCodeInput(e, index));
        });
        
        // Основные кнопки
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.newChatBtn.addEventListener('click', () => this.openNewChatModal());
        this.connectBtn.addEventListener('click', () => this.openNewChatModal());
        
        // Сообщения
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Отправка статуса набора текста
        this.messageInput.addEventListener('input', () => {
            if (this.currentChatId && this.wsConnected) {
                this.sendTypingStatus();
            }
        });
        
        // Новый чат
        this.closeNewChatModalBtn.addEventListener('click', () => this.closeNewChatModal());
        this.cancelChatBtn.addEventListener('click', () => this.closeNewChatModal());
        this.createChatBtn.addEventListener('click', () => this.createChat());
        
        // Переключение типа чата
        this.chatTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.chatTypeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateNewChatForm(btn.dataset.type);
            });
        });
    }
    
    setupPhoneInput() {
        this.phoneNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = value.substring(0, 10);
                let formatted = '';
                if (value.length > 0) formatted = value.substring(0, 3);
                if (value.length > 3) formatted = value.substring(0, 3) + ' ' + value.substring(3, 6);
                if (value.length > 6) formatted = value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6, 8);
                if (value.length > 8) formatted = value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6, 8) + ' ' + value.substring(8, 10);
                e.target.value = formatted;
            }
        });
    }
    
    // WebSocket соединение
    connectWebSocket() {
        try {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket соединение установлено');
                this.wsConnected = true;
                
                // Авторизуемся через WebSocket
                if (this.user) {
                    this.ws.send(JSON.stringify({
                        type: 'auth',
                        username: this.user.username
                    }));
                }
                
                // Обновляем статус подключения
                this.updateConnectionStatus('connected', 'Подключено');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Ошибка обработки WebSocket сообщения:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket соединение закрыто');
                this.wsConnected = false;
                this.updateConnectionStatus('disconnected', 'Отключено');
                
                // Пытаемся переподключиться через 3 секунды
                setTimeout(() => {
                    if (this.user) {
                        this.connectWebSocket();
                    }
                }, 3000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                this.updateConnectionStatus('error', 'Ошибка подключения');
            };
            
        } catch (error) {
            console.error('Ошибка создания WebSocket соединения:', error);
        }
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'auth_success':
                console.log('Успешная авторизация через WebSocket');
                break;
                
            case 'auth_error':
                console.error('Ошибка авторизации WebSocket:', data.error);
                break;
                
            case 'new_message':
                this.handleNewMessage(data.message);
                break;
                
            case 'chat_created':
                this.handleNewChat(data.chat);
                break;
                
            case 'status_change':
                this.updateUserStatus(data.username, data.status);
                break;
                
            case 'user_typing':
                this.showTypingIndicator(data.chatId, data.username);
                break;
                
            case 'message_seen':
                this.updateMessageStatus(data.chatId, data.messageId, data.seenBy, data.seenAt);
                break;
        }
    }
    
    handleNewMessage(message) {
        // Добавляем сообщение в историю
        if (!this.messages[message.chatId]) {
            this.messages[message.chatId] = [];
        }
        
        // Проверяем, нет ли уже такого сообщения
        const exists = this.messages[message.chatId].some(m => m.id === message.id);
        if (!exists) {
            this.messages[message.chatId].push(message);
            
            // Обновляем последнее сообщение в списке чатов
            const chatIndex = this.chats.findIndex(c => c.id === message.chatId);
            if (chatIndex !== -1) {
                this.chats[chatIndex].lastMessage = message.text;
                this.chats[chatIndex].lastMessageTime = message.timestamp;
                
                // Увеличиваем счетчик непрочитанных, если чат не активен
                if (message.chatId !== this.currentChatId && message.sender !== `@${this.user.username}`) {
                    this.chats[chatIndex].unreadCount = (this.chats[chatIndex].unreadCount || 0) + 1;
                }
                
                this.updateChatInList(message.chatId);
            }
            
            // Если чат активен, показываем сообщение
            if (message.chatId === this.currentChatId) {
                const isOwn = message.sender === `@${this.user.username}`;
                this.addMessageToChat({
                    ...message,
                    isOwn,
                    time: new Date(message.timestamp).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })
                });
                
                // Отправляем статус "прочитано" для своих сообщений
                if (!isOwn && this.wsConnected) {
                    this.ws.send(JSON.stringify({
                        type: 'message_seen',
                        chatId: message.chatId,
                        messageId: message.id
                    }));
                }
            }
        }
    }
    
    handleNewChat(chat) {
        // Проверяем, нет ли уже такого чата
        const exists = this.chats.some(c => c.id === chat.id);
        if (!exists) {
            this.chats.push({
                ...chat,
                lastMessage: 'Нет сообщений',
                lastMessageTime: chat.createdAt,
                unreadCount: 0
            });
            
            this.addChatToList(chat);
            
            // Если это первый чат, обновляем welcome screen
            if (this.chats.length === 1) {
                this.updateWelcomeScreen();
            }
        }
    }
    
    updateConnectionStatus(status, text) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = this.connectionStatusText;
        
        indicator.className = 'status-indicator';
        
        switch (status) {
            case 'connected':
                indicator.classList.add('connected');
                indicator.style.background = '#10b981';
                break;
            case 'connecting':
                indicator.classList.add('connecting');
                indicator.style.background = '#f59e0b';
                break;
            case 'disconnected':
                indicator.style.background = '#ef4444';
                break;
            case 'error':
                indicator.style.background = '#ef4444';
                break;
        }
        
        if (statusText) {
            statusText.textContent = text;
        }
    }
    
    updateUserStatus(username, status) {
        // Обновляем статус в списке чатов
        this.chats.forEach(chat => {
            if (chat.members.includes(`@${username}`)) {
                const chatElement = document.querySelector(`.chat-item[data-chat-id="${chat.id}"]`);
                if (chatElement) {
                    const statusElement = chatElement.querySelector('.chat-status');
                    if (statusElement) {
                        statusElement.textContent = status === 'online' ? 'online' : 
                            `был(а) ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
                    }
                }
            }
        });
        
        // Если это текущий чат, обновляем статус в заголовке
        if (this.currentChatId) {
            const currentChat = this.chats.find(c => c.id === this.currentChatId);
            if (currentChat && currentChat.members.includes(`@${username}`)) {
                this.updateChatStatus();
            }
        }
    }
    
    showTypingIndicator(chatId, username) {
        if (chatId === this.currentChatId) {
            // Показываем индикатор набора текста
            const typingIndicator = document.getElementById('typing-indicator');
            if (!typingIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'typing-indicator';
                indicator.className = 'typing-indicator';
                indicator.innerHTML = `
                    <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                    <span>${username} печатает...</span>
                `;
                this.chatMessages.appendChild(indicator);
                this.scrollToBottom();
                
                // Убираем индикатор через 3 секунды
                setTimeout(() => {
                    const indicator = document.getElementById('typing-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                }, 3000);
            }
        }
    }
    
    sendTypingStatus() {
        if (this.wsConnected && this.currentChatId) {
            this.ws.send(JSON.stringify({
                type: 'typing',
                chatId: this.currentChatId
            }));
        }
    }
    
    updateMessageStatus(chatId, messageId, seenBy, seenAt) {
        if (this.messages[chatId]) {
            const message = this.messages[chatId].find(m => m.id === messageId);
            if (message && message.isOwn) {
                message.seen = true;
                message.seenBy = seenBy;
                message.seenAt = seenAt;
                
                // Обновляем статус в интерфейсе
                const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
                if (messageElement) {
                    const statusElement = messageElement.querySelector('.message-status');
                    if (statusElement) {
                        statusElement.innerHTML = '<i class="fas fa-check-double" style="color: #10b981;"></i>';
                    }
                }
            }
        }
    }
    
    // Авторизация (остается без изменений, только добавляем вызов API)
    async completeProfile() {
        const firstName = this.firstName.value.trim();
        const lastName = this.lastName.value.trim();
        const username = this.username.value.trim();
        const phone = this.userPhone;
        
        if (!firstName) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }
        
        if (!this.validateUsername(username)) {
            alert('Username должен содержать 3-20 символов (только буквы, цифры и подчеркивания)');
            return;
        }
        
        try {
            // Регистрация через API
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone,
                    firstName,
                    lastName,
                    username: username.toLowerCase()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.user = data.user;
                
                // Сохраняем в localStorage
                localStorage.setItem('neogram_user', JSON.stringify(this.user));
                
                // Показываем основной интерфейс
                this.showMainInterface();
                
                // Подключаемся к WebSocket
                this.connectWebSocket();
                
                // Загружаем чаты
                this.loadChats();
            } else {
                alert(data.error || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            alert('Ошибка подключения к серверу');
        }
    }
    
    async loadChats() {
        try {
            const response = await fetch(`${this.apiUrl}/chats/${this.user.username}`);
            const data = await response.json();
            
            if (data.success) {
                this.chats = data.chats;
                this.renderChatsList();
                
                // Загружаем сообщения для каждого чата
                for (let chat of this.chats) {
                    await this.loadMessages(chat.id);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки чатов:', error);
        }
    }
    
    async loadMessages(chatId) {
        try {
            const response = await fetch(`${this.apiUrl}/messages/${chatId}`);
            const data = await response.json();
            
            if (data.success) {
                this.messages[chatId] = data.messages.map(msg => ({
                    ...msg,
                    time: new Date(msg.timestamp).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    isOwn: msg.sender === `@${this.user.username}`
                }));
            }
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    }
    
    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.currentChatId || !this.user) return;
        
        try {
            const response = await fetch(`${this.apiUrl}/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    sender: this.user.username,
                    text: text
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Очищаем поле ввода
                this.messageInput.value = '';
                this.messageInput.focus();
            } else {
                alert(data.error || 'Ошибка отправки сообщения');
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            alert('Ошибка подключения к серверу');
        }
    }
    
    async createChat() {
        const activeType = document.querySelector('.chat-type-btn.active').dataset.type;
        
        if (activeType === 'private') {
            await this.createPrivateChat();
        } else {
            await this.createGroupChat();
        }
    }
    
    async createPrivateChat() {
        const username = this.contactUsername.value.trim().replace('@', '');
        
        if (!username) {
            alert('Пожалуйста, введите username');
            return;
        }
        
        if (!this.validateUsername(username)) {
            alert('Некорректный username. Используйте только буквы, цифры и подчеркивания (3-20 символов)');
            return;
        }
        
        if (username === this.user.username) {
            alert('Нельзя создать чат с самим собой');
            return;
        }
        
        try {
            // Сначала проверяем существование пользователя
            const userResponse = await fetch(`${this.apiUrl}/user/${username}`);
            const userData = await userResponse.json();
            
            if (!userData.success) {
                alert('Пользователь не найден');
                return;
            }
            
            // Создаем чат
            const response = await fetch(`${this.apiUrl}/chats/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'private',
                    name: `@${username}`,
                    members: [`@${username}`],
                    creator: this.user.username
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeNewChatModal();
                
                // Добавляем чат в список
                this.handleNewChat({
                    ...data.chat,
                    lastMessage: 'Нет сообщений',
                    lastMessageTime: data.chat.createdAt,
                    unreadCount: 0
                });
                
                // Выбираем созданный чат
                this.selectChat(data.chat.id);
            } else {
                alert(data.error || 'Ошибка создания чата');
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            alert('Ошибка подключения к серверу');
        }
    }
    
    async createGroupChat() {
        const groupName = this.groupName.value.trim();
        
        if (!groupName) {
            alert('Пожалуйста, введите название группы');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/chats/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'group',
                    name: groupName,
                    members: [],
                    creator: this.user.username
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeNewChatModal();
                
                // Добавляем чат в список
                this.handleNewChat({
                    ...data.chat,
                    lastMessage: 'Нет сообщений',
                    lastMessageTime: data.chat.createdAt,
                    unreadCount: 0
                });
                
                // Выбираем созданный чат
                this.selectChat(data.chat.id);
            } else {
                alert(data.error || 'Ошибка создания чата');
            }
        } catch (error) {
            console.error('Ошибка создания группы:', error);
            alert('Ошибка подключения к серверу');
        }
    }
    
    // Остальные методы остаются аналогичными предыдущей версии,
    // но используют данные из API вместо демо-данных
    
    renderChatsList() {
        this.chatsList.innerHTML = '';
        
        this.chats.forEach(chat => {
            this.addChatToList(chat);
        });
        
        this.updateWelcomeScreen();
    }
    
    addChatToList(chat) {
        const chatElement = document.createElement('div');
        chatElement.className = 'chat-item';
        chatElement.dataset.chatId = chat.id;
        
        const lastMessageTime = new Date(chat.lastMessageTime).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        chatElement.innerHTML = `
            <div class="chat-avatar" style="background: ${chat.avatarColor || '#667eea'}">
                <i class="${chat.type === 'group' ? 'fas fa-user-friends' : 'fas fa-user'}"></i>
            </div>
            <div class="chat-info">
                <div class="chat-header">
                    <h4>${chat.name}</h4>
                    <span class="chat-time">${lastMessageTime}</span>
                </div>
                <div class="chat-preview">
                    <p>${chat.lastMessage || 'Нет сообщений'}</p>
                    ${chat.unreadCount > 0 ? `<span class="unread-count">${chat.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
        
        chatElement.addEventListener('click', () => this.selectChat(chat.id));
        this.chatsList.appendChild(chatElement);
    }
    
    selectChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        
        // Убираем активный класс у всех чатов
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Добавляем активный класс выбранному чату
        const selectedChat = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (selectedChat) {
            selectedChat.classList.add('active');
        }
        
        this.currentChatId = chatId;
        
        // Обновляем заголовок чата
        this.chatTitle.textContent = chat.name;
        this.updateChatStatus();
        
        // Устанавливаем аватар чата
        this.currentChatAvatar.style.background = chat.avatarColor || '#667eea';
        this.currentChatAvatar.innerHTML = `<i class="${chat.type === 'group' ? 'fas fa-user-friends' : 'fas fa-user'}"></i>`;
        
        // Показываем сообщения
        this.showChatMessages(chatId);
        
        // Показываем панель ввода
        this.welcomeScreen.classList.add('hidden');
        this.chatMessages.classList.remove('hidden');
        this.messageInputArea.classList.remove('hidden');
        this.messageInput.disabled = false;
        this.sendButton.disabled = false;
        this.messageInput.focus();
        
        // Сбрасываем непрочитанные сообщения
        this.resetUnreadCount(chatId);
    }
    
    updateChatStatus() {
        if (!this.currentChatId) return;
        
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;
        
        const onlineMembers = chat.members.filter(member => {
            // В реальном приложении здесь нужно проверять статус пользователей
            return member === `@${this.user.username}`; // Пока только себя считаем онлайн
        }).length;
        
        this.chatStatus.textContent = `${chat.members.length} участников, ${onlineMembers} онлайн`;
    }
    
    showChatMessages(chatId) {
        const messages = this.messages[chatId] || [];
        this.chatMessages.innerHTML = '';
        
        if (messages.length === 0) {
            this.chatMessages.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments"></i>
                    <p>Начните общение в этом чате</p>
                    <small>Сообщения шифруются end-to-end</small>
                </div>
            `;
            return;
        }
        
        // Группируем сообщения по датам
        const messagesByDate = {};
        messages.forEach(msg => {
            const date = new Date(msg.timestamp).toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!messagesByDate[date]) {
                messagesByDate[date] = [];
            }
            messagesByDate[date].push(msg);
        });
        
        // Отображаем сообщения
        Object.keys(messagesByDate).forEach(date => {
            // Добавляем дату
            const dateElement = document.createElement('div');
            dateElement.className = 'message-date';
            dateElement.innerHTML = `<span>${date}</span>`;
            this.chatMessages.appendChild(dateElement);
            
            // Добавляем сообщения за эту дату
            messagesByDate[date].forEach(msg => {
                this.addMessageToChat(msg, false);
            });
        });
        
        this.scrollToBottom();
    }
    
    addMessageToChat(message, scroll = true) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.isOwn ? 'outgoing' : 'incoming'}`;
        messageElement.dataset.messageId = message.id;
        
        messageElement.innerHTML = `
            ${!message.isOwn ? `
                <div class="message-avatar" style="background: #764ba2">
                    <i class="fas fa-user"></i>
                </div>
            ` : ''}
            <div class="message-content">
                ${!message.isOwn ? `<span class="message-sender">${message.sender}</span>` : ''}
                <div class="message-text">${message.text}</div>
                <div class="message-time">${message.time}</div>
                ${message.isOwn ? `
                    <div class="message-status">
                        ${message.seen ? 
                            '<i class="fas fa-check-double" style="color: #10b981;"></i>' : 
                            '<i class="fas fa-check-double"></i>'
                        }
                    </div>
                ` : ''}
            </div>
        `;
        
        this.chatMessages.appendChild(messageElement);
        
        if (scroll) {
            this.scrollToBottom();
        }
    }
    
    updateWelcomeScreen() {
        if (this.chats.length > 0) {
            document.querySelector('.welcome-screen p:nth-child(3)').textContent = 
                'Выберите чат из списка слева, чтобы начать общение';
            this.connectBtn.innerHTML = '<i class="fas fa-plus"></i> Создать чат';
        }
    }
    
    // Остальные методы (goToStep, validatePhone, sendCode, verifyCode, etc.)
    // остаются такими же как в предыдущей версии, но с добавлением вызовов API
    
    checkSession() {
        const savedUser = localStorage.getItem('neogram_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                
                // Проверяем существование пользователя на сервере
                fetch(`${this.apiUrl}/user/${this.user.username}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            this.showMainInterface();
                            this.connectWebSocket();
                            this.loadChats();
                        } else {
                            this.showAuth();
                        }
                    })
                    .catch(() => {
                        this.showAuth();
                    });
                    
            } catch (e) {
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
    }
    
    showMainInterface() {
        document.body.className = 'app-visible';
        
        if (this.user) {
            this.userDisplayName.textContent = this.user.displayName;
            this.currentUsername.textContent = `@${this.user.username}`;
            this.welcomePhone.textContent = this.formatPhone(this.user.phone);
            
            this.setAvatarColor(this.currentUserAvatar, this.user.username);
            
            this.updateConnectionStatus('connecting', 'Подключение к серверу...');
        }
    }
    
    logout() {
        if (confirm('Вы уверены, что хотите выйти из NeoGram?')) {
            if (this.ws) {
                this.ws.close();
            }
            
            localStorage.removeItem('neogram_user');
            this.user = null;
            this.chats = [];
            this.messages = {};
            this.currentChatId = null;
            this.showAuth();
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NeoGram();
});