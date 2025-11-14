from fastapi import FastAPI, File, UploadFile, Form, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import numpy as np
import librosa
import io
import tempfile
import os
from typing import Dict, Any, Optional
import uuid
from datetime import datetime
import logging
import wave
import struct

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/speech", tags=["语音康复"])

# 尝试导入Vosk
try:
    import vosk
    VOSK_AVAILABLE = True
    logger.info("Vosk 模块加载成功")
except ImportError:
    logger.warning("Vosk 未安装，将使用模拟识别")
    VOSK_AVAILABLE = False

# 初始化Vosk模型
vosk_models = {}  # 存储不同语言的模型
current_language = "zh-CN"  # 默认语言

def load_vosk_model(language: str, model_path: str) -> bool:
    """加载指定语言的Vosk模型"""
    try:
        if os.path.exists(model_path):
            vosk_models[language] = vosk.Model(model_path)
            logger.info(f"Vosk {language} 模型加载成功: {model_path}")
            return True
        else:
            logger.warning(f"Vosk {language} 模型路径不存在: {model_path}")
            return False
    except Exception as e:
        logger.error(f"Vosk {language} 模型初始化失败: {e}")
        return False

# 模型配置
MODEL_CONFIGS = {
    "zh-CN": {
        "name": "中文模型",
        "paths": [
            "vosk-model-small-cn-0.22",
            "model/vosk-model-small-cn-0.22",
            "backend/ml_models/vosk-models/vosk-model-small-cn-0.22",
            "../backend/ml_models/vosk-models/vosk-model-small-cn-0.22",
            "ml_models/vosk-models/vosk-model-small-cn-0.22",
        ]
    },
    "en-US": {
        "name": "英文模型", 
        "paths": [
            "vosk-model-small-en-us-0.15",
            "vosk-model-en-us-0.15", 
            "model/vosk-model-small-en-us-0.15",
            "backend/ml_models/vosk-models/vosk-model-small-en-us-0.15",
            "../backend/ml_models/vosk-models/vosk-model-small-en-us-0.15",
            "ml_models/vosk-models/vosk-model-small-en-us-0.15",
        ]
    }
}

# 初始化所有可用模型
if VOSK_AVAILABLE:
    for lang, config in MODEL_CONFIGS.items():
        model_loaded = False
        for path in config["paths"]:
            if load_vosk_model(lang, path):
                model_loaded = True
                break
        
        if not model_loaded:
            logger.warning(f"未找到 {config['name']}，请下载并放置在指定目录")
    
    # 设置默认语言
    if "zh-CN" in vosk_models:
        current_language = "zh-CN"
    elif "en-US" in vosk_models:
        current_language = "en-US"

def set_current_language(language: str):
    """设置当前使用的语言"""
    global current_language
    if language in vosk_models:
        current_language = language
        logger.info(f"切换到 {language} 模型")
        return True
    else:
        logger.warning(f"语言 {language} 的模型未加载")
        return False

def get_current_model():
    """获取当前语言模型"""
    return vosk_models.get(current_language)

@router.get("/health")
async def health_check():
    """健康检查接口"""
    available_models = list(vosk_models.keys())
    return {
        "status": "ok",
        "message": "后端服务正常运行",
        "version": "4.0",
        "vosk_available": VOSK_AVAILABLE,
        "available_models": available_models,
        "current_language": current_language,
        "features": "多语言Vosk语音识别 + 音频分析"
    }

@router.post("/set-language")
async def set_language(language: str = Form(...)):
    """设置识别语言"""
    if language in ["zh-CN", "en-US"]:
        success = set_current_language(language)
        if success:
            return {"status": "success", "message": f"已切换到{language}语言"}
        else:
            return {"status": "error", "message": f"{language}语言模型未加载"}
    else:
        return {"status": "error", "message": "不支持的语言，请使用 'cn' 或 'en'"}

