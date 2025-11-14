// i18n 管理器
class I18nManager {
    constructor() {
        this.currentLanguage = 'zh-CN';
        this.translations = {};
        this.init();
    }

    // 初始化
    async init() {
        // 从本地存储获取语言设置
        const savedLanguage = localStorage.getItem('preferred-language') || 'zh-CN';
        await this.loadLanguage(savedLanguage);
        this.applyTranslations();
        this.setupLanguageSwitcher();
    }

    // 加载语言文件
    async loadLanguage(lang) {
        try {
            const response = await fetch(`../locales/${lang}.json`);
            this.translations = await response.json();
            this.currentLanguage = lang;
        } catch (error) {
            console.error('Failed to load language file:', error);
            // 如果加载失败，使用默认中文
            if (lang !== 'zh-CN') {
                await this.loadLanguage('zh-CN');
            }
        }
    }

    // 获取翻译文本
    t(key) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value[k] === undefined) {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
            value = value[k];
        }
        
        return value;
    }

    // 应用翻译到页面
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (translation) {
                // 处理占位符文本（如input的placeholder）
                if (element.placeholder !== undefined) {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // 更新语言按钮样式
        this.updateLanguageButtons();
    }

    // 更新语言按钮样式
    updateLanguageButtons() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.getAttribute('data-lang') === this.currentLanguage) {
                btn.classList.remove('bg-white/10', 'hover:bg-white/20', 'text-light');
                btn.classList.add('bg-accent', 'text-white');
            } else {
                btn.classList.remove('bg-accent', 'text-white');
                btn.classList.add('bg-white/10', 'hover:bg-white/20', 'text-light');
            }
        });
    }

    // 设置语言切换器
    setupLanguageSwitcher() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.changeLanguage(btn.getAttribute('data-lang'));
            });
        });
    }

    // 切换语言
    async changeLanguage(lang) {
        if (lang === this.currentLanguage) return;
        
        await this.loadLanguage(lang);
        this.applyTranslations();
        
        // 保存语言设置到本地存储
        localStorage.setItem('preferred-language', lang);
        
        // 触发语言更改事件，以便其他组件可以响应
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
    }

    // 获取当前语言
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // 获取动态反馈文本
    getSimilarityFeedback(similarity) {
        if (this.currentLanguage === 'zh-CN') {
            if (similarity >= 90) {
                return `太棒了！你的发音非常标准，匹配度达到了${similarity}%。继续保持！`;
            } else if (similarity >= 80) {
                return `很好！你的发音与标准发音比较接近，匹配度${similarity}%。再试一次会更完美！`;
            } else {
                return `不错的尝试，匹配度${similarity}%。注意观察波形差异较大的部分，多练习几次会更好。`;
            }
        } else {
            if (similarity >= 90) {
                return `Excellent! Your pronunciation is very standard, matching degree reached ${similarity}%. Keep it up!`;
            } else if (similarity >= 80) {
                return `Great! Your pronunciation is close to the standard, matching degree ${similarity}%. Try again for perfection!`;
            } else {
                return `Good attempt, matching degree ${similarity}%. Pay attention to the parts with large waveform differences, practice more for better results.`;
            }
        }
    }

    // 获取状态文本
    getStatusText(key) {
        const statusTexts = {
            'waitingAudio': this.currentLanguage === 'zh-CN' ? '等待音频数据...' : 'Waiting for audio data...',
            'playing': this.currentLanguage === 'zh-CN' ? '播放中...' : 'Playing...',
            'played': this.currentLanguage === 'zh-CN' ? '已播放' : 'Played',
            'recording': this.currentLanguage === 'zh-CN' ? '录音中...' : 'Recording...',
            'recorded': this.currentLanguage === 'zh-CN' ? '已录制' : 'Recorded',
            'recordingFailed': this.currentLanguage === 'zh-CN' ? '录音失败' : 'Recording Failed',
            'observeImage': this.currentLanguage === 'zh-CN' ? '请观察图片，点击播放示范' : 'Please observe the image, click to play example'
        };
        
        return statusTexts[key] || key;
    }

    // 获取个性化训练提示
    getTrainingAlert() {
        return this.currentLanguage === 'zh-CN' 
            ? '个性化模型训练功能即将开放，敬请期待！'
            : 'Personalized model training function will be available soon, stay tuned!';
    }

    // 获取麦克风错误提示
    getMicrophoneError() {
        return this.currentLanguage === 'zh-CN'
            ? '无法访问麦克风，请检查浏览器权限设置。'
            : 'Unable to access microphone, please check browser permissions.';
    }
}

// 创建全局i18n实例
window.i18n = new I18nManager();