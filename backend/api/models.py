from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

# 康复阶段模型
class RehabilitationStageCreate(BaseModel):
    patient_id: int = Field(..., description="患者ID")
    stage_name: str = Field(..., min_length=1, max_length=100, description="阶段名称")
    stage_number: Optional[int] = Field(None, description="阶段编号")
    start_date: Optional[date] = Field(None, description="开始日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    target_goals: Optional[str] = Field(None, description="目标目标")
    current_progress: Optional[int] = Field(None, ge=0, le=100, description="当前进度")
    status: Optional[str] = Field("active", description="状态")
    weeks_completed: Optional[int] = Field(None, description="已完成周数")
    weeks_remaining: Optional[int] = Field(None, description="剩余周数")
    weekly_focus: Optional[str] = Field(None, description="本周重点")
    training_intensity: Optional[str] = Field(None, description="训练强度")
    next_evaluation_date: Optional[date] = Field(None, description="下次评估日期")

class RehabilitationStageUpdate(BaseModel):
    stage_name: Optional[str] = Field(None, min_length=1, max_length=100)
    stage_number: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_goals: Optional[str] = None
    current_progress: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[str] = None
    weeks_completed: Optional[int] = None
    weeks_remaining: Optional[int] = None
    weekly_focus: Optional[str] = None
    training_intensity: Optional[str] = None
    next_evaluation_date: Optional[date] = None

class RehabilitationStageResponse(BaseModel):
    id: int
    patient_id: int
    stage_name: str
    stage_number: Optional[int]
    start_date: Optional[date]
    end_date: Optional[date]
    target_goals: Optional[str]
    current_progress: Optional[int]
    status: Optional[str]
    weeks_completed: Optional[int]
    weeks_remaining: Optional[int]
    weekly_focus: Optional[str]
    training_intensity: Optional[str]
    next_evaluation_date: Optional[date]
    created_at: Optional[str]

# 关节活动度模型
class JointROMCreate(BaseModel):
    patient_id: int = Field(..., description="患者ID")
    record_date: date = Field(..., description="记录日期")
    left_hip: Optional[int] = Field(None, ge=0, le=180, description="左髋活动度")
    right_hip: Optional[int] = Field(None, ge=0, le=180, description="右髋活动度")
    left_knee: Optional[int] = Field(None, ge=0, le=180, description="左膝活动度")
    right_knee: Optional[int] = Field(None, ge=0, le=180, description="右膝活动度")
    left_ankle: Optional[int] = Field(None, ge=0, le=180, description="左踝活动度")
    right_ankle: Optional[int] = Field(None, ge=0, le=180, description="右踝活动度")
    left_hip_change: Optional[int] = Field(None, description="左髋变化")
    right_hip_change: Optional[int] = Field(None, description="右髋变化")
    left_knee_change: Optional[int] = Field(None, description="左膝变化")
    right_knee_change: Optional[int] = Field(None, description="右膝变化")
    left_ankle_change: Optional[int] = Field(None, description="左踝变化")
    right_ankle_change: Optional[int] = Field(None, description="右踝变化")

class JointROMUpdate(BaseModel):
    record_date: Optional[date] = None
    left_hip: Optional[int] = Field(None, ge=0, le=180)
    right_hip: Optional[int] = Field(None, ge=0, le=180)
    left_knee: Optional[int] = Field(None, ge=0, le=180)
    right_knee: Optional[int] = Field(None, ge=0, le=180)
    left_ankle: Optional[int] = Field(None, ge=0, le=180)
    right_ankle: Optional[int] = Field(None, ge=0, le=180)
    left_hip_change: Optional[int] = None
    right_hip_change: Optional[int] = None
    left_knee_change: Optional[int] = None
    right_knee_change: Optional[int] = None
    left_ankle_change: Optional[int] = None
    right_ankle_change: Optional[int] = None

class JointROMResponse(BaseModel):
    id: int
    patient_id: int
    record_date: date
    left_hip: Optional[int]
    right_hip: Optional[int]
    left_knee: Optional[int]
    right_knee: Optional[int]
    left_ankle: Optional[int]
    right_ankle: Optional[int]
    left_hip_change: Optional[int]
    right_hip_change: Optional[int]
    left_knee_change: Optional[int]
    right_knee_change: Optional[int]
    left_ankle_change: Optional[int]
    right_ankle_change: Optional[int]
    created_at: Optional[str]

# 康复进度模型
class RehabilitationProgressCreate(BaseModel):
    patient_id: int = Field(..., description="患者ID")
    record_date: date = Field(..., description="记录日期")
    week_number: int = Field(..., ge=1, description="周数")
    overall_progress: int = Field(..., ge=0, le=100, description="整体进度")
    joint_mobility_progress: int = Field(..., ge=0, le=100, description="关节活动度进度")
    muscle_strength_progress: int = Field(..., ge=0, le=100, description="肌力恢复进度")
    balance_ability_progress: int = Field(..., ge=0, le=100, description="平衡能力进度")
    training_duration: Optional[int] = Field(None, description="训练时长")
    training_steps: Optional[int] = Field(None, description="训练步数")
    performance_score: Optional[int] = Field(None, ge=0, le=100, description="表现评分")
    notes: Optional[str] = Field(None, description="备注")

class RehabilitationProgressUpdate(BaseModel):
    record_date: Optional[date] = None
    week_number: Optional[int] = Field(None, ge=1)
    overall_progress: Optional[int] = Field(None, ge=0, le=100)
    joint_mobility_progress: Optional[int] = Field(None, ge=0, le=100)
    muscle_strength_progress: Optional[int] = Field(None, ge=0, le=100)
    balance_ability_progress: Optional[int] = Field(None, ge=0, le=100)
    training_duration: Optional[int] = None
    training_steps: Optional[int] = None
    performance_score: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None

class RehabilitationProgressResponse(BaseModel):
    id: int
    patient_id: int
    record_date: date
    week_number: int
    overall_progress: int
    joint_mobility_progress: int
    muscle_strength_progress: int
    balance_ability_progress: int
    training_duration: Optional[int]
    training_steps: Optional[int]
    performance_score: Optional[int]
    notes: Optional[str]
    created_at: Optional[str]

# 训练计划模型
class TrainingPlanCreate(BaseModel):
    patient_id: int = Field(..., description="患者ID")
    stage_id: int = Field(..., description="康复阶段ID")
    name: str = Field(..., min_length=1, max_length=200, description="计划名称")
    start_date: date = Field(..., description="开始日期")
    end_date: date = Field(..., description="结束日期")
    weekly_sessions: int = Field(..., ge=1, le=7, description="每周训练次数")
    session_duration: int = Field(..., ge=10, le=180, description="单次训练时长(分钟)")
    training_content: str = Field(..., description="训练内容")
    training_goals: str = Field(..., description="训练目标")
    training_intensity: str = Field(default="medium", description="训练强度")
    precautions: Optional[str] = Field(None, description="注意事项")
    status: str = Field(default="pending", description="状态")

class TrainingPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    stage_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    weekly_sessions: Optional[int] = Field(None, ge=1, le=7)
    session_duration: Optional[int] = Field(None, ge=10, le=180)
    training_content: Optional[str] = None
    training_goals: Optional[str] = None
    training_intensity: Optional[str] = None
    precautions: Optional[str] = None
    status: Optional[str] = None
    actual_completion_date: Optional[date] = None

class TrainingPlanResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    stage_id: int
    stage_name: str
    name: str
    start_date: date
    end_date: date
    weekly_sessions: int
    session_duration: int
    training_content: str
    training_goals: str
    training_intensity: str
    training_intensity_display: str
    precautions: Optional[str]
    status: str
    status_display: str
    actual_completion_date: Optional[date]
    total_training_minutes_per_week: int
    created_at: str