@router.post("/analyze-pronunciation")
async def analyze_pronunciation(
    audio: UploadFile = File(...), 
    reference_text: str = Form(...),
    user_id: str = Form("default_user"),
    language: str = Form("zh-CN")  # 新增语言参数
):
    """
    多语言发音分析API
    """
    session_id = str(uuid.uuid4())
    
    try:
        logger.info(f"收到分析请求，用户: {user_id}, 语言: {language}, 参考文本: '{reference_text}'")
        
        # 设置语言
        if language in ["zh-CN", "en-US"]:
            set_current_language(language)
        
        # 读取音频文件
        audio_data = await audio.read()
        logger.info(f"音频文件大小: {len(audio_data)} 字节")
        
        # 生成分析结果
        analysis_result = await analyze_audio(audio_data, reference_text, user_id, language)
        
        return analysis_result
    
    except Exception as e:
        logger.error(f"发音分析错误: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        return {
            "overall_score": 50,
            "similarity_score": 50,
            "recognized_text": reference_text,
            "language": language,
            "issues": [{
                "type": "system_error",
                "description": f"分析过程中出现错误: {str(e)}",
                "severity": "high"
            }],
            "suggestions": ["请重试或检查音频文件"],
            "audio_features": {
                "duration": 2.0,
                "pitch_stability": 75,
                "clarity_score": 70
            },
            "improvement_tip": "分析过程中出现错误",
            "personalized_advice": ["请检查系统状态"],
            "next_exercise_recommendation": "基础练习"
        }

async def analyze_audio(audio_data: bytes, reference_text: str, user_id: str, language: str) -> Dict[str, Any]:
    """分析音频数据"""
    
    # 保存临时文件
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
        temp_file.write(audio_data)
        temp_file.flush()
        temp_path = temp_file.name
    
    try:
        # 使用Vosk进行语音识别
        recognized_text = ""
        current_model = get_current_model()
        
        if current_model:
            recognized_text = await recognize_with_vosk(temp_path, language)
            logger.info(f"Vosk识别结果 ({language}): '{recognized_text}'")
        else:
            # Vosk不可用时使用模拟识别
            recognized_text = await simulate_recognition(temp_path, reference_text, language)
            logger.info(f"模拟识别结果 ({language}): '{recognized_text}'")
        
        # 加载音频进行特征分析
        try:
            y, sr = librosa.load(temp_path, sr=16000)
            duration = len(y) / sr
            logger.info(f"音频分析: 时长={duration:.2f}s, 采样率={sr}Hz")
        except Exception as e:
            logger.warning(f"音频加载失败: {e}")
            y, sr, duration = None, 16000, 2.0
        
        # 提取音频特征
        features = {}
        if y is not None:
            features = extract_basic_features(y, sr)
        else:
            features = {
                "duration": duration,
                "rms": 0.1,
                "spectral_centroid": 1000,
                "pitch_std": 10
            }
        
        # 生成分析结果
        analysis_result = generate_analysis_result(
            reference_text, recognized_text, features, user_id, language
        )
        
        return analysis_result
        
    finally:
        # 清理临时文件
        if os.path.exists(temp_path):
            os.unlink(temp_path)

async def recognize_with_vosk(audio_path: str, language: str) -> str:
    """使用Vosk进行语音识别"""
    current_model = get_current_model()
    if not current_model:
        return f"Vosk {language} 模型不可用"
    
    try:
        # 转换音频为WAV格式
        wav_path = convert_to_wav(audio_path)
        if not wav_path:
            return "音频转换失败"
        
        try:
            wf = wave.open(wav_path, 'rb')
            
            # 检查音频格式
            if wf.getnchannels() != 1:
                logger.warning("音频不是单声道，可能影响识别准确性")
            if wf.getsampwidth() != 2:
                logger.warning("音频采样宽度不是16位，可能影响识别准确性")
            if wf.getframerate() not in [8000, 16000]:
                logger.warning(f"音频采样率{wf.getframerate()}Hz不是推荐值(8000或16000Hz)")
            
            # 创建识别器
            rec = vosk.KaldiRecognizer(current_model, wf.getframerate())
            rec.SetWords(True)
            
            # 识别过程
            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    if 'text' in result and result['text']:
                        results.append(result['text'])
                        logger.info(f"部分识别 ({language}): {result['text']}")
            
            # 获取最终结果
            final_result = json.loads(rec.FinalResult())
            if 'text' in final_result and final_result['text']:
                results.append(final_result['text'])
            
            wf.close()
            
            # 合并所有识别结果
            recognized_text = " ".join(results).strip()
            return recognized_text if recognized_text else "未识别到语音"
            
        except Exception as e:
            logger.error(f"Vosk识别过程错误: {e}")
            return f"识别错误: {str(e)}"
        finally:
            if 'wf' in locals():
                wf.close()
            # 清理临时WAV文件
            if os.path.exists(wav_path) and wav_path != audio_path:
                os.unlink(wav_path)
                
    except Exception as e:
        logger.error(f"Vosk识别错误: {e}")
        return f"识别失败: {str(e)}"

