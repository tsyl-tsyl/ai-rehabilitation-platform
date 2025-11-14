from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.responses import StreamingResponse 
from pydantic import BaseModel 
import tensorflow as tf 
import numpy as np
import asyncio
import json
import os
import sys
from datetime import datetime
from typing import AsyncGenerator, Optional, List, Dict, Any


    # 如果环境没有 sklearn，提供一个简单的替代实现（基于 numpy）
def train_test_split(X, y, test_size=0.2, random_state=None):
        X = np.asarray(X)
        y = np.asarray(y)
        if random_state is not None:
            np.random.seed(random_state)
        n = X.shape[0]
        idx = np.arange(n)
        np.random.shuffle(idx)
        test_n = int(n * test_size)
        test_idx = idx[:test_n]
        train_idx = idx[test_n:]
        return X[train_idx], X[test_idx], y[train_idx], y[test_idx]
# import matplotlib.pyplot as plt
from io import BytesIO
import base64
#from sklearn.preprocessing import StandardScaler, LabelEncoder
#from sklearn.model_selection import train_test_split

from main_api import app  as main_app

# 添加 aphasia 目录到 Python 路径
current_dir = os.path.dirname(os.path.abspath(__file__))
aphasia_dir = os.path.join(current_dir, 'aphasia')
sys.path.append(aphasia_dir)

from speech_rehab_api  import router as speech_router


# 如果没有独立的 rehabRobotDataProcessor 模块，提供一个最小的实现以便本文件独立运行
class RehabRobotDataProcessor:
    """
    最小替代实现，用于提供本仓库内用到的方法：
    - load_robot_dataset(category)
    - generate_simulated_data(n)
    - create_robot_model(input_dim, num_classes)
    - preprocess_data(x, y)
    - get_data_stats(category)
    - get_feature_importance(features)
    这些实现都是简化版本，能够在没有外部依赖时安全运行并返回合理的占位数据。
    """
    def __init__(self, pose_data_dir: str):
        self.pose_data_dir = pose_data_dir

    def load_robot_dataset(self, category: str):
        # 尝试从文件系统加载已经保存的机器人数据（期望每个样本包含 'features' 和可选 'rehab_stage'）
        category_dir = os.path.join(self.pose_data_dir, category)
        all_features = []
        all_labels = []
        if not os.path.exists(category_dir):
            return None, None

        for date_dir in os.listdir(category_dir):
            date_dir_path = os.path.join(category_dir, date_dir)
            if os.path.isdir(date_dir_path):
                for file in os.listdir(date_dir_path):
                    if file.endswith('.json'):
                        file_path = os.path.join(date_dir_path, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                            for sample in data.get('samples', []):
                                features = sample.get('features') or sample.get('landmarks')
                                # 如果 features 是 dict（landmarks），将其转换为扁平数组
                                if isinstance(features, dict):
                                    # 扁平化数值
                                    flat = []
                                    for v in features.values():
                                        if isinstance(v, dict):
                                            flat.extend([v.get('x', 0.0), v.get('y', 0.0), v.get('z', 0.0)])
                                        elif isinstance(v, (list, tuple)):
                                            flat.extend(v)
                                        else:
                                            flat.append(float(v) if v is not None else 0.0)
                                    features = flat

                                if features:
                                    all_features.append(np.array(features, dtype=np.float32))
                                    # 优先使用 rehab_stage 或 label 字段，否则随机化为 0
                                    label = sample.get('rehab_stage') if isinstance(sample.get('rehab_stage'), int) else sample.get('label')
                                    if label is None:
                                        label = sample.get('rehab_stage', 0)
                                    # 如果仍然不是整数，尝试从字符串映射
                                    if isinstance(label, str):
                                        try:
                                            label = int(label)
                                        except:
                                            label = 0
                                    all_labels.append(int(label) if label is not None else 0)
                        except Exception:
                            continue

        if not all_features:
            return None, None

        features_array = np.vstack([f if f.ndim == 2 else f.reshape(1, -1) for f in all_features]) if all_features and hasattr(all_features[0], 'ndim') else np.array(all_features, dtype=np.float32)
        # 如果上面堆叠得到的维度不正确，进行调整
        if isinstance(features_array, np.ndarray) and features_array.ndim == 1:
            features_array = features_array.reshape(len(all_features), -1)

        labels_array = np.array(all_labels, dtype=np.int32)
        return features_array, labels_array

    def generate_simulated_data(self, n=100, input_dim: int = 128):
        # 返回特征矩阵和稀疏标签（3类）
        x = np.random.rand(n, input_dim).astype(np.float32)
        y = np.random.randint(0, 3, size=(n,))
        return x, y

    def create_robot_model(self, input_dim: int = 128, num_classes: int = 3):
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(input_dim,)),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dense(num_classes, activation='softmax')
        ])
        return model

    def preprocess_data(self, x, y, test_size: float = 0.2):
        # 使用 sklearn 的 train_test_split
        try:
            return train_test_split(x, y, test_size=test_size, random_state=42)
        except Exception:
            # 如果分割失败，简单返回全部作为训练集
            return x, None, y, None

    def get_data_stats(self, category: str):
        # 返回简单的统计信息
        features, labels = self.load_robot_dataset(category)
        total_files = 0
        total_samples = 0
        if features is None:
            return {"total_files": 0, "total_samples": 0, "category": category}
        total_samples = features.shape[0]
        return {"total_files": 1, "total_samples": int(total_samples), "category": category}

    def get_feature_importance(self, features: np.ndarray):
        # 简易的特征重要性：计算每列与标签的绝对相关系数的占位值（如果没有标签则返回均匀分布）
        try:
            if features is None:
                return []
            # 使用方差作为特征重要性代理
            variances = np.var(features, axis=0)
            if np.sum(variances) == 0:
                return [0.0] * features.shape[1]
            importance = (variances / np.sum(variances)).tolist()
            return importance
        except Exception:
            return []

# 启用TensorFlow的eager execution
tf.config.run_functions_eagerly(True)

