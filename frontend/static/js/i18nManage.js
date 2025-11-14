class I18nService {
    constructor() {
        this.currentLanguage = localStorage.getItem('languagePreference') || 'zh-CN';
        this.translations = {};
        this.isLoaded = false;
        this.translationCache = new Map();
        // 添加版本控制
        this.cacheVersion = 'v1.0'; // 当语言包更新时修改这个版本号
    }

    async loadLanguage(language = 'zh-CN') {
        const cacheKey = `${language}_${this.cacheVersion}`;
        
        // 检查缓存（带版本号）
        if (this.translationCache.has(cacheKey)) {
            console.log(`从缓存加载语言包: ${language} (${this.cacheVersion})`);
            this.translations = this.translationCache.get(cacheKey);
            this.currentLanguage = language;
            this.isLoaded = true;
            localStorage.setItem('languagePreference', language);
            return true;
        }

        try {
            // 添加时间戳或版本号防止缓存
           // const timestamp = Date.now();
            const response = await fetch(`/frontend/locales/${language}.json?t=${this.cacheVersion}`);
            // 或者使用版本号：`/frontend/locales/${language}.json?v=${this.cacheVersion}`
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
         
            if (result.Index) {
                this.translations = result;
                this.currentLanguage = language;
                this.isLoaded = true;
                
                // 保存到缓存（带版本号）
                this.translationCache.set(cacheKey, result);
                
                localStorage.setItem('languagePreference', language);
                
                console.log(`语言包加载成功: ${language}`);
                return true;
            } else {
                console.error('加载语言包失败: 无效的语言包格式');
                return false;
            }
        } catch (error) {
            console.error('加载语言包时发生错误:', error);
            
            // 回退到旧版本缓存（如果有）
            const oldCacheKeys = Array.from(this.translationCache.keys())
                .filter(key => key.startsWith(language));
            if (oldCacheKeys.length > 0) {
                console.warn(`加载失败，使用旧版本语言包: ${oldCacheKeys[0]}`);
                this.translations = this.translationCache.get(oldCacheKeys[0]);
                this.currentLanguage = language;
                this.isLoaded = true;
                return true;
            }
            
            return false;
        }
    }

    // 强制重新加载语言包
    async forceReloadLanguage(language = this.currentLanguage) {
        const cacheKey = `${language}_${this.cacheVersion}`;
        
        // 清除特定语言的缓存
        this.translationCache.delete(cacheKey);
        
        console.log(`强制重新加载语言包: ${language}`);
        return await this.loadLanguage(language);
    }

    // 清除所有缓存
    clearCache() {
        this.translationCache.clear();
        console.log('已清除所有语言包缓存');
    }

    // 更新缓存版本（当语言包内容更新时调用）
    updateCacheVersion(newVersion) {
        this.cacheVersion = newVersion;
        console.log(`语言包缓存版本更新为: ${newVersion}`);
    }

    // 获取翻译
    t(key, params = {}) {
        if (!this.isLoaded) {
            console.warn('语言包未加载');
            return key;
        }

        let translation = this.translations[key];
        
        if (!translation) {
            console.warn(`翻译键不存在: ${key}`);
            return key;
        }

        // 处理占位符
        if (Object.keys(params).length > 0) {
            translation = translation.replace(/{(\w+)}/g, (match, paramName) => {
                return params[paramName] !== undefined ? params[paramName] : match;
            });
        }

        return translation;
    }

    // 切换语言
    async switchLanguage(language) {
        // 如果已经是当前语言，直接返回
        if (this.currentLanguage === language && this.isLoaded) {
            console.log(`已经是 ${language} 语言，无需切换`);
            return true;
        }

        const success = await this.loadLanguage(language);
        if (success) {
            // 触发语言切换事件
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language }
            }));
            
            // 更新页面
            location.reload();
        }
        return success;
    }

    // 更新页面文本
    updatePageText() {
        // 查找所有带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const params = {};
            
            // 获取参数
            const paramAttributes = element.getAttribute('data-i18n-params');
            if (paramAttributes) {
                try {
                    Object.assign(params, JSON.parse(paramAttributes));
                } catch (e) {
                    console.warn(`解析参数失败: ${paramAttributes}`);
                }
            }
            
            const translation = this.t(key, params);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // 处理 data-i18n-placeholder 属性
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            element.placeholder = translation;
        });
       
        // 更新标题
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.textContent = this.t('systemName');
        }
    }

    // 预加载其他语言包（可选）
    async preloadLanguages(languages = ['en-US']) {
        for (const language of languages) {
            if (language !== this.currentLanguage && !this.translationCache.has(language)) {
                try {
                    const response = await fetch(`/frontend/locales/${language}.json`);
                    if (response.ok) {
                        const translations = await response.json();
                        this.translationCache.set(language, translations);
                        console.log(`预加载语言包: ${language}`);
                    }
                } catch (error) {
                    console.warn(`预加载语言包失败: ${language}`, error);
                }
            }
        }
    }

    // 初始化
    async init() {
        // 从本地存储获取首选语言，或使用浏览器语言
        const savedLanguage = localStorage.getItem('languagePreference');
        const browserLanguage = navigator.language || 'zh-CN';
        const defaultLanguage = savedLanguage || (browserLanguage.startsWith('zh') ? 'zh-CN' : 'en-US');
               
        await this.loadLanguage(defaultLanguage);
        this.updatePageText();
        
        // 可选：预加载其他语言
        // await this.preloadLanguages(['en-US', 'zh-CN']);
        
        // 监听语言切换事件
        window.addEventListener('languageChanged', (event) => {
            // 这里不需要做任何事情，因为已经通过 location.reload() 刷新页面
        });
    }
 
}
// 创建全局实例
const i18n = new I18nService();

// 语言切换函数（供HTML调用）
function switchLanguage() {
    let language = i18n.currentLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';
    i18n.switchLanguage(language);
}