def convert_to_wav(audio_path: str) -> str:
    """将音频转换为WAV格式"""
    try:
        # 如果已经是WAV格式，直接返回
        if audio_path.lower().endswith('.wav'):
            return audio_path
            
        # 尝试使用pydub转换
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(audio_path)
            # 转换为单声道，16kHz，16位
            audio = audio.set_channels(1)
            audio = audio.set_frame_rate(16000)
            audio = audio.set_sample_width(2)
            
            wav_path = audio_path + '.wav'
            audio.export(wav_path, format='wav')
            return wav_path
        except ImportError:
            logger.warning("pydub未安装，音频转换功能受限")
            return audio_path
        except Exception as e:
            logger.warning(f"pydub转换失败: {e}")
            return audio_path
            
    except Exception as e:
        logger.error(f"音频转换错误: {e}")
        return audio_path

async def simulate_recognition(audio_path: str, reference_text: str, language: str) -> str:
    """Vosk不可用时的模拟识别"""
    import random
    
    # 基于音频文件的存在性给出不同结果
    if not os.path.exists(audio_path):
        return "音频文件不存在"
    
    # 80%概率正确，20%概率错误
    if random.random() < 0.8:
        return reference_text
    else:
        # 根据语言提供不同的错误模式
        if language == "zh-CN":
            error_patterns = {
                "啊": "阿", "喔": "我", "鹅": "额", "衣": "一", "乌": "无",
                "爸爸": "叭叭", "妈妈": "麻麻", "水": "谁", "饭": "反", "车": "撤",
                "你好": "你号", "谢谢": "些些", "再见": "在见", "请坐": "请做", "对不起": "对不齐"
            }
        else:
            error_patterns = {
                "hello": "hallo", "world": "word", "water": "vater",
                "thank you": "sank you", "goodbye": "good by", "please": "pleas",
                "sorry": "sory", "excuse me": "excuse mi", "how are you": "how are u"
            }
        
        return error_patterns.get(reference_text, reference_text + "?")

def extract_basic_features(y, sr):
    """提取基础音频特征"""
    features = {
        "duration": len(y) / sr,
        "rms": float(np.mean(librosa.feature.rms(y=y))),
        "zero_crossing_rate": float(np.mean(librosa.feature.zero_crossing_rate(y))),
    }
    
    # 提取频谱特征
    try:
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        features["spectral_centroid"] = float(np.mean(spectral_centroid))
    except:
        features["spectral_centroid"] = 1000.0
    
    # 提取基频特征
    try:
        f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=50, fmax=300, sr=sr)
        f0 = f0[~np.isnan(f0)]
        if len(f0) > 0:
            features["pitch_mean"] = float(np.mean(f0))
            features["pitch_std"] = float(np.std(f0))
        else:
            features["pitch_mean"] = 120.0
            features["pitch_std"] = 10.0
    except Exception as e:
        logger.warning(f"基频提取失败: {e}")
        features["pitch_mean"] = 120.0
        features["pitch_std"] = 10.0
    
    return features

def generate_analysis_result(reference_text: str, recognized_text: str, 
                           features: Dict, user_id: str, language: str) -> Dict[str, Any]:
    """生成完整的分析结果"""

       # 规范化文本比较（忽略大小写和首尾空格）
    recognized_text = recognized_text.strip().lower()
    reference_text = reference_text.strip().lower()
    
    # 计算相似度
    similarity = calculate_text_similarity(recognized_text, reference_text)
    
    # 计算基础分数
    base_score = int(similarity * 100)
    
    # 基于音频特征调整分数
    audio_quality_score = calculate_audio_quality_score(features)
    final_score = int((base_score * 0.7) + (audio_quality_score * 0.3))
    
    # 生成问题列表
    issues = generate_issues(recognized_text, reference_text, features, final_score, language)
    
    # 生成建议
    suggestions = generate_suggestions(issues, final_score, language)
    
    return {
        "overall_score": final_score,
        "similarity_score": int(similarity * 100),
        "recognized_text": recognized_text,
        "language": language,
        "issues": issues,
        "suggestions": suggestions,
        "audio_features": {
            "duration": round(features.get("duration", 0), 2),
            "pitch_stability": max(0, min(100, 100 - features.get("pitch_std", 10) * 3)),
            "clarity_score": max(0, min(100, features.get("spectral_centroid", 1000) / 15))
        },
        "improvement_tip": get_improvement_tip(final_score, len(issues), language),
        "personalized_advice": get_personalized_advice(final_score, language),
        "next_exercise_recommendation": get_next_exercise_recommendation(reference_text, final_score, language),
        "recognition_engine": "vosk" if get_current_model() else "simulated"
    }