app = main_app
app.include_router(speech_router)
# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 模型和数据保存目录
BASE_MODEL_DIR = "backend/ml_models"
POSE_DATA_DIR = "backend/pose_data"
CATEGORIES = ["upper_limb", "lower_limb", "aphasia"]

# 确保基础目录和分类目录存在
os.makedirs(BASE_MODEL_DIR, exist_ok=True)
os.makedirs(POSE_DATA_DIR, exist_ok=True)
for category in CATEGORIES:
    os.makedirs(os.path.join(BASE_MODEL_DIR, category), exist_ok=True)
    os.makedirs(os.path.join(POSE_DATA_DIR, category), exist_ok=True)

# 创建康复机器人处理器实例（使用文件内替代实现以避免外部依赖）
robot_processor = RehabRobotDataProcessor(POSE_DATA_DIR)

class TrainRequest(BaseModel):
    lr: float = 0.001
    batch: int = 8
    epoch: int = 5
    model_name: Optional[str] = None
    category: str = "upper_limb"

class ContinueTrainRequest(BaseModel):
    model_name: str
    category: str
    additional_epochs: int = 5
    new_lr: Optional[float] = None

class PoseDataRequest(BaseModel):
    samples: List[Dict[str, Any]]
    action: str
    category: str = "upper_limb"  # 添加category字段，支持前端传入

class RobotTrainRequest(BaseModel):
    lr: float = 0.001
    batch: int = 8
    epoch: int = 5
    model_name: Optional[str] = None
    category: str = "lower_limb"
    use_sequence: bool = False
    sequence_length: int = 10

# ========== 新增：康复预测相关类 ==========
class PredictRequest(BaseModel):
    model_name: str
    category: str
    features: List[float]

class RehabSessionRequest(BaseModel):
    patient_id: str
    exercise_type: str
    duration: int
    repetitions: int
    accuracy: float

class ExerciseFeedback(BaseModel):
    exercise_type: str
    correctness: float
    suggestions: List[str]
    confidence: float

# ========== 动作完成检测器 ==========
class ExerciseCompletionDetector:
    def __init__(self):
        self.rep_thresholds = {
            'shoulder_flexion': 0.7,
            'shoulder_abduction': 0.75,
            'elbow_flexion': 0.65,
            'wrist_flexion': 0.8,
            'arm_rotation': 0.7
        }
        self.consecutive_frames = {}
        self.last_completion_time = {}
        
    def check_completion(self, exercise_type: str, confidence: float, features: List[float]) -> bool:
        """检查动作是否完成一次"""
        threshold = self.rep_thresholds.get(exercise_type, 0.7)
        
        # 检查时间间隔，防止重复计数
        current_time = datetime.now()
        last_time = self.last_completion_time.get(exercise_type)
        if last_time and (current_time - last_time).total_seconds() < 2.0:
            return False
        
        if confidence > threshold:
            # 检查连续高置信度帧数
            if exercise_type not in self.consecutive_frames:
                self.consecutive_frames[exercise_type] = 0
                
            self.consecutive_frames[exercise_type] += 1
            
            # 根据不同动作要求不同的连续帧数
            required_frames = {
                'shoulder_flexion': 5,
                'shoulder_abduction': 6,
                'elbow_flexion': 4,
                'wrist_flexion': 8,
                'arm_rotation': 10
            }.get(exercise_type, 5)
            
            if self.consecutive_frames[exercise_type] >= required_frames:
                self.consecutive_frames[exercise_type] = 0
                self.last_completion_time[exercise_type] = current_time
                return True
        else:
            # 重置计数器
            self.consecutive_frames[exercise_type] = 0
            
        return False

# 创建全局检测器实例
completion_detector = ExerciseCompletionDetector()

def get_model_directory(category: str) -> str:
    """获取模型保存目录"""
    date_str = datetime.now().strftime("%Y%m%d")
    category_dir = os.path.join(BASE_MODEL_DIR, category)
    date_dir = os.path.join(category_dir, f"train_{date_str}")
    os.makedirs(date_dir, exist_ok=True)
    return date_dir

def get_pose_data_directory(category: str) -> str:
    """获取姿态数据保存目录"""
    date_str = datetime.now().strftime("%Y%m%d")
    category_dir = os.path.join(POSE_DATA_DIR, category)
    date_dir = os.path.join(category_dir, f"data_{date_str}")
    os.makedirs(date_dir, exist_ok=True)
    return date_dir

def process_pose_landmarks_to_features(landmarks_dict: Dict, feature_size: int = 128) -> np.ndarray:
    """
    将姿态关键点转换为特征向量（替代图像方法）
    """
    # 提取所有关键点的坐标和可见性
    features = []
    
    # 上肢关键点顺序
    upper_limb_keys = [
        'left_shoulder', 'right_shoulder', 
        'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist',
        'left_hip', 'right_hip'
    ]
    
    for key in upper_limb_keys:
        landmark = landmarks_dict.get(key)
        if landmark:
            features.extend([landmark['x'], landmark['y'], landmark['z'], landmark['visibility']])
        else:
            # 如果关键点缺失，用0填充
            features.extend([0.0, 0.0, 0.0, 0.0])
    
    # 转换为numpy数组并调整大小
    features_array = np.array(features, dtype=np.float32)
    
    # 如果特征长度不够，进行填充
    if len(features_array) < feature_size:
        padding = np.zeros(feature_size - len(features_array), dtype=np.float32)
        features_array = np.concatenate([features_array, padding])
    elif len(features_array) > feature_size:
        features_array = features_array[:feature_size]
    
    return features_array

