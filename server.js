class NeoGram {
    constructor() {
        this.user = null;
        this.currentStep = 'phone'; // phone, code, profile
        this.timerInterval = null;
        this.timeLeft = 60;
        
        // Данные чатов
        this.chats = [];
        this.currentChatId = null;
        this.messages = {};
        
        // WebSocket соединение
        this.ws = null;
        this.wsConnected = false;
        
        // API URL - автоматическое определение в зависимости от окружения
        this.apiUrl = window.location.origin + '/api';
        this.wsUrl = window.location.protocol === 'https:' ? 
            `wss://${window.location.host}` : 
            `ws://${window.location.host}`;
        
        // Аватарные цвета для разных пользователей
        this.avatarColors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c', 
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#fa709a', '#fee140', '#a8edea', '#d299c2'
        ];
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupPhoneInput();
        this.checkSession();
    }
    
    cacheElements() {
        // Шаги авторизации
        this.phoneStep = document.getElementById('phoneStep');
        this.codeStep = document.getElementById('codeStep');
        this.profileStep = document.getElementById('profileStep');
        
        // Поля ввода
        this.phoneNumber = document.getElementById('phoneNumber');
        this.codeDigits = document.querySelectorAll('.code-digit');
        this.firstName = document.getElementById('firstName');
        this.lastName = document.getElementById('lastName');
        this.username = document.getElementById('username');
        this.termsAgreement = document.getElementById('termsAgreement');
        
        // Кнопки
        this.sendCodeBtn = document.getElementById('sendCodeBtn');
        this.backToPhoneBtn = document.getElementById('backToPhone');
        this.verifyCodeBtn = document.getElementById('verifyCodeBtn');
        this.resendCodeBtn = document.getElementById('resendCodeBtn');
        this.completeProfileBtn = document.getElementById('completeProfileBtn');
        this.changeAvatarBtn = document.getElementById('changeAvatarBtn');
        this.avatarInput = document.getElementById('avatarInput');
        
        // Таймер
        this.timerText = document.getElementById('timerText');
        this.resendTimer = document.getElementById('resendTimer');
        
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
        
        // Элементы информации
        this.chatTitle = document.getElementById('chatTitle');
        this.chatStatus = document.getElementById('chatStatus');
        this.currentChatAvatar = document.querySelector('.chat-info .avatar');
        this.userDisplayName = document.getElementById('userDisplayName');
        this.currentUsername = document.querySelector('.username');
        this.currentUserAvatar = document.querySelector('.user-avatar');
        this.connectionStatusText = document.querySelector('.connection-status span');
    }
    
    bindEvents() {
        // Шаг 1: Отправка кода
        this.sendCodeBtn.addEventListener('click', () => this.sendCode());
        this.phoneNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCode();
        });
        
        // Шаг 2: Ввод кода
        this.backToPhoneBtn.addEventListener('click', () => this.goToStep('phone'));
        this.verifyCodeBtn.addEventListener('click', () => this.verifyCode());
        this.resendCodeBtn.addEventListener('click', () => this.resendCode());
        
        // Обработка ввода кода
        this.codeDigits.forEach((digit, index) => {
            digit.addEventListener('input', (e) => this.handleCodeInput(e, index));
            digit.addEventListener('keydown', (e) => this.handleCodeNavigation(e, index));
            digit.addEventListener('paste', (e) => this.handleCodePaste(e));
        });
        
        // Шаг 3: Профиль
        this.completeProfileBtn.addEventListener('click', () => this.completeProfile());
        this.changeAvatarBtn.addEventListener('click', () => this.avatarInput.click());
        this.avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        
        // Основной интерфейс
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.newChatBtn.addEventListener('click', () => this.showNewChatModal());
        this.connectBtn.addEventListener('click', () => this.showNewChatModal());
        
        // Сообщения
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Поиск
        this.searchInput.addEventListener('input', () => this.filterChats());
    }
    
    setupPhoneInput() {
        // Форматирование номера телефона
        this.phoneNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Форматирование: +7 (900) 123-45-67
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
    
    goToStep(step) {
        this.currentStep = step;
        
        // Скрываем все шаги
        this.phoneStep.classList.add('hidden');
        this.codeStep.classList.add('hidden');
        this.profileStep.classList.add('hidden');
        
        // Показываем нужный шаг
        switch(step) {
            case 'phone':
                this.phoneStep.classList.remove('hidden');
                this.phoneNumber.focus();
                break;
            case 'code':
                this.codeStep.classList.remove('hidden');
                this.codeDigits[0].focus();
                this.startTimer();
                break;
            case 'profile':
                this.profileStep.classList.remove('hidden');
                this.firstName.focus();
                break;
        }
    }
    
    validatePhone(phone) {
        // Простая валидация российского номера
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length === 10 && cleanPhone.startsWith('9');
    }
    
    sendCode() {
        const phone = this.phoneNumber.value.trim();
        
        if (!this.termsAgreement.checked) {
            alert('Пожалуйста, согласитесь с условиями использования');
            return;
        }
        
        if (!this.validatePhone(phone)) {
            alert('Пожалуйста, введите корректный номер телефона (10 цифр, начинается с 9)');
            return;
        }
        
        // Сохраняем номер телефона
        this.userPhone = this.formatPhoneForServer(phone);
        
        // Для демонстрации - показываем фиктивный запрос
        console.log(`Отправка кода на номер: ${this.userPhone}`);
        
        // Обновляем текст с номером телефона
        const formattedPhone = this.formatPhone(phone);
        document.getElementById('codeSentTo').textContent = `Код отправлен на ${formattedPhone}`;
        
        // Переходим к шагу ввода кода
        this.goToStep('code');
        
        // Для демонстрации - автоматически заполняем код
        setTimeout(() => {
            this.autoFillCode('12345');
        }, 1000);
    }
    
    formatPhoneForServer(phone) {
        const clean = phone.replace(/\D/g, '');
        return `+7${clean}`;
    }
    
    formatPhone(phone) {
        const clean = phone.replace(/\D/g, '');
        return `+7 (${clean.substring(0,3)}) ${clean.substring(3,6)}-${clean.substring(6,8)}-${clean.substring(8,10)}`;
    }
    
    handleCodeInput(e, index) {
        const value = e.target.value;
        
        // Разрешаем только цифры
        if (!/^\d?$/.test(value)) {
            e.target.value = '';
            return;
        }
        
        // Автоматически переходим к следующему полю
        if (value && index < this.codeDigits.length - 1) {
            this.codeDigits[index + 1].focus();
        }
        
        // Проверяем, заполнен ли весь код
        this.checkCodeComplete();
    }
    
    handleCodeNavigation(e, index) {
        // Обработка Backspace
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            this.codeDigits[index - 1].focus();
        }
        // Обработка стрелок
        else if (e.key === 'ArrowLeft' && index > 0) {
            this.codeDigits[index - 1].focus();
        }
        else if (e.key === 'ArrowRight' && index < this.codeDigits.length - 1) {
            this.codeDigits[index + 1].focus();
        }
    }
    
    handleCodePaste(e) {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text');
        const digits = pasteData.replace(/\D/g, '').split('').slice(0, 5);
        
        digits.forEach((digit, index) => {
            if (this.codeDigits[index]) {
                this.codeDigits[index].value = digit;
            }
        });
        
        // Фокус на последнем заполненном поле
        const lastIndex = Math.min(digits.length - 1, this.codeDigits.length - 1);
        if (this.codeDigits[lastIndex]) {
            this.codeDigits[lastIndex].focus();
        }
        
        this.checkCodeComplete();
    }
    
    autoFillCode(code) {
        const digits = code.split('').slice(0, 5);
        digits.forEach((digit, index) => {
            if (this.codeDigits[index]) {
                this.codeDigits[index].value = digit;
            }
        });
        this.checkCodeComplete();
    }
    
    checkCodeComplete() {
        let complete = true;
        let code = '';
        
        this.codeDigits.forEach(digit => {
            if (!digit.value) complete = false;
            code += digit.value;
        });
        
        this.verifyCodeBtn.disabled = !complete;
        return { complete, code };
    }
    
    startTimer() {
        this.timeLeft = 60;
        this.resendTimer.classList.remove('hidden');
        this.resendCodeBtn.classList.add('hidden');
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.resendTimer.classList.add('hidden');
                this.resendCodeBtn.classList.remove('hidden');
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    verifyCode() {
        const { complete, code } = this.checkCodeComplete();
        
        if (!complete) {
            alert('Пожалуйста, введите полный код');
            return;
        }
        
        // Для демонстрации считаем любой 5-значный код правильным
        if (code.length === 5) {
            // Останавливаем таймер
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            // Переходим к созданию профиля
            this.goToStep('profile');
        } else {
            alert('Неверный код. Пожалуйста, проверьте и попробуйте снова.');
        }
    }
    
    resendCode() {
        console.log('Повторная отправка кода');
        this.startTimer();
        
        // Для демонстрации
        setTimeout(() => {
            this.autoFillCode('54321');
        }, 1000);
    }
    
    handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const avatarPreview = document.getElementById('avatarPreview');
                avatarPreview.innerHTML = '';
                const img = document.createElement('img');
                img.src = event.target.result;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                avatarPreview.appendChild(img);
                
                // Добавляем overlay обратно
                const overlay = document.createElement('div');
                overlay.className = 'avatar-overlay';
                overlay.innerHTML = '<i class="fas fa-camera"></i>';
                avatarPreview.appendChild(overlay);
                
                // Сохраняем аватар в localStorage
                if (this.user) {
                    this.user.avatar = event.target.result;
                    localStorage.setItem('neogram_user', JSON.stringify(this.user));
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    async completeProfile() {
        const firstName = this.firstName.value.trim();
        const lastName = this.lastName.value.trim();
        const username = this.username.value.trim().toLowerCase();
        
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
                    phone: this.userPhone,
                    firstName: firstName,
                    lastName: lastName,
                    username: username
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
                await this.loadChats();
            } else {
                alert(data.error || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            alert('Ошибка подключения к серверу');
        }
    }
    
    validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }
    
    // WebSocket соединение
    connectWebSocket() {
        if (!this.user) return;
        
        try {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket соединение установлено');
                this.wsConnected = true;
                this.updateConnectionStatus('connected', 'Подключено');
                
                // Авторизуемся через WebSocket
                this.ws.send(JSON.stringify({
                    type: 'auth',
                    username: this.user.username
                }));
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
                
                // Пытаемся переподключиться через 5 секунд
                setTimeout(() => {
                    if (this.user && !this.wsConnected) {
                        this.connectWebSocket();
                    }
                }, 5000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                this.updateConnectionStatus('error', 'Ошибка подключения');
            };
            
        } catch (error) {
            console.error('Ошибка создания WebSocket соединения:', error);
            this.updateConnectionStatus('error', 'Ошибка подключения');
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
            const formattedMessage = {
                ...message,
                time: new Date(message.timestamp).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                isOwn: message.sender === `@${this.user.username}`
            };
            
            this.messages[message.chatId].push(formattedMessage);
            
            // Обновляем последнее сообщение в списке чатов
            const chatIndex = this.chats.findIndex(c => c.id === message.chatId);
            if (chatIndex !== -1) {
                this.chats[chatIndex].lastMessage = message.text;
                this.chats[chatIndex].lastMessageTime = message.timestamp;
                
                // Увеличиваем счетчик непрочитанных, если чат не активен
                if (message.chatId !== this.currentChatId && !formattedMessage.isOwn) {
                    this.chats[chatIndex].unreadCount = (this.chats[chatIndex].unreadCount || 0) + 1;
                }
                
                this.updateChatInList(message.chatId);
            }
            
            // Если чат активен, показываем сообщение
            if (message.chatId === this.currentChatId) {
                this.addMessageToChat(formattedMessage);
                
                // Отправляем статус "прочитано" для чужих сообщений
                if (!formattedMessage.isOwn && this.wsConnected) {
                    this.ws.send(JSON.stringify({
                        type: 'message_seen',
                        chatId: message.chatId,
                        messageId: message.id
                    }));
                }
                
                // Прокручиваем вниз
                this.scrollToBottom();
            }
        }
    }
    
    handleNewChat(chat) {
        // Проверяем, нет ли уже такого чата
        const exists = this.chats.some(c => c.id === chat.id);
        if (!exists) {
            const newChat = {
                ...chat,
                lastMessage: 'Нет сообщений',
                lastMessageTime: chat.createdAt,
                unreadCount: 0
            };
            
            this.chats.push(newChat);
            this.addChatToList(newChat);
            
            // Если это первый чат, обновляем welcome screen
            if (this.chats.length === 1) {
                this.updateWelcomeScreen();
            }
        }
    }
    
    updateConnectionStatus(status, text) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = this.connectionStatusText;
        
        if (indicator) {
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
        }
        
        if (statusText) {
            statusText.textContent = text;
        }
    }
    
    updateUserStatus(username, status) {
        // Обновляем статус в списке чатов
        this.chats.forEach(chat => {
            if (chat.members && chat.members.includes(username)) {
                const chatElement = document.querySelector(`.chat-item[data-chat-id="${chat.id}"]`);
                if (chatElement) {
                    // Можно добавить отображение статуса в будущем
                }
            }
        });
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
    
    async loadChats() {
        if (!this.user) return;
        
        try {
            const response = await fetch(`${this.apiUrl}/chats/${this.user.username}`);
            const data = await response.json();
            
            if (data.success) {
                this.chats = data.chats.map(chat => ({
                    ...chat,
                    lastMessage: 'Нет сообщений',
                    lastMessageTime: chat.createdAt,
                    unreadCount: 0
                }));
                
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
        
        const lastMessageTime = chat.lastMessageTime ? 
            new Date(chat.lastMessageTime).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '--:--';
        
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
    
    updateChatInList(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        
        const chatElement = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (!chatElement) return;
        
        const lastMessageTime = chat.lastMessageTime ? 
            new Date(chat.lastMessageTime).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '--:--';
        
        chatElement.querySelector('.chat-time').textContent = lastMessageTime;
        chatElement.querySelector('.chat-preview p').textContent = chat.lastMessage || 'Нет сообщений';
        
        const unreadCountElement = chatElement.querySelector('.unread-count');
        if (chat.unreadCount > 0) {
            if (!unreadCountElement) {
                const unreadSpan = document.createElement('span');
                unreadSpan.className = 'unread-count';
                unreadSpan.textContent = chat.unreadCount;
                chatElement.querySelector('.chat-preview').appendChild(unreadSpan);
            } else {
                unreadCountElement.textContent = chat.unreadCount;
            }
        } else if (unreadCountElement) {
            unreadCountElement.remove();
        }
    }
    
    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.currentChatId || !this.user || !this.wsConnected) return;
        
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
        if (this.currentChatAvatar) {
            this.currentChatAvatar.style.background = chat.avatarColor || '#667eea';
            this.currentChatAvatar.innerHTML = `<i class="${chat.type === 'group' ? 'fas fa-user-friends' : 'fas fa-user'}"></i>`;
        }
        
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
        
        if (chat.type === 'private') {
            this.chatStatus.textContent = 'online';
        } else {
            this.chatStatus.textContent = `${chat.members ? chat.members.length : 1} участников`;
        }
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
        
        // Определяем цвет аватара на основе имени отправителя
        const senderName = message.sender.replace('@', '');
        const avatarColor = this.getAvatarColor(senderName);
        
        messageElement.innerHTML = `
            ${!message.isOwn ? `
                <div class="message-avatar" style="background: ${avatarColor}">
                    <i class="fas fa-user"></i>
                </div>
            ` : ''}
            <div class="message-content">
                ${!message.isOwn ? `<span class="message-sender">${message.sender}</span>` : ''}
                <div class="message-text">${this.escapeHtml(message.text)}</div>
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
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
    
    resetUnreadCount(chatId) {
        const chatIndex = this.chats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1 && this.chats[chatIndex].unreadCount > 0) {
            this.chats[chatIndex].unreadCount = 0;
            this.updateChatInList(chatId);
        }
    }
    
    updateWelcomeScreen() {
        if (this.chats.length > 0) {
            const welcomeText = document.querySelector('.welcome-screen p:nth-child(3)');
            if (welcomeText) {
                welcomeText.textContent = 'Выберите чат из списка слева, чтобы начать общение';
            }
            this.connectBtn.innerHTML = '<i class="fas fa-plus"></i> Создать чат';
        }
    }
    
    showNewChatModal() {
        alert('Функция создания нового чата будет реализована в следующей версии');
        // В будущем можно добавить модальное окно для создания чата
    }
    
    filterChats() {
        const searchTerm = this.searchInput.value.toLowerCase();
        
        document.querySelectorAll('.chat-item').forEach(chatItem => {
            const chatName = chatItem.querySelector('h4').textContent.toLowerCase();
            const chatPreview = chatItem.querySelector('.chat-preview p').textContent.toLowerCase();
            
            if (chatName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
                chatItem.style.display = 'flex';
            } else {
                chatItem.style.display = 'none';
            }
        });
    }
    
    getAvatarColor(username) {
        // Генерируем индекс цвета на основе имени пользователя
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % this.avatarColors.length;
        return this.avatarColors[index];
    }
    
    setAvatarColor(element, username) {
        if (element && username) {
            const color = this.getAvatarColor(username);
            element.style.background = color;
        }
    }
    
    checkSession() {
        const savedUser = localStorage.getItem('neogram_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                
                // Проверяем существование пользователя на сервере
                fetch(`${this.apiUrl}/user/${this.user.username}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.user) {
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
    
    showAuth() {
        document.body.className = 'auth-visible';
        this.phoneNumber.focus();
        this.goToStep('phone');
    }
    
    showMainInterface() {
        document.body.className = 'app-visible';
        
        if (this.user) {
            // Обновляем информацию о пользователе
            this.userDisplayName.textContent = this.user.displayName;
            this.currentUsername.textContent = `@${this.user.username}`;
            
            // Обновляем welcome screen
            const welcomeTitle = document.querySelector('.welcome-screen h2');
            const welcomePhone = document.querySelector('.welcome-screen strong');
            
            if (welcomeTitle) {
                welcomeTitle.textContent = `Добро пожаловать, ${this.user.firstName}!`;
            }
            
            if (welcomePhone && this.user.phone) {
                welcomePhone.textContent = this.user.phone;
            }
            
            // Устанавливаем аватар
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