def calculate_text_similarity(text1: str, text2: str) -> float:
    """计算文本相似度"""
    if not text1 or text1 in ["未识别到语音", "识别失败", "Vosk不可用"]:
        return 0.0
        
    if text1 == text2:
        return 1.0
    
    # 使用编辑距离计算相似度
    from difflib import SequenceMatcher
    return SequenceMatcher(None, text1, text2).ratio()

def calculate_audio_quality_score(features: Dict) -> float:
    """计算音频质量分数"""
    score = 70  # 基础分数
    
    # RMS能量
    rms = features.get("rms", 0)
    if 0.05 <= rms <= 0.2:
        score += 15
    elif rms < 0.05:
        score -= 10
    
    # 频谱质心
    spectral_centroid = features.get("spectral_centroid", 1000)
    if spectral_centroid > 1500:
        score += 10
    elif spectral_centroid < 800:
        score -= 10
    
    # 基频稳定性
    pitch_std = features.get("pitch_std", 10)
    if pitch_std < 5:
        score += 10
    elif pitch_std > 20:
        score -= 10
    
    return max(0, min(100, score))

def generate_issues(recognized_text: str, reference_text: str, 
                   features: Dict, score: int, language: str) -> list:
    """生成问题诊断"""
    issues = []
    
    # 规范化文本比较（忽略大小写和首尾空格）
    normalized_recognized = recognized_text.strip().lower()
    normalized_reference = reference_text.strip().lower()
    
    # 文本不匹配问题
    if normalized_recognized != normalized_reference:
        if recognized_text in ["未识别到语音", "识别失败", "Vosk不可用", "No speech detected", "Recognition failed", "Vosk unavailable"]:
            if language == "zh-CN":
                issues.append({
                    "type": "recognition_failed",
                    "description": "语音识别失败，无法分析发音准确性",
                    "severity": "high"
                })
            else:
                issues.append({
                    "type": "recognition_failed",
                    "description": "Speech recognition failed, unable to analyze pronunciation accuracy",
                    "severity": "high"
                })
        else:
            if language == "zh-CN":
                issues.append({
                    "type": "pronunciation_accuracy",
                    "description": f"识别结果为'{recognized_text}'，与标准文本'{reference_text}'不一致",
                    "severity": "high"
                })
            else:
                issues.append({
                    "type": "pronunciation_accuracy",
                    "description": f"Recognition result '{recognized_text}' does not match reference text '{reference_text}'",
                    "severity": "high"
                })
    else:
        # 即使文本匹配，也要检查大小写差异（作为低严重性问题）
        if recognized_text.strip() != reference_text.strip():
            if language == "zh-CN":
                issues.append({
                    "type": "capitalization",
                    "description": f"发音正确，但大小写需要注意：识别为'{recognized_text}'，标准为'{reference_text}'",
                    "severity": "low"
                })
            else:
                issues.append({
                    "type": "capitalization", 
                    "description": f"Pronunciation is correct, but note capitalization: recognized as '{recognized_text}', standard is '{reference_text}'",
                    "severity": "low"
                })
    
    # 音频质量问题
    rms = features.get("rms", 0)
    if rms < 0.05:
        if language == "zh-CN":
            issues.append({
                "type": "volume",
                "description": "录音音量过低，可能影响识别效果",
                "severity": "medium"
            })
        else:
            issues.append({
                "type": "volume",
                "description": "Recording volume is too low, which may affect recognition accuracy",
                "severity": "medium"
            })
    
    # 基频稳定性问题
    pitch_std = features.get("pitch_std", 10)
    if pitch_std > 15:
        if language == "zh-CN":
            issues.append({
                "type": "pitch_stability",
                "description": "音调波动较大，稳定性需要提高",
                "severity": "medium"
            })
        else:
            issues.append({
                "type": "pitch_stability",
                "description": "Pitch fluctuation is too large, stability needs improvement",
                "severity": "medium"
            })
    
    # 基于分数的通用问题
    if score < 70:
        if language == "zh-CN":
            issues.append({
                "type": "general_pronunciation",
                "description": "整体发音准确性需要提高",
                "severity": "medium"
            })
        else:
            issues.append({
                "type": "general_pronunciation",
                "description": "Overall pronunciation accuracy needs improvement",
                "severity": "medium"
            })
    
    # 语速问题检测
    duration = features.get("duration", 0)
    text_length = len(reference_text)
    if duration > 0 and text_length > 0:
        speaking_rate = text_length / duration
        if language == "zh-CN":
            if speaking_rate > 8:  # 字符/秒，中文语速较快
                issues.append({
                    "type": "speaking_rate",
                    "description": "语速过快，可能导致发音不清晰",
                    "severity": "low"
                })
            elif speaking_rate < 2:  # 字符/秒，中文语速较慢
                issues.append({
                    "type": "speaking_rate", 
                    "description": "语速过慢，影响表达流畅度",
                    "severity": "low"
                })
        else:
            word_count = len(reference_text.split())
            english_speaking_rate = word_count / duration
            if english_speaking_rate > 4:  # 单词/秒，英语语速较快
                issues.append({
                    "type": "speaking_rate",
                    "description": "Speaking rate is too fast, may affect clarity",
                    "severity": "low"
                })
            elif english_speaking_rate < 1.5:  # 单词/秒，英语语速较慢
                issues.append({
                    "type": "speaking_rate",
                    "description": "Speaking rate is too slow, affects fluency",
                    "severity": "low"
                })
    
    # 音频清晰度问题
    spectral_centroid = features.get("spectral_centroid", 1000)
    if language == "zh-CN":
        if spectral_centroid < 800:
            issues.append({
                "type": "clarity",
                "description": "音频清晰度不足，声音较为模糊",
                "severity": "medium"
            })
    else:
        if spectral_centroid < 800:
            issues.append({
                "type": "clarity", 
                "description": "Audio clarity is insufficient, sound is somewhat muffled",
                "severity": "medium"
            })
    
    return issues