def load_pose_dataset(category: str):
    """
    加载姿态数据集并转换为特征向量
    """
    # 如果是康复机器人分类，使用专门的处理器
    if category == "lower_limb":
        return robot_processor.load_robot_dataset(category)
    
    # 原有的姿态数据处理逻辑
    category_dir = os.path.join(POSE_DATA_DIR, category)
    all_features = []
    all_labels = []
    
    if not os.path.exists(category_dir):
        return None, None
    
    # 遍历所有数据文件
    for date_dir in os.listdir(category_dir):
        date_dir_path = os.path.join(category_dir, date_dir)
        if os.path.isdir(date_dir_path):
            for file in os.listdir(date_dir_path):
                if file.endswith('.json'):
                    file_path = os.path.join(date_dir_path, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        # 处理每个样本
                        for sample in data.get('samples', []):
                            landmarks = sample.get('landmarks', {})
                            if landmarks:
                                # 将姿态数据转换为特征向量
                                features = process_pose_landmarks_to_features(landmarks)
                                all_features.append(features)
                                
                                # 创建标签（根据动作类型）
                                action_type = data.get('action', 'unknown')
                                # 简单的动作分类：屈曲类为0，其他为1
                                label = 0 if 'flexion' in action_type else 1
                                all_labels.append(label)
                                
                    except Exception as e:
                        print(f"加载数据文件错误 {file_path}: {e}")
    
    if not all_features:
        return None, None
    
    # 转换为numpy数组
    features_array = np.array(all_features, dtype=np.float32)
    labels_array = tf.keras.utils.to_categorical(all_labels, 2)
    
    return features_array, labels_array

def create_feature_based_model(input_dim: int = 128):
    """
    创建基于特征向量的模型（替代图像分类模型）
    """
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(input_dim,)),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(2, activation='softmax')
    ])
    
    return model

# 生成随机样本（备用）
def get_sample_data(n=64):
    """生成随机特征数据（备用）"""
    x = np.random.rand(n, 128).astype(np.float32)  # 128维特征
    y = tf.keras.utils.to_categorical(np.random.randint(2, size=(n,)), 2)
    return x, y

# ========== 新增：模型预测功能 ==========
def get_latest_published_model(category: str = "upper_limb"):
    """获取最新发布的模型"""
    try:
        # 从文件系统获取发布的模型
        published_model_path = os.path.join(BASE_MODEL_DIR, category, "published_model.json")
        
        if os.path.exists(published_model_path):
            with open(published_model_path, 'r') as f:
                published_info = json.load(f)
            
            # 加载实际的模型
            model_data = load_trained_model(category, published_info['model_name'])
            if model_data:
                published_info['model'] = model_data['model']
                return published_info
        else:
            # 如果没有发布的模型，返回最近训练的模型
            return get_recent_model(category)
    except Exception as e:
        print(f"获取发布模型错误: {e}")
        return get_recent_model(category)

def get_recent_model(category: str):
    """获取最近训练的模型"""
    try:
        category_dir = os.path.join(BASE_MODEL_DIR, category)
        if not os.path.exists(category_dir):
            return None
            
        # 获取所有训练日期目录
        date_dirs = [d for d in os.listdir(category_dir) if os.path.isdir(os.path.join(category_dir, d))]
        if not date_dirs:
            return None
            
        # 按日期排序，获取最新的
        date_dirs.sort(reverse=True)
        latest_date_dir = date_dirs[0]
        latest_dir_path = os.path.join(category_dir, latest_date_dir)
        
        # 获取该目录下的所有模型
        model_files = [f for f in os.listdir(latest_dir_path) if f.endswith('.h5')]
        if not model_files:
            return None
            
        # 使用第一个模型
        model_name = model_files[0].replace('.h5', '')
        model_data = load_trained_model(category, model_name)
        
        if model_data:
            return {
                'model_name': model_name,
                'category': category,
                'config': model_data['config'],
                'model_path': model_data['model_path'],
                'model': model_data['model']
            }
        else:
            return None
    except Exception as e:
        print(f"获取最近模型错误: {e}")
        return None

def predict_exercise(model, features: List[float], category: str):
    """使用模型预测康复动作"""
    try:
        # 将特征转换为numpy数组
        features_array = np.array(features, dtype=np.float32).reshape(1, -1)
        
        # 确保特征维度正确
        expected_dim = model.input_shape[1]
        if len(features_array[0]) < expected_dim:
            # 填充特征
            padding = np.zeros(expected_dim - len(features_array[0]))
            features_array = np.concatenate([features_array, padding.reshape(1, -1)], axis=1)
        elif len(features_array[0]) > expected_dim:
            # 截断特征
            features_array = features_array[:, :expected_dim]
        
        # 进行预测
        predictions = model.predict(features_array, verbose=0)
        
        if category == "lower_limb":
            # 康复机器人分类，使用稀疏分类
            predicted_class = int(np.argmax(predictions[0]))
            confidence = float(np.max(predictions[0]))
            
            # 康复阶段映射
            stage_mapping = {
                0: "初期康复",
                1: "中期康复", 
                2: "后期康复"
            }
            
            predicted_label = stage_mapping.get(predicted_class, "未知阶段")
        else:
            # 上肢康复分类
            predicted_class = int(np.argmax(predictions[0]))
            confidence = float(np.max(predictions[0]))
            
            # 动作映射
            action_mapping = {
                0: "屈曲类动作",
                1: "其他动作"
            }
            
            predicted_label = action_mapping.get(predicted_class, "未知动作")
        
        return {
            'predicted_class': predicted_class,
            'predicted_label': predicted_label,
            'confidence': confidence,
            'probabilities': predictions[0].tolist()
        }
        
    except Exception as e:
        print(f"预测错误: {e}")
        return {
            'predicted_class': -1,
            'predicted_label': '预测错误',
            'confidence': 0.0,
            'probabilities': []
        }

def get_exercise_feedback(prediction_result: Dict, expected_exercise: str) -> ExerciseFeedback:
    """根据预测结果生成康复反馈"""
    correctness = prediction_result['confidence']
    suggestions = []
    
    if correctness < 0.5:
        suggestions = [
            "动作准确性较低，请放慢速度",
            "检查姿势是否正确",
            "参考示范视频调整动作"
        ]
    elif correctness < 0.8:
        suggestions = [
            "动作基本正确，可以继续改进",
            "注意动作的完整性",
            "保持稳定的节奏"
        ]
    else:
        suggestions = [
            "动作非常标准！",
            "继续保持当前训练状态",
            "可以适当增加训练强度"
        ]
    
    return ExerciseFeedback(
        exercise_type=expected_exercise,
        correctness=correctness,
        suggestions=suggestions,
        confidence=prediction_result['confidence']
    )

