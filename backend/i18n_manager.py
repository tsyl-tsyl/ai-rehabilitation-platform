import json
import os
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class I18nManager:
    """国际化管理器"""
    
    def __init__(self, config_dir: str = "locales"):
        # 获取当前文件的绝对路径
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # 构建完整的配置目录路径
        self.config_dir = os.path.join(current_dir, config_dir)
        self.supported_languages = ['zh-CN', 'en-US']
        self.default_language = 'zh-CN'
        self.translations = {}
        self._load_translations()
    
    def _load_translations(self):
        """加载所有语言包"""
        print(f"正在从目录加载语言包: {self.config_dir}")
        
        # 检查目录是否存在
        if not os.path.exists(self.config_dir):
            print(f"错误: 语言包目录不存在: {self.config_dir}")
            # 尝试创建目录
            os.makedirs(self.config_dir, exist_ok=True)
            print(f"已创建目录: {self.config_dir}")
            return
        
        for lang in self.supported_languages:
            file_path = os.path.join(self.config_dir, f"{lang}.json")
            print(f"尝试加载语言文件: {file_path}")
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    self.translations[lang] = json.load(f)
                print(f"成功加载语言包: {lang}")
            except FileNotFoundError:
                print(f"警告: 语言包文件不存在: {file_path}")
            except json.JSONDecodeError as e:
                print(f"错误: 语言包文件格式错误 {file_path}: {e}")
            except Exception as e:
                print(f"错误: 加载语言包失败 {file_path}: {e}")
    
     
    
    def get_translation(self, language: str, key: str, default: str = None) -> str:
        """获取指定语言的翻译"""
        if language not in self.translations:
            language = self.default_language
        
        if language in self.translations and key in self.translations[language]:
            return self.translations[language][key]
        
        return default or key
    
    def get_all_translations(self, language: str) -> Dict[str, str]:
        """获取指定语言的所有翻译"""
        if language in self.translations:
            return self.translations[language]
        elif self.default_language in self.translations:
            return self.translations[self.default_language]
        else:
            return {}
    
    def get_supported_languages(self) -> list:
        """获取支持的语言列表"""
        return self.supported_languages
    
    def format_message(self, message: str, **kwargs) -> str:
        """格式化消息（处理占位符）"""
        try:
            return message.format(**kwargs)
        except (KeyError, ValueError):
            return message

# 创建全局实例
i18n_manager = I18nManager("locales")