def generate_suggestions(issues: list, score: int, language: str) -> list:
    """生成改进建议"""
    suggestions = []
    
    if not issues:
        if language == "zh-CN":
            suggestions.extend([
                "发音优秀，继续保持当前练习节奏",
                "可以尝试更具挑战性的练习内容"
            ])
        else:
            suggestions.extend([
                "Excellent pronunciation! Keep up the good work",
                "Try more challenging exercises"
            ])
    else:
        # 基于问题类型给出建议
        issue_types = [issue["type"] for issue in issues]
        
        if language == "zh-CN":
            if "recognition_failed" in issue_types:
                suggestions.append("请检查录音设备，确保在安静环境下录音")
                suggestions.append("录音时请靠近麦克风，发音清晰明确")
            
            if "pronunciation_accuracy" in issue_types:
                suggestions.append("请仔细听示范发音，注意每个音节的准确性")
                suggestions.append("放慢语速，确保每个字发音清晰")
            
            if "volume" in issue_types:
                suggestions.append("录音时请靠近麦克风，保持适当的音量")
                suggestions.append("确保录音环境安静，减少背景噪音")
            
            if "pitch_stability" in issue_types:
                suggestions.append("练习时注意保持音调稳定")
                suggestions.append("可以尝试用平稳的气息发音")
                
            if "general_pronunciation" in issue_types:
                suggestions.append("建议从基础发音开始，逐步提高难度")
                suggestions.append("多听多模仿标准发音")
        else:
            if "recognition_failed" in issue_types:
                suggestions.append("Please check recording device and ensure quiet environment")
                suggestions.append("Speak clearly and close to the microphone")
            
            if "pronunciation_accuracy" in issue_types:
                suggestions.append("Listen carefully to the example pronunciation")
                suggestions.append("Slow down and pronounce each word clearly")
            
            if "volume" in issue_types:
                suggestions.append("Speak closer to the microphone")
                suggestions.append("Ensure recording environment is quiet")
            
            if "pitch_stability" in issue_types:
                suggestions.append("Practice maintaining stable pitch")
                suggestions.append("Try speaking with steady breath")
                
            if "general_pronunciation" in issue_types:
                suggestions.append("Start with basic sounds and gradually increase difficulty")
                suggestions.append("Listen and imitate native speakers")
    
    # 通用建议
    if language == "zh-CN":
        if score < 80:
            suggestions.append("每天坚持练习15-20分钟，效果会更明显")
        suggestions.append("练习时注意录音回听，自我评估发音效果")
    else:
        if score < 80:
            suggestions.append("Practice 15-20 minutes daily for better results")
        suggestions.append("Listen to your recordings for self-assessment")
    
    return suggestions