# ========== 新增：康复会话管理 ==========
rehab_sessions = {}

def create_rehab_session(patient_id: str, exercise_type: str) -> str:
    """创建康复会话"""
    session_id = f"{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    rehab_sessions[session_id] = {
        'patient_id': patient_id,
        'exercise_type': exercise_type,
        'start_time': datetime.now().isoformat(),
        'predictions': [],
        'total_predictions': 0,
        'correct_predictions': 0,
        'current_streak': 0,
        'best_streak': 0
    }
    
    return session_id

def update_rehab_session(session_id: str, prediction_result: Dict, is_correct: bool = None):
    """更新康复会话数据"""
    if session_id not in rehab_sessions:
        return False
    
    session = rehab_sessions[session_id]
    session['predictions'].append({
        'timestamp': datetime.now().isoformat(),
        'prediction': prediction_result,
        'is_correct': is_correct
    })
    session['total_predictions'] += 1
    
    if is_correct:
        session['correct_predictions'] += 1
        session['current_streak'] += 1
        session['best_streak'] = max(session['best_streak'], session['current_streak'])
    else:
        session['current_streak'] = 0
    
    return True

def get_session_stats(session_id: str) -> Dict:
    """获取会话统计信息"""
    if session_id not in rehab_sessions:
        return None
    
    session = rehab_sessions[session_id]
    total = session['total_predictions']
    correct = session['correct_predictions']
    
    accuracy = correct / total if total > 0 else 0
    
    return {
        'session_id': session_id,
        'patient_id': session['patient_id'],
        'exercise_type': session['exercise_type'],
        'start_time': session['start_time'],
        'total_predictions': total,
        'correct_predictions': correct,
        'accuracy': accuracy,
        'current_streak': session['current_streak'],
        'best_streak': session['best_streak'],
        'duration_minutes': (datetime.now() - datetime.fromisoformat(session['start_time'])).total_seconds() / 60
    }

# 模型训练逻辑
async def finetune_model(lr: float, batch: int, epoch: int, category: str, model_name: str = None) -> AsyncGenerator[str, None]:
    try:
        # 根据分类加载相应的数据
        x, y = load_pose_dataset(category)
        use_pose_data = x is not None
        
        if not use_pose_data:
            # 根据分类生成不同的模拟数据
            if category == "lower_limb":
                # 使用康复机器人处理器的模拟数据
                x, y = robot_processor.generate_simulated_data(100)
            else:
                # 姿态数据模拟数据：128个特征，2个类别
                x, y = get_sample_data()
            
            yield f"data: {json.dumps({'warning': f'未找到{category}数据，使用模拟数据训练'})}\n\n"
        
        if x is None or len(x) == 0:
            yield f"data: {json.dumps({'error': f'没有可用的{category}训练数据'})}\n\n"
            return
        
        # 根据分类创建相应的模型
        if category == "lower_limb":
            # 康复机器人专用模型 - 明确指定3个类别
            num_classes = 3  # 康复机器人有3个康复阶段
            model = robot_processor.create_robot_model(
                input_dim=x.shape[1], 
                num_classes=num_classes
            )
            model_architecture = 'Robot Rehabilitation DNN'
            
            # 验证标签范围
            if y is not None:
                unique_labels = np.unique(y)
                print(f"康复机器人数据 - 唯一标签: {unique_labels}, 标签范围: {np.min(y)} 到 {np.max(y)}")
                
                # 确保所有标签都在有效范围内
                if np.max(y) >= num_classes:
                    print(f"警告: 发现超出范围的标签 {np.max(y)}，最大允许 {num_classes-1}")
                    # 修正标签范围
                    y = np.clip(y, 0, num_classes-1)
                    print(f"修正后标签范围: {np.min(y)} 到 {np.max(y)}")
            
            # 康复机器人使用 sparse_categorical_crossentropy
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
                loss='sparse_categorical_crossentropy',
                metrics=['accuracy']
            )
            
            # 康复机器人数据分割
            X_train, X_test, y_train, y_test = robot_processor.preprocess_data(x, y)
        else:
            # 原有的姿态数据模型
            model = create_feature_based_model(input_dim=x.shape[1])
            model_architecture = 'Feature-based DNN'
            
            # 姿态数据使用 categorical_crossentropy
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            
            # 姿态数据分割
            X_train, X_test, y_train, y_test = train_test_split(
                x, y, test_size=0.2, random_state=42
            )
        
        # 检查数据分割结果
        if X_train is None:
            yield f"data: {json.dumps({'error': '数据预处理失败'})}\n\n"
            return
        
        # 存储训练历史
        training_history = {
            'loss': [],
            'accuracy': [],
            'val_loss': [],
            'val_accuracy': [],
            'epochs': [],
            'timestamps': []
        }
        
        # 训练过程
        for i in range(epoch):
            hist = model.fit(X_train, y_train, batch_size=batch, epochs=1, verbose=0, validation_data=(X_test, y_test))
            loss = float(hist.history['loss'][0])
            accuracy = float(hist.history['accuracy'][0])
            val_loss = float(hist.history.get('val_loss', [0])[0])
            val_accuracy = float(hist.history.get('val_accuracy', [0])[0])
            
            # 更新训练历史
            training_history['loss'].append(loss)
            training_history['accuracy'].append(accuracy)
            training_history['val_loss'].append(val_loss)
            training_history['val_accuracy'].append(val_accuracy)
            training_history['epochs'].append(i + 1)
            training_history['timestamps'].append(datetime.now().isoformat())
            
            # 实时返回训练进度
            progress_data = {
                'epoch': i + 1,
                'loss': loss,
                'accuracy': accuracy,
                'val_loss': val_loss,
                'val_accuracy': val_accuracy,
                'total_epochs': epoch,
                'progress': (i + 1) / epoch * 100,
                'data_source': 'real_data' if use_pose_data else 'synthetic',
                'category': category
            }
            yield f"data: {json.dumps(progress_data)}\n\n"
            await asyncio.sleep(0.1)
        
        # 保存模型
        if model_name is None:
            model_name = f"{category}_model_{datetime.now().strftime('%H%M%S')}"
        
        model_dir = get_model_directory(category)
        model_save_path = os.path.join(model_dir, f"{model_name}.h5")
        model.save(model_save_path)
        
        # 保存训练历史
        history_save_path = os.path.join(model_dir, f"{model_name}_history.json")
        with open(history_save_path, 'w') as f:
            json.dump(training_history, f, indent=2)
        
        # 保存训练配置
        training_config = {
            'learning_rate': lr,
            'batch_size': batch,
            'epochs': epoch,
            'model_name': model_name,
            'category': category,
            'training_date': datetime.now().isoformat(),
            'final_loss': training_history['loss'][-1],
            'final_accuracy': training_history['accuracy'][-1],
            'final_val_loss': training_history['val_loss'][-1],
            'final_val_accuracy': training_history['val_accuracy'][-1],
            'model_architecture': model_architecture,
            'data_source': 'real_data' if use_pose_data else 'synthetic',
            'training_samples': len(X_train),
            'input_dimension': x.shape[1],
            'num_classes': 3 if category == "lower_limb" else 2  # 明确记录类别数
        }
        
        config_save_path = os.path.join(model_dir, f"{model_name}_config.json")
        with open(config_save_path, 'w') as f:
            json.dump(training_config, f, indent=2)
        
        # 返回最终结果
        final_result = {
            'status': 'completed',
            'message': f'{category}模型训练完成并保存',
            'model_saved_path': model_save_path,
            'history_saved_path': history_save_path,
            'config_saved_path': config_save_path,
            'final_loss': training_history['loss'][-1],
            'final_accuracy': training_history['accuracy'][-1],
            'final_val_loss': training_history['val_loss'][-1],
            'final_val_accuracy': training_history['val_accuracy'][-1],
            'training_history': training_history,
            'training_samples': len(X_train),
            'training_config': training_config
        }
        yield f"data: {json.dumps(final_result)}\n\n"
    
    except Exception as e:
        error_msg = f"训练过程中发生错误: {str(e)}"
        print(error_msg)
        yield f"data: {json.dumps({'error': error_msg})}\n\n"

