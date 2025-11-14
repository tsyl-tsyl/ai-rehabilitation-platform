import json
import os
from typing import Dict, Any

class BackendI18n:
    def __init__(self, locales_path: str = "locales"):
        self.locales_path = locales_path
        self.translations: Dict[str, Dict[str, Any]] = {}
        self.current_lang = "en"
        self.load_translations()
    
    def load_translations(self):
        """加载所有语言翻译文件"""
        for filename in os.listdir(self.locales_path):
            if filename.endswith('.json'):
                lang = filename.split('.')[0]
                filepath = os.path.join(self.locales_path, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    self.translations[lang] = json.load(f)
    
    def set_language(self, lang: str):
        """设置当前语言"""
        if lang in self.translations:
            self.current_lang = lang
    
    def t(self, key: str, default: str = None) -> str:
        """获取翻译文本"""
        keys = key.split('.')
        translation = self.translations.get(self.current_lang, {})
        
        for k in keys:
            translation = translation.get(k, {})
            if not translation:
                return default or key
        
        return translation if isinstance(translation, str) else (default or key)
    
    def get_all_translations(self, lang: str) -> Dict[str, Any]:
        """获取指定语言的所有翻译"""
        return self.translations.get(lang, {})

# 创建全局实例
i18n = BackendI18n()