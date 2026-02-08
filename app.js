class NeoGram {
    constructor() {
        this.user = null;
        this.currentStep = 'phone'; // phone, code, profile
        this.timerInterval = null;
        this.timeLeft = 60;
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
            alert('Пожалуйста, введите корректный номер телефона');
            return;
        }
        
        // Здесь должен быть запрос к серверу для отправки SMS
        console.log(`Отправка кода на номер: +7${phone.replace(/\D/g, '')}`);
        
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
        
        // Здесь должна быть проверка кода на сервере
        console.log(`Проверка кода: ${code}`);
        
        // Для демонстрации считаем любой 5-значный код правильным
        if (code.length === 5) {
            // Сохраняем номер телефона для профиля
            this.userPhone = this.phoneNumber.value;
            
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
            };
            reader.readAsDataURL(file);
        }
    }
    
    completeProfile() {
        const firstName = this.firstName.value.trim();
        const lastName = this.lastName.value.trim();
        const username = this.username.value.trim();
        
        if (!firstName) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }
        
        if (!this.validateUsername(username)) {
            alert('Username должен содержать 3-20 символов (только буквы, цифры и подчеркивания)');
            return;
        }
        
        // Создаем объект пользователя
        this.user = {
            phone: this.userPhone,
            firstName: firstName,
            lastName: lastName,
            username: username.toLowerCase(),
            displayName: lastName ? `${firstName} ${lastName}` : firstName,
            status: 'online',
            lastSeen: new Date().toISOString()
        };
        
        // Сохраняем в localStorage
        localStorage.setItem('neogram_user', JSON.stringify(this.user));
        
        // Показываем основной интерфейс
        this.showMainInterface();
    }
    
    validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }
    
    checkSession() {
        const savedUser = localStorage.getItem('neogram_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                this.showMainInterface();
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
        
        // Обновляем информацию о пользователе
        if (this.user) {
            document.getElementById('userDisplayName').textContent = this.user.displayName;
            document.querySelector('.username').textContent = `@${this.user.username}`;
            document.querySelector('.welcome-screen h2').textContent = `Добро пожаловать, ${this.user.firstName}!`;
            document.querySelector('.welcome-screen strong').textContent = this.formatPhone(this.user.phone);
        }
    }
    
    logout() {
        if (confirm('Вы уверены, что хотите выйти из NeoGram?')) {
            localStorage.removeItem('neogram_user');
            this.user = null;
            this.showAuth();
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NeoGram();
});