# 加载已训练模型
def load_trained_model(category: str, model_name: str):
    """加载之前训练好的模型和配置"""
    # 搜索所有日期目录找到模型
    category_dir = os.path.join(BASE_MODEL_DIR, category)
    model_found = False
    model_path = ""
    
    for date_dir in os.listdir(category_dir):
        date_dir_path = os.path.join(category_dir, date_dir)
        if os.path.isdir(date_dir_path):
            potential_model_path = os.path.join(date_dir_path, f"{model_name}.h5")
            if os.path.exists(potential_model_path):
                model_path = potential_model_path
                model_found = True
                model_dir = date_dir_path
                break
    
    if not model_found:
        return None
    
    history_path = os.path.join(model_dir, f"{model_name}_history.json")
    config_path = os.path.join(model_dir, f"{model_name}_config.json")
    
    result = {
        'model_path': model_path,
        'history_path': history_path,
        'config_path': config_path,
        'model_dir': model_dir,
        'model': None,
        'history': {},
        'config': {}
    }
    
    try:
        # 加载模型
        result['model'] = tf.keras.models.load_model(model_path)
        
        # 加载训练历史
        if os.path.exists(history_path):
            with open(history_path, 'r') as f:
                result['history'] = json.load(f)
        
        # 加载配置
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                result['config'] = json.load(f)
                
    except Exception as e:
        print(f"加载模型失败: {e}")
        return None
    
    return result