def get_improvement_tip(score: int, issue_count: int, language: str) -> str:
    """获取改进提示"""
    if language == "zh-CN":
        if score >= 90:
            return "优秀！发音非常准确"
        elif score >= 80:
            return "良好！继续保持练习"
        elif score >= 70:
            return f"不错！专注改善{issue_count}个问题点"
        elif score >= 60:
            return f"需要加强练习，建议每天练习20分钟"
        else:
            return "建议从基础发音开始系统训练"
    else:
        if score >= 90:
            return "Excellent! Very accurate pronunciation"
        elif score >= 80:
            return "Good! Keep practicing"
        elif score >= 70:
            return f"Not bad! Focus on improving {issue_count} issues"
        elif score >= 60:
            return "Need more practice, recommend 20 minutes daily"
        else:
            return "Recommend starting with basic pronunciation training"

def get_personalized_advice(score: int, language: str) -> list:
    """获取个性化建议"""
    if language == "zh-CN":
        if score >= 85:
            return ["可以挑战更复杂的句子练习", "注意语调的自然流畅"]
        elif score >= 70:
            return ["重点练习发音准确性", "多听多模仿标准发音"]
        else:
            return ["从基础元音开始练习", "放慢语速，确保每个音节清晰"]
    else:
        if score >= 85:
            return ["Challenge yourself with complex sentences", "Focus on natural intonation"]
        elif score >= 70:
            return ["Focus on pronunciation accuracy", "Listen and imitate native speakers"]
        else:
            return ["Start with basic vowel sounds", "Slow down and ensure clear articulation"]

def get_next_exercise_recommendation(current_text: str, score: int, language: str) -> str:
    """获取下一个练习推荐"""
    text_length = len(current_text)
    
    if language == "zh-CN":
        if score < 70:
            return "基础元音练习"
        elif text_length == 1:
            return "双音节词练习"
        elif text_length <= 2:
            return "短语练习"
        else:
            return "句子练习"
    else:
        if score < 70:
            return "Basic Vowel Practice"
        elif text_length == 1:
            return "Two-syllable Word Practice"
        elif text_length <= 2:
            return "Phrase Practice"
        else:
            return "Sentence Practice"

# 用户进度和推荐API
@router.get("/user/progress/{user_id}")
async def get_user_progress(user_id: str):
    """获取用户进度"""
    return {
        "user_id": user_id,
        "total_practices": 12,
        "overall_avg_score": 78,
        "available_languages": list(vosk_models.keys()),
        "current_language": current_language,
        "recent_history": [
            {"date": "2023-11-01", "type": "vowel", "avg_score": 75, "practices": 3},
            {"date": "2023-11-02", "type": "word", "avg_score": 80, "practices": 4},
            {"date": "2023-11-03", "type": "phrase", "avg_score": 79, "practices": 5}
        ],
        "progress_trend": "improving"
    }

@router.get("/exercise/recommendations/{user_id}")
async def get_exercise_recommendations(user_id: str):
    """获取练习推荐"""
    return {
        "recommendations": [
            {"type": "vowel", "reason": "巩固基础元音发音"},
            {"type": "word", "reason": "提升日常词汇发音准确性"},
            {"type": "phrase", "reason": "加强连贯发音能力"}
        ],
        "available_languages": list(vosk_models.keys())
    }

@router.get("/available-languages")
async def get_available_languages():
    """获取可用的语言列表"""
    return {
        "available_languages": list(vosk_models.keys()),
        "current_language": current_language,
        "model_status": {lang: "loaded" for lang in vosk_models.keys()}
    }