# 继续训练功能
async def continue_training(model_name: str, category: str, additional_epochs: int = 5, new_lr: float = None) -> AsyncGenerator[str, None]:
    """在已有模型基础上继续训练"""
    try:
        # 加载现有模型
        model_data = load_trained_model(category, model_name)
        if model_data is None:
            yield f"data: {json.dumps({'error': '模型不存在'})}\n\n"
            return
        
        model = model_data['model']
        existing_history = model_data['history'].copy()
        
        # 加载数据
        x, y = load_pose_dataset(category)
        if x is None:
            # 根据分类生成不同的模拟数据
            if category == "lower_limb":
                x, y = robot_processor.generate_simulated_data(100)
            else:
                x, y = get_sample_data()
        
        # 修复：重新编译模型以重置优化器状态
        current_lr = new_lr if new_lr is not None else model_data['config'].get('learning_rate', 0.001)
        
        # 根据分类使用不同的损失函数
        if category == "lower_limb":
            loss_function = 'sparse_categorical_crossentropy'
            # 康复机器人数据分割
            X_train, X_test, y_train, y_test = robot_processor.preprocess_data(x, y)
            
            # 验证标签范围
            if y_train is not None:
                unique_labels = np.unique(y_train)
                print(f"继续训练 - 康复机器人标签范围: {np.min(y_train)} 到 {np.max(y_train)}")
                
                # 确保模型输出层与数据类别匹配
                model_output_shape = model.output_shape[-1]
                if model_output_shape != 3:
                    print(f"警告: 模型输出层有 {model_output_shape} 个神经元，但康复机器人需要3个类别")
                    # 如果模型结构不匹配，需要重新创建模型
                    model = robot_processor.create_robot_model(
                        input_dim=x.shape[1], 
                        num_classes=3
                    )
                    print("已重新创建康复机器人模型")
        else:
            loss_function = 'categorical_crossentropy'
            # 姿态数据分割
            X_train, X_test, y_train, y_test = train_test_split(
                x, y, test_size=0.2, random_state=42
            )
        
        # 检查数据分割结果
        if X_train is None:
            yield f"data: {json.dumps({'error': '数据预处理失败'})}\n\n"
            return
        
        # 创建新的优化器，避免状态不匹配问题
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=current_lr),
            loss=loss_function,
            metrics=['accuracy']
        )
        
        # 继续训练
        for i in range(additional_epochs):
            hist = model.fit(X_train, y_train, batch_size=32, epochs=1, verbose=0, validation_data=(X_test, y_test))
            loss = float(hist.history['loss'][0])
            accuracy = float(hist.history['accuracy'][0])
            val_loss = float(hist.history.get('val_loss', [0])[0])
            val_accuracy = float(hist.history.get('val_accuracy', [0])[0])
            
            # 更新训练历史
            current_epoch = len(existing_history.get('loss', [])) + i + 1
            existing_history.setdefault('loss', []).append(loss)
            existing_history.setdefault('accuracy', []).append(accuracy)
            existing_history.setdefault('val_loss', []).append(val_loss)
            existing_history.setdefault('val_accuracy', []).append(val_accuracy)
            existing_history.setdefault('epochs', []).append(current_epoch)
            existing_history.setdefault('timestamps', []).append(datetime.now().isoformat())
            
            progress_data = {
                'epoch': i + 1,
                'total_epochs': additional_epochs,
                'loss': loss,
                'accuracy': accuracy,
                'val_loss': val_loss,
                'val_accuracy': val_accuracy,
                'progress': (i + 1) / additional_epochs * 100,
                'current_total_epochs': current_epoch,
                'category': category
            }
            yield f"data: {json.dumps(progress_data)}\n\n"
            await asyncio.sleep(0.1)
        
        # 保存更新后的模型和历史
        continued_model_name = f"{model_name}_continued_{datetime.now().strftime('%H%M%S')}"
        model_dir = get_model_directory(category)
        model.save(os.path.join(model_dir, f"{continued_model_name}.h5"))
        
        # 更新配置
        updated_config = model_data['config'].copy()
        updated_config['continued_from'] = model_name
        updated_config['additional_epochs'] = additional_epochs
        updated_config['final_loss'] = existing_history['loss'][-1]
        updated_config['final_accuracy'] = existing_history['accuracy'][-1]
        updated_config['final_val_loss'] = existing_history['val_loss'][-1]
        updated_config['final_val_accuracy'] = existing_history['val_accuracy'][-1]
        updated_config['continued_date'] = datetime.now().isoformat()
        updated_config['learning_rate'] = current_lr
        
        with open(os.path.join(model_dir, f"{continued_model_name}_config.json"), 'w') as f:
            json.dump(updated_config, f, indent=2)
        
        with open(os.path.join(model_dir, f"{continued_model_name}_history.json"), 'w') as f:
            json.dump(existing_history, f, indent=2)
        
        final_result = {
            'status': 'continued_completed',
            'message': '继续训练完成',
            'continued_model_name': continued_model_name,
            'final_loss': existing_history['loss'][-1],
            'final_accuracy': existing_history['accuracy'][-1],
            'final_val_loss': existing_history['val_loss'][-1],
            'final_val_accuracy': existing_history['val_accuracy'][-1]
        }
        yield f"data: {json.dumps(final_result)}\n\n"
    
    except Exception as e:
        error_msg = f"继续训练过程中发生错误: {str(e)}"
        print(error_msg)
        yield f"data: {json.dumps({'error': error_msg})}\n\n"

# ========== 新增：康复预测API端点 ==========
@app.post("/predict")
async def predict_rehab_exercise(request: PredictRequest):
    """康复动作预测端点"""
    try:
        print(f"收到预测请求: 分类={request.category}, 特征维度={len(request.features)}")
        
        # 获取模型信息
        model_info = None
        
        # 首先尝试使用指定的模型
        if request.model_name:
            model_data = load_trained_model(request.category, request.model_name)
            if model_data:
                model_info = model_data
            else:
                return {"error": f"指定模型 {request.model_name} 不存在"}
        else:
            # 使用最新发布的模型
            model_info = get_latest_published_model(request.category)
            if not model_info:
                return {"error": f"未找到{request.category}分类的可用模型"}
        
        if not model_info or not model_info.get('model'):
            return {"error": "模型加载失败"}
        
        # 进行预测
        prediction_result = predict_exercise(
            model_info['model'], 
            request.features, 
            request.category
        )
        
        print(f"预测结果: 类别={prediction_result['predicted_class']}, 置信度={prediction_result['confidence']:.3f}")
        
        return {
            "status": "success",
            "prediction": prediction_result,
            "model_used": model_info.get('model_name', 'unknown'),
            "category": request.category
        }
        
    except Exception as e:
        print(f"预测过程中发生错误: {str(e)}")
        return {"error": f"预测过程中发生错误: {str(e)}"}

@app.post("/predict_with_completion")
async def predict_with_completion(request: PredictRequest):
    """带动作完成检测的预测端点"""
    try:
        # 获取模型信息
        model_info = get_latest_published_model(request.category)
        if not model_info or not model_info.get('model'):
            return {"error": "模型加载失败"}
        
        # 进行预测
        prediction_result = predict_exercise(
            model_info['model'], 
            request.features, 
            request.category
        )
        
        # 检测动作是否完成
        is_completed = False
        if prediction_result['confidence'] > 0.5:  # 基本置信度阈值
            # 这里需要从前端传递exercise_type
            # 在实际应用中，应该从前端传递当前训练的动作类型
            exercise_type = getattr(request, 'exercise_type', 'shoulder_flexion')
            is_completed = completion_detector.check_completion(
                exercise_type,
                prediction_result['confidence'],
                request.features
            )
        
        return {
            "status": "success",
            "prediction": prediction_result,
            "is_completed": is_completed,
            "model_used": model_info.get('model_name', 'unknown'),
            "category": request.category
        }
        
    except Exception as e:
        return {"error": f"预测过程中发生错误: {str(e)}"}

@app.post("/create_rehab_session")
async def create_rehab_session_endpoint(request: RehabSessionRequest):
    """创建康复会话"""
    try:
        session_id = create_rehab_session(
            request.patient_id,
            request.exercise_type
        )
        
        return {
            "status": "success",
            "session_id": session_id,
            "message": "康复会话创建成功"
        }
    except Exception as e:
        return {"error": f"创建康复会话失败: {str(e)}"}

@app.post("/update_rehab_session/{session_id}")
async def update_rehab_session_endpoint(session_id: str, prediction_result: Dict, is_correct: bool = None):
    """更新康复会话"""
    try:
        success = update_rehab_session(session_id, prediction_result, is_correct)
        
        if success:
            return {
                "status": "success",
                "message": "会话更新成功"
            }
        else:
            return {"error": "会话不存在"}
    except Exception as e:
        return {"error": f"更新会话失败: {str(e)}"}

@app.get("/rehab_session/{session_id}")
async def get_rehab_session_endpoint(session_id: str):
    """获取康复会话统计信息"""
    try:
        stats = get_session_stats(session_id)
        
        if stats:
            return {
                "status": "success",
                "session_stats": stats
            }
        else:
            return {"error": "会话不存在"}
    except Exception as e:
        return {"error": f"获取会话信息失败: {str(e)}"}

@app.get("/published_model")
async def get_published_model(category: str = "upper_limb"):
    """获取已发布的模型信息"""
    try:
        model_info = get_latest_published_model(category)
        
        if model_info:
            return {
                "status": "success",
                "published_model": {
                    'model_name': model_info.get('model_name'),
                    'category': model_info.get('category'),
                    'config': model_info.get('config', {})
                }
            }
        else:
            return {"error": f"未找到{category}分类的发布模型"}
    except Exception as e:
        return {"error": f"获取发布模型失败: {str(e)}"}

@app.post("/publish_model")
async def publish_model(category: str, model_name: str):
    """发布模型到康复系统"""
    try:
        # 验证模型存在
        model_data = load_trained_model(category, model_name)
        if not model_data:
            return {"error": "模型不存在"}
        
        # 保存发布信息
        published_info = {
            'model_name': model_name,
            'category': category,
            'published_date': datetime.now().isoformat(),
            'config': model_data['config']
        }
        
        published_model_path = os.path.join(BASE_MODEL_DIR, category, "published_model.json")
        with open(published_model_path, 'w') as f:
            json.dump(published_info, f, indent=2)
        
        return {
            "status": "success",
            "message": f"模型 {model_name} 已成功发布到 {category} 康复系统",
            "published_info": published_info
        }
    except Exception as e:
        return {"error": f"发布模型失败: {str(e)}"}

# ========== 原有API端点 ==========
@app.post("/save_pose_data")
async def save_pose_data(request: PoseDataRequest):
    """保存前端采集的姿态数据"""
    try:
        # 使用前端传入的 category 参数
        category = request.category
        
        # 验证 category 是否有效
        if category not in CATEGORIES:
            return {
                "status": "error", 
                "message": f"无效的分类: {category}，必须是以下之一: {CATEGORIES}"
            }
        
        # 创建保存目录（使用传入的 category）
        data_dir = get_pose_data_directory(category)
        timestamp = datetime.now().strftime("%H%M%S")
        filename = f"{request.action}_{timestamp}.json"
        file_path = os.path.join(data_dir, filename)
        
        # 保存数据
        data_to_save = {
            'action': request.action,
            'category': category,  # 保存分类信息
            'samples': request.samples,
            'collection_time': datetime.now().isoformat(),
            'total_samples': len(request.samples)
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, indent=2, ensure_ascii=False)
        
        return {
            "status": "success",
            "message": f"成功保存 {len(request.samples)} 个样本到 {category} 分类",
            "file_path": file_path,
            "action": request.action,
            "category": category
        }
        
    except Exception as e:
        return {"status": "error", "message": f"保存数据失败: {str(e)}"}

@app.post("/train")
async def train_model(request: TrainRequest):
    """训练新模型"""
    if request.category not in CATEGORIES:
        return {"error": f"分类必须是以下之一: {CATEGORIES}"}
    
    return StreamingResponse(
        finetune_model(request.lr, request.batch, request.epoch, request.category, request.model_name),
        media_type="text/plain"
    )

@app.post("/continue_train")
async def continue_train_model(request: ContinueTrainRequest):
    """继续训练现有模型"""
    if request.category not in CATEGORIES:
        return {"error": f"分类必须是以下之一: {CATEGORIES}"}
    
    return StreamingResponse(
        continue_training(request.model_name, request.category, request.additional_epochs, request.new_lr),
        media_type="text/plain"
    )

@app.get("/models")
async def list_models(category: Optional[str] = None):
    """列出所有已保存的模型"""
    models = []

    # 只查找指定分类目录，未传参时返回空列表
    models = []
    if category:
        if category not in CATEGORIES:
            return {"error": f"分类必须是以下之一: {CATEGORIES}"}
        category_dir = os.path.join(BASE_MODEL_DIR, category)
        if not os.path.exists(category_dir):
            return {"models": []}
        for date_dir in os.listdir(category_dir):
            date_dir_path = os.path.join(category_dir, date_dir)
            if os.path.isdir(date_dir_path):
                for file in os.listdir(date_dir_path):
                    if file.endswith('.h5') and not file.endswith('_continued.h5'):
                        model_name = file.replace('.h5', '')
                        config_path = os.path.join(date_dir_path, f"{model_name}_config.json")
                        config = {}
                        if os.path.exists(config_path):
                            with open(config_path, 'r') as f:
                                config = json.load(f)
                        models.append({
                            'name': model_name,
                            'category': category,
                            'date_dir': date_dir,
                            'config': config
                        })
        return {"models": models}
    else:
        # 未传 category 参数时返回空列表，防止返回所有分类
        return {"models": []}

@app.get("/model/{category}/{model_name}")
async def get_model_info(category: str, model_name: str):
    """获取特定模型的详细信息"""
    if category not in CATEGORIES:
        return {"error": f"分类必须是以下之一: {CATEGORIES}"}
    
    model_data = load_trained_model(category, model_name)
    if model_data is None:
        return {"error": "模型不存在"}
    
    return {
        "model_info": model_data['config'], 
        "training_history": model_data['history']
    }

@app.delete("/model/{category}/{model_name}")
async def delete_model(category: str, model_name: str):
    """删除模型"""
    if category not in CATEGORIES:
        return {"error": f"分类必须是以下之一: {CATEGORIES}"}
    
    try:
        model_data = load_trained_model(category, model_name)
        if model_data is None:
            return {"error": "模型不存在"}
        
        files_to_delete = [
            model_data['model_path'],
            model_data['history_path'], 
            model_data['config_path']
        ]
        
        deleted_files = []
        for file_path in files_to_delete:
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted_files.append(file_path)
        
        return {"message": "模型已删除", "deleted_files": deleted_files}
    except Exception as e:
        return {"error": f"删除失败: {str(e)}"}

from fastapi import Request  
@app.get("/pose_data_stats")
async def get_pose_data_stats(request: Request, category: str = "upper_limb", detail: str = "0"):
    """获取姿态数据统计信息，detail=1/true 时返回详细内容"""
    try: 
        # 验证分类参数
        if category not in CATEGORIES:
            return {"status": "error", "message": f"无效的分类: {category}"}

        detail_flag = str(detail).lower() in ("1", "true", "yes")

        # lower_limb 分类详细数据
        if category == "lower_limb":
            stats = robot_processor.get_data_stats(category)
            files_detail = []
            latest_sample = None
            latest_mtime = None
            category_dir = os.path.join(POSE_DATA_DIR, category)
            if os.path.exists(category_dir):
                for date_dir in os.listdir(category_dir):
                    date_dir_path = os.path.join(category_dir, date_dir)
                    if os.path.isdir(date_dir_path):
                        for file in os.listdir(date_dir_path):
                            if file.endswith('.json'):
                                file_path = os.path.join(date_dir_path, file)
                                try:
                                    with open(file_path, 'r', encoding='utf-8') as f:
                                        data = json.load(f)
                                    action = data.get('action', 'unknown')
                                    samples_count = data.get('total_samples', 0)
                                    mtime = os.path.getmtime(file_path)
                                    if latest_mtime is None or mtime > latest_mtime:
                                        latest_mtime = mtime
                                        latest_sample = {
                                            "file_name": file,
                                            "action": action,
                                            "count": samples_count,
                                            "category": category
                                        }
                                    if detail_flag:
                                        file_info = {
                                            "filename": file,
                                            "action": action,
                                            "total_samples": samples_count,
                                            "category": category,
                                            "samples": []
                                        }
                                        for s in data.get('samples', []):
                                            sample_info = {
                                                "collection_time": s.get('collection_time', data.get('collection_time', None)),
                                                "features": s.get('features', []),
                                                "rehab_stage": s.get('rehab_stage', ''),
                                            }
                                            file_info["samples"].append(sample_info)
                                        files_detail.append(file_info)
                                except Exception as e:
                                    print(f"读取康复机器人数据文件错误 {file_path}: {e}")
            if detail_flag:
                stats["files"] = files_detail
            stats["latest_sample"] = latest_sample
            return stats

        # 原有的姿态数据统计逻辑
        category_dir = os.path.join(POSE_DATA_DIR, category)
        stats = {
            "total_files": 0,
            "total_samples": 0,
            "actions": {},
            "category": category
        }

        files_detail = []
        latest_sample = None
        latest_mtime = None

        if not os.path.exists(category_dir):
            if detail_flag:
                stats["files"] = files_detail
            stats["latest_sample"] = latest_sample
            return stats

        for date_dir in os.listdir(category_dir):
            date_dir_path = os.path.join(category_dir, date_dir)
            if os.path.isdir(date_dir_path):
                for file in os.listdir(date_dir_path):
                    if file.endswith('.json'):
                        stats["total_files"] += 1
                        file_path = os.path.join(date_dir_path, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                data = json.load(f)

                            action = data.get('action', 'unknown')
                            samples_count = data.get('total_samples', 0)
                            stats["total_samples"] += samples_count

                            if action not in stats["actions"]:
                                stats["actions"][action] = 0
                            stats["actions"][action] += samples_count

                            mtime = os.path.getmtime(file_path)
                            if latest_mtime is None or mtime > latest_mtime:
                                latest_mtime = mtime
                                latest_sample = {
                                    "file_name": file,
                                    "action": action,
                                    "count": samples_count,
                                    "category": category
                                }

                            if detail_flag:
                                file_info = {
                                    "filename": file,
                                    "action": action,
                                    "total_samples": samples_count,
                                    "category": category,
                                    "samples": []
                                }
                                for s in data.get('samples', []):
                                    sample_info = {
                                        "collection_time": s.get('collection_time', data.get('collection_time', None)),
                                        "landmarks": s.get('landmarks', {})
                                    }
                                    file_info["samples"].append(sample_info)
                                files_detail.append(file_info)
                        except Exception as e:
                            print(f"读取数据文件错误 {file_path}: {e}")

        if detail_flag:
            stats["files"] = files_detail
        stats["latest_sample"] = latest_sample
        return stats

    except Exception as e:
        return {"status": "error", "message": f"获取统计信息失败: {str(e)}"}

@app.get("/robot_data_stats")
async def get_robot_data_stats():
    """获取康复机器人数据统计信息（专用端点）"""
    return robot_processor.get_data_stats("lower_limb")

@app.get("/robot_feature_importance")
async def get_robot_feature_importance():
    """获取康复机器人特征重要性"""
    try:
        features, labels = robot_processor.load_robot_dataset("lower_limb")
        if features is None:
            # 使用模拟数据计算特征重要性
            features, labels = robot_processor.generate_simulated_data(100)
        
        importance = robot_processor.get_feature_importance(features)
        return {
            "status": "success",
            "feature_importance": importance
        }
    except Exception as e:
        return {"status": "error", "message": f"计算特征重要性失败: {str(e)}"}

@app.get("/categories")
async def get_categories():
    """获取所有可用的分类"""
    return {"categories": CATEGORIES}

@app.get("/")
async def root():
    return {"message": "康复训练模型API服务运行中", "version": "2.0", "categories": CATEGORIES}

if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(app, host="127.0.0.1", port=8002)