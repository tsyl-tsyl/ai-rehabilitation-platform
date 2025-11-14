from contextlib import contextmanager
from datetime import datetime, timedelta
import json
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
import jwt  # PyJWT
from passlib.context import CryptContext
import pyodbc
from pydantic import BaseModel, Field

from api import stages, joint_rom, progress, training

# 加载环境变量
load_dotenv()

# 配置常量
class Config:
    """应用配置类"""
    DB_SERVER = os.getenv('DB_SERVER', '')
    DB_NAME = os.getenv('DB_NAME', '')
    DB_USERNAME = os.getenv('DB_USERNAME', '')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_DRIVER = os.getenv('DB_DRIVER', '')
    
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    ALLOWED_ORIGINS = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:5500"
    ]

# 数据模型
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: dict

class PatientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="患者姓名")
    age: int = Field(..., ge=0, le=150, description="年龄")
    gender: str = Field(..., description="性别")
    contact_info: str = Field(..., description="联系方式")
    medical_history: Optional[str] = Field(None, description="病史")
    department: str = Field(..., description="康复科室")

class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = None
    contact_info: Optional[str] = None
    medical_history: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None

# 初始化应用
app = FastAPI(title="康复训练管理系统", version="1.0.0")

# 添加中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(stages.router)
app.include_router(joint_rom.router)
app.include_router(progress.router)
app.include_router(training.router)

# 安全配置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# 数据库工具
class DatabaseManager:
    """数据库管理类"""
    
    @staticmethod
    def get_connection_string():
        return f"""
            DRIVER={Config.DB_DRIVER};
            SERVER={Config.DB_SERVER};
            DATABASE={Config.DB_NAME};
            UID={Config.DB_USERNAME};
            PWD={Config.DB_PASSWORD};
        """
    
    @contextmanager
    def get_db_connection(self):
        """数据库连接上下文管理器"""
        conn = None
        try:
            conn = pyodbc.connect(self.get_connection_string())
            yield conn
        except pyodbc.Error as e:
            print(f"数据库连接错误: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库连接失败"
            )
        finally:
            if conn:
                conn.close()
    
    @contextmanager
    def get_db_cursor(self, conn=None):
        """数据库游标上下文管理器"""
        if conn:
            cursor = conn.cursor()
            try:
                yield cursor
            finally:
                cursor.close()
        else:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                try:
                    yield cursor
                finally:
                    cursor.close()

db_manager = DatabaseManager()

# 认证工具
class AuthService:
    """认证服务类"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """验证密码"""
        try:
            # bcrypt限制密码长度为72字节
            if len(plain_password) > 72:
                plain_password = plain_password[:72]
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            print(f"密码验证错误: {e}")
            return False
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """获取密码哈希值"""
        if len(password) > 72:
            password = password[:72]
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """创建访问令牌"""
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, Config.SECRET_KEY, algorithm=Config.ALGORITHM)
    
    @staticmethod
    async def authenticate_user(username: str, password: str) -> Optional[dict]:
        """认证用户"""
        with db_manager.get_db_cursor() as cursor:
            cursor.execute("""
                SELECT UserID, Username, PasswordHash, FullName, Email, Role, IsActive 
                FROM Users WHERE Username = ?
            """, username)
            
            user = cursor.fetchone()
            if not user:
                return None
            
            if not user.IsActive:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="用户账户已被禁用"
                )
            
            if not AuthService.verify_password(password, user.PasswordHash):
                return None
            
            return {
                "user_id": user.UserID,
                "username": user.Username,
                "full_name": user.FullName,
                "email": user.Email,
                "role": user.Role
            }
    
    @staticmethod
    async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
        """获取当前用户"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
            username: str = payload.get("sub")
            if not username:
                raise credentials_exception
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="登录已过期，请重新登录"
            )
        except jwt.InvalidTokenError:
            raise credentials_exception
        
        with db_manager.get_db_cursor() as cursor:
            cursor.execute("""
                SELECT UserID, Username, FullName, Email, Role, IsActive 
                FROM Users WHERE Username = ?
            """, username)
            user = cursor.fetchone()
            if not user:
                raise credentials_exception
            
            return {
                "user_id": user.UserID,
                "username": user.Username,
                "full_name": user.FullName,
                "email": user.Email,
                "role": user.Role
            }


# API路由
@app.post("/api/login")
async def login(form_data: UserLogin):
    """用户登录"""
    user = await AuthService.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    
    access_token_expires = timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": user["username"]}, 
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_info=user
    )

@app.get("/api/users/me")
async def read_users_me(current_user: dict = Depends(AuthService.get_current_user)):
    """获取当前用户信息"""
    return current_user

@app.get("/api/patients")
async def get_patients(current_user: dict = Depends(AuthService.get_current_user)):
    """获取患者列表"""
    with db_manager.get_db_cursor() as cursor:
        cursor.execute("""
            SELECT p.PatientID, p.PatientCode, p.Name, p.Age, p.Gender, p.RegisterDate, 
                   p.Status, p.Department, u.FullName as DoctorName,
                   ISNULL(ps.TotalTrainingCount, 0) as TrainingCount,
                   ISNULL(ps.TotalTrainingHours, 0) * 60 as TotalDuration,
                   (SELECT MAX(CurrentProgress) FROM RehabilitationStages rs 
                    WHERE rs.PatientID = p.PatientID AND rs.Status = 'active') as RecoveryProgress
            FROM Patients p 
            LEFT JOIN PatientSummary ps ON p.PatientID = ps.PatientID
            LEFT JOIN Users u ON p.DoctorID = u.UserID
            WHERE p.Status != 'deleted'
            ORDER BY p.RegisterDate DESC
        """)
        
        patients = []
        for row in cursor.fetchall():
            total_hours = (row.TotalDuration or 0) / 60
            patients.append({
                "patient_id": row.PatientID,
                "patient_code": row.PatientCode,
                "name": row.Name,
                "age": row.Age,
                "gender": row.Gender,
                "register_date": row.RegisterDate.strftime("%Y-%m-%d") if row.RegisterDate else None,
                "status": row.Status,
                "department": row.Department,
                "doctor_name": row.DoctorName,
                "training_count": row.TrainingCount or 0,
                "total_duration": f"{total_hours:.1f}h",
                "recovery_progress": f"{row.RecoveryProgress or 0}%"
            })
        
        return patients

@app.get("/api/patients/{patient_id}")
async def get_patient_details(patient_id: int, current_user: dict = Depends(AuthService.get_current_user)):
    """获取患者详情"""
    with db_manager.get_db_connection() as conn:
        with db_manager.get_db_cursor(conn) as cursor:
            try:
                # 获取患者基本信息
                cursor.execute("""
                    SELECT p.*, u.FullName as DoctorName
                    FROM Patients p
                    LEFT JOIN Users u ON p.DoctorID = u.UserID
                    WHERE p.PatientID = ?
                """, patient_id)
                
                patient = cursor.fetchone()
                if not patient:
                    raise HTTPException(status_code=404, detail="患者不存在")
                
                # 获取或创建患者汇总数据
                patient_summary = PatientService.get_or_create_patient_summary(cursor, patient_id)
                
                # 获取其他相关数据
                current_stage = PatientService.get_current_stage(cursor, patient_id)
                training_stats = PatientService.get_training_stats(cursor, patient_id)
                joint_mobility = PatientService.get_joint_mobility(cursor, patient_id)
                device_status = PatientService.get_device_status(cursor, patient_id)
                training_records = PatientService.get_training_records(cursor, patient_id)
                progress_history = PatientService.get_progress_history(cursor, patient_id)
                
                return {
                    "patient_info": {
                        "name": patient.Name,
                        "patient_code": patient.PatientCode,
                        "age": patient.Age,
                        "gender": patient.Gender,
                        "register_date": patient.RegisterDate.strftime("%Y-%m-%d"),
                        "doctor_name": patient.DoctorName,
                        "department": patient.Department,
                        "medical_history": patient.MedicalHistory
                    },
                    "patient_summary": patient_summary,
                    "training_stats": training_stats,
                    "current_stage": current_stage,
                    "joint_mobility": joint_mobility,
                    "device_status": device_status,
                    "training_records": training_records,
                    "progress_history": progress_history
                }
                
            except Exception as e:
                conn.rollback()
                raise HTTPException(status_code=500, detail=f"获取患者详情失败: {str(e)}")

@app.post("/api/patients")
async def create_patient(patient: PatientCreate, current_user: dict = Depends(AuthService.get_current_user)):
    """创建患者"""
    with db_manager.get_db_connection() as conn:
        with db_manager.get_db_cursor(conn) as cursor:
            try:
                patient_code = PatientService.generate_patient_code(cursor)
                
                cursor.execute("""
                    INSERT INTO Patients (PatientCode, Name, Age, Gender, ContactInfo, 
                                         MedicalHistory, Department, DoctorID, RegisterDate)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
                """, patient_code, patient.name, patient.age, patient.gender, 
                    patient.contact_info, patient.medical_history, patient.department, 
                    current_user["user_id"])
                
                conn.commit()
                
                cursor.execute(
                    "SELECT PatientID, PatientCode, Name FROM Patients WHERE PatientCode = ?", 
                    patient_code
                )
                new_patient = cursor.fetchone()
                
                return {
                    "message": "患者添加成功",
                    "patient_id": new_patient.PatientID,
                    "patient_code": new_patient.PatientCode,
                    "name": new_patient.Name
                }
                
            except Exception as e:
                conn.rollback()
                print(f"添加患者错误: {e}")
                raise HTTPException(status_code=500, detail="添加患者失败")

@app.put("/api/patients/{patient_id}")
async def update_patient(
    patient_id: int, 
    patient: PatientUpdate, 
    current_user: dict = Depends(AuthService.get_current_user)
):
    """更新患者信息"""
    with db_manager.get_db_connection() as conn:
        with db_manager.get_db_cursor(conn) as cursor:
            try:
                update_fields, params = PatientService.build_update_query(patient)
                params.append(patient_id)
                
                query = f"UPDATE Patients SET {update_fields} WHERE PatientID = ?"
                cursor.execute(query, params)
                
                if cursor.rowcount == 0:
                    raise HTTPException(status_code=404, detail="患者不存在")
                
                conn.commit()
                return {"message": "患者信息更新成功"}
                
            except HTTPException:
                raise
            except Exception as e:
                conn.rollback()
                print(f"更新患者错误: {e}")
                raise HTTPException(status_code=500, detail="更新患者信息失败")

@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: int, current_user: dict = Depends(AuthService.get_current_user)):
    """删除患者（软删除）"""
    with db_manager.get_db_connection() as conn:
        with db_manager.get_db_cursor(conn) as cursor:
            try:
                cursor.execute(
                    "UPDATE Patients SET Status = 'deleted', UpdatedAt = GETDATE() WHERE PatientID = ?", 
                    patient_id
                )
                
                if cursor.rowcount == 0:
                    raise HTTPException(status_code=404, detail="患者不存在")
                
                conn.commit()
                return {"message": "患者删除成功"}
                
            except HTTPException:
                raise
            except Exception as e:
                conn.rollback()
                print(f"删除患者错误: {e}")
                raise HTTPException(status_code=500, detail="删除患者失败")

# 其他API路由保持不变...
@app.get("/api/patients/{patient_id}/ai-analysis")
async def get_ai_analysis(patient_id: int, current_user: dict = Depends(AuthService.get_current_user)):
    """获取AI分析报告"""
    with db_manager.get_db_cursor() as cursor:
        cursor.execute("""
            SELECT TOP 1 ar.OverallScore, ar.JointAngleDeviation, ar.MotionTrajectoryData, 
                   ar.ImprovementData, ar.TrainingRecommendations, ar.AISummary,
                   p.Name as PatientName
            FROM AIAnalysisReports ar
            JOIN Patients p ON ar.PatientID = p.PatientID
            WHERE ar.PatientID = ?
            ORDER BY ar.AnalysisDate DESC
        """, patient_id)
        
        analysis = cursor.fetchone()
        if not analysis:
            return {
                "patient_name": "患者",
                "overall_score": 75,
                "joint_angle_deviation": {
                    "left_knee": 3.2,
                    "right_knee": 1.8,
                    "left_hip": 4.5,
                    "right_hip": 6.1
                },
                "improvement_data": [65, 72, 78, 86],
                "training_recommendations": "重点训练右髋关节稳定性，每日2组，每组15次",
                "ai_summary": "患者整体动作完成度良好，右髋关节稳定性需要加强。"
            }
        
        return {
            "patient_name": analysis.PatientName,
            "overall_score": analysis.OverallScore,
            "joint_angle_deviation": json.loads(analysis.JointAngleDeviation) if analysis.JointAngleDeviation else {},
            "motion_trajectory_data": json.loads(analysis.MotionTrajectoryData) if analysis.MotionTrajectoryData else {},
            "improvement_data": json.loads(analysis.ImprovementData) if analysis.ImprovementData else [65, 72, 78, 86],
            "training_recommendations": analysis.TrainingRecommendations,
            "ai_summary": analysis.AISummary
        }

@app.get("/api/reminders/today")
async def get_today_reminders(current_user: dict = Depends(AuthService.get_current_user)):
    """获取今日提醒"""
    with db_manager.get_db_cursor() as cursor:
        cursor.execute("""
            SELECT r.ReminderID, r.Title, r.Description, r.ReminderTime, p.Name as PatientName
            FROM SystemReminders r
            JOIN Patients p ON r.PatientID = p.PatientID
            WHERE r.ReminderDate = CAST(GETDATE() AS DATE) AND r.IsCompleted = 0
            ORDER BY r.ReminderTime
        """)
        
        reminders = []
        for row in cursor.fetchall():
            reminders.append({
                "reminder_id": row.ReminderID,
                "title": row.Title,
                "description": row.Description,
                "reminder_time": str(row.ReminderTime) if row.ReminderTime else None,
                "patient_name": row.PatientName
            })
        
        return reminders

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# 患者服务
class PatientService:
    """患者服务类"""
    
    @staticmethod
    def generate_patient_code(cursor) -> str:
        """生成患者编号"""
        cursor.execute("SELECT COUNT(*) FROM Patients WHERE YEAR(RegisterDate) = YEAR(GETDATE())")
        patient_count = cursor.fetchone()[0] + 1
        return f"PT{datetime.now().year}{patient_count:04d}"
    
    @staticmethod
    def build_update_query(patient: PatientUpdate) -> tuple:
        """构建更新查询"""
        update_fields = []
        params = []
        
        field_mappings = {
            'name': ('Name', patient.name),
            'age': ('Age', patient.age),
            'gender': ('Gender', patient.gender),
            'contact_info': ('ContactInfo', patient.contact_info),
            'medical_history': ('MedicalHistory', patient.medical_history),
            'department': ('Department', patient.department),
            'status': ('Status', patient.status)
        }
        
        for field, (db_field, value) in field_mappings.items():
            if value is not None:
                update_fields.append(f"{db_field} = ?")
                params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="没有提供更新字段")
        
        update_fields.append("UpdatedAt = GETDATE()")
        return ', '.join(update_fields), params
    
    @staticmethod
    def get_or_create_patient_summary(cursor, patient_id: int) -> dict:
        """获取或创建患者汇总数据"""
        cursor.execute("""
            SELECT TotalTrainingHours, TotalTrainingCount, TotalSteps,
                   OverallProgress, JointMobilityProgress, 
                   MuscleStrengthProgress, BalanceAbilityProgress,
                   LastUpdated
            FROM PatientSummary 
            WHERE PatientID = ?
        """, patient_id)
        
        patient_summary = cursor.fetchone()
        
        if not patient_summary:
            # 创建默认的患者汇总数据
            cursor.execute("SELECT COUNT(*) as TrainingCount, SUM(Duration) as TotalDuration, SUM(Steps) as TotalSteps FROM TrainingRecords WHERE PatientID = ?", patient_id)
            stats = cursor.fetchone()
            
            cursor.execute("SELECT TOP 1 LeftHip, RightHip, LeftKnee, RightKnee, LeftAnkle, RightAnkle FROM JointMobilityRecords WHERE PatientID = ? ORDER BY RecordDate DESC", patient_id)
            joint_mobility = cursor.fetchone()
            
            joint_progress = 0
            if joint_mobility:
                joint_values = [
                    joint_mobility.LeftHip, joint_mobility.RightHip,
                    joint_mobility.LeftKnee, joint_mobility.RightKnee,
                    joint_mobility.LeftAnkle, joint_mobility.RightAnkle
                ]
                joint_progress = int(sum(joint_values) / len(joint_values))
            
            cursor.execute("""
                INSERT INTO PatientSummary (
                    PatientID, TotalTrainingHours, TotalTrainingCount, TotalSteps,
                    OverallProgress, JointMobilityProgress, MuscleStrengthProgress, BalanceAbilityProgress
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                patient_id,
                (stats.TotalDuration or 0) / 60,
                stats.TrainingCount or 0,
                stats.TotalSteps or 0,
                joint_progress, joint_progress, 0, 0
            ))
            
            # 重新获取数据
            cursor.execute("""
                SELECT TotalTrainingHours, TotalTrainingCount, TotalSteps,
                       OverallProgress, JointMobilityProgress, 
                       MuscleStrengthProgress, BalanceAbilityProgress,
                       LastUpdated
                FROM PatientSummary 
                WHERE PatientID = ?
            """, patient_id)
            patient_summary = cursor.fetchone()
        
        return {
            "total_training_count": patient_summary.TotalTrainingCount,
            "total_training_hours": float(patient_summary.TotalTrainingHours),
            "total_steps": patient_summary.TotalSteps,
            "overall_progress": patient_summary.OverallProgress,
            "joint_mobility_progress": patient_summary.JointMobilityProgress,
            "muscle_strength_progress": patient_summary.MuscleStrengthProgress,
            "balance_ability_progress": patient_summary.BalanceAbilityProgress,
            "last_updated": patient_summary.LastUpdated.strftime("%Y-%m-%d %H:%M")
        }
    
    @staticmethod
    def get_current_stage(cursor, patient_id: int) -> Optional[dict]:
        """获取当前康复阶段"""
        cursor.execute("""
            SELECT StageName, CurrentProgress, StartDate, EndDate, TargetGoals, 
                   WeeksCompleted, WeeksRemaining, WeeklyFocus, TrainingIntensity, NextEvaluationDate
            FROM RehabilitationStages 
            WHERE PatientID = ? AND Status = 'active'
            ORDER BY StageNumber DESC
        """, patient_id)
        
        stage = cursor.fetchone()
        if not stage:
            return None
        
        return {
            "stage_name": stage.StageName,
            "progress": stage.CurrentProgress,
            "start_date": stage.StartDate.strftime("%Y-%m-%d") if stage.StartDate else None,
            "end_date": stage.EndDate.strftime("%Y-%m-%d") if stage.EndDate else None,
            "target_goals": stage.TargetGoals,
            "weeks_completed": stage.WeeksCompleted,
            "weeks_remaining": stage.WeeksRemaining,
            "weekly_focus": stage.WeeklyFocus,
            "training_intensity": stage.TrainingIntensity,
            "next_evaluation_date": stage.NextEvaluationDate.strftime("%Y-%m-%d") if stage.NextEvaluationDate else None
        }
    
    @staticmethod
    def get_training_stats(cursor, patient_id: int) -> dict:
        """获取训练统计"""
        cursor.execute("""
            SELECT COUNT(*) as TrainingCount, 
                   SUM(Duration) as TotalDuration,
                   SUM(Steps) as TotalSteps
            FROM TrainingRecords 
            WHERE PatientID = ?
        """, patient_id)
        
        stats = cursor.fetchone()
        return {
            "training_count": stats.TrainingCount or 0,
            "total_duration": f"{(stats.TotalDuration or 0) / 60:.1f}",
            "total_steps": stats.TotalSteps or 0
        }
    
    @staticmethod
    def get_joint_mobility(cursor, patient_id: int) -> Optional[dict]:
        """获取关节活动度"""
        cursor.execute("""
            SELECT TOP 1 LeftHip, RightHip, LeftKnee, RightKnee, LeftAnkle, RightAnkle,
                   LeftHipChange, RightHipChange, LeftKneeChange, RightKneeChange,
                   LeftAnkleChange, RightAnkleChange
            FROM JointMobilityRecords 
            WHERE PatientID = ?
            ORDER BY RecordDate DESC
        """, patient_id)
        
        joint_mobility = cursor.fetchone()
        if not joint_mobility:
            return None
        
        return {
            "left_hip": joint_mobility.LeftHip,
            "right_hip": joint_mobility.RightHip,
            "left_knee": joint_mobility.LeftKnee,
            "right_knee": joint_mobility.RightKnee,
            "left_ankle": joint_mobility.LeftAnkle,
            "right_ankle": joint_mobility.RightAnkle,
            "left_hip_change": joint_mobility.LeftHipChange,
            "right_hip_change": joint_mobility.RightHipChange,
            "left_knee_change": joint_mobility.LeftKneeChange,
            "right_knee_change": joint_mobility.RightKneeChange,
            "left_ankle_change": joint_mobility.LeftAnkleChange,
            "right_ankle_change": joint_mobility.RightAnkleChange
        }
    
    @staticmethod
    def get_device_status(cursor, patient_id: int) -> Optional[dict]:
        """获取设备状态"""
        cursor.execute("""
            SELECT TOP 1 MainController, DriveMotor, Sensors, BatteryLevel, SelfCheck
            FROM DeviceStatus 
            WHERE PatientID = ?
            ORDER BY CheckDate DESC
        """, patient_id)
        
        device_status = cursor.fetchone()
        if not device_status:
            return None
        
        return {
            "main_controller": device_status.MainController,
            "drive_motor": device_status.DriveMotor,
            "sensors": device_status.Sensors,
            "battery_level": device_status.BatteryLevel,
            "self_check": device_status.SelfCheck
        }
    
    @staticmethod
    def get_training_records(cursor, patient_id: int) -> list:
        """获取训练记录"""
        cursor.execute("""
            SELECT TrainingDate, Duration, Steps, PerformanceScore, ExerciseType, Notes
            FROM TrainingRecords 
            WHERE PatientID = ?
            ORDER BY TrainingDate DESC
        """, patient_id)
        
        training_records = []
        for record in cursor.fetchall():
            training_records.append({
                "training_date": record.TrainingDate.strftime("%Y-%m-%d %H:%M"),
                "duration": record.Duration,
                "steps": record.Steps,
                "performance_score": record.PerformanceScore,
                "exercise_type": record.ExerciseType,
                "notes": record.Notes
            })
        
        return training_records
    
    @staticmethod
    def get_progress_history(cursor, patient_id: int) -> list:
        """获取康复进度历史"""
        cursor.execute("""
            SELECT WeekNumber, OverallProgress, JointMobilityProgress, 
                   MuscleStrengthProgress, BalanceAbilityProgress
            FROM RehabilitationProgress 
            WHERE PatientID = ?
            ORDER BY WeekNumber
        """, patient_id)
        
        progress_history = []
        for progress in cursor.fetchall():
            progress_history.append({
                "week_number": progress.WeekNumber,
                "overall_progress": progress.OverallProgress,
                "joint_mobility": progress.JointMobilityProgress,
                "muscle_strength": progress.MuscleStrengthProgress,
                "balance_ability": progress.BalanceAbilityProgress
            })
        
        return progress_history

# 在 main_api.py 中添加以下代码

# 训练计划数据模型
class TrainingPlanResponse(BaseModel):
    plan_id: int
    patient_id: int
    stage_id: Optional[int]
    plan_name: str
    start_date: str
    end_date: str
    weekly_sessions: int
    session_duration: int
    training_content: str
    training_goals: str
    training_intensity: str
    precautions: Optional[str]
    status: str
    actual_completion_date: Optional[str]
    created_at: str
    patient_name: str
    stage_name: Optional[str]

class MonthlyTrainingRecord(BaseModel):
    training_date: str
    training_content: str
    duration: int
    steps: int
    completion_status: str

class MonthlyStats(BaseModel):
    training_count: int
    training_hours: float
    total_steps: int
    completion_rate: float

# 训练计划API路由 - 更安全的版本
@app.get("/api/patients/{patient_id}/training-plans/monthly")
async def get_monthly_training_plan(
    patient_id: int, 
    year: int = None, 
    month: int = None,
    current_user: dict = Depends(AuthService.get_current_user)
):
    """获取月度训练计划和统计数据"""
    try:
        if year is None:
            year = datetime.now().year
        if month is None:
            month = datetime.now().month
        
        with db_manager.get_db_cursor() as cursor:
            # 获取当前活跃的训练计划
            cursor.execute("""
                SELECT tp.PlanID, tp.PatientID, tp.StageID, tp.PlanName,
                       tp.StartDate, tp.EndDate, tp.WeeklySessions, tp.SessionDuration,
                       tp.TrainingContent, tp.TrainingGoals, tp.TrainingIntensity,
                       tp.Precautions, tp.Status, tp.ActualCompletionDate, tp.CreatedAt,
                       p.Name as PatientName, rs.StageName
                FROM TrainingPlans tp
                JOIN Patients p ON tp.PatientID = p.PatientID
                LEFT JOIN RehabilitationStages rs ON tp.StageID = rs.StageID
                WHERE tp.PatientID = ? AND tp.Status = 'active'
                ORDER BY tp.CreatedAt DESC
            """, patient_id)
            
            plan = cursor.fetchone()
            
            # 获取本月训练记录
            cursor.execute("""
                SELECT TrainingDate, ExerciseType as TrainingContent, 
                       Duration, Steps, 
                       CASE 
                         WHEN PerformanceScore >= 80 THEN 'completed'
                         WHEN PerformanceScore >= 60 THEN 'partial'
                         ELSE 'pending'
                       END as CompletionStatus
                FROM TrainingRecords 
                WHERE PatientID = ? 
                  AND YEAR(TrainingDate) = ? 
                  AND MONTH(TrainingDate) = ?
                ORDER BY TrainingDate DESC
            """, patient_id, year, month)
            
            training_records = []
            for record in cursor.fetchall():
                training_records.append({
                    "training_date": record.TrainingDate.strftime("%Y-%m-%d") if record.TrainingDate else "",
                    "training_content": record.TrainingContent or "康复训练",
                    "duration": record.Duration or 0,
                    "steps": record.Steps or 0,
                    "completion_status": record.CompletionStatus or "pending"
                })
            
            # 计算月度统计
            cursor.execute("""
                SELECT 
                    COUNT(*) as TrainingCount,
                    SUM(Duration) as TotalDuration,
                    SUM(Steps) as TotalSteps,
                    AVG(CASE WHEN PerformanceScore >= 80 THEN 1.0 ELSE 0.0 END) * 100 as CompletionRate
                FROM TrainingRecords 
                WHERE PatientID = ? 
                  AND YEAR(TrainingDate) = ? 
                  AND MONTH(TrainingDate) = ?
            """, patient_id, year, month)
            
            stats = cursor.fetchone()
            
            monthly_stats = {
                "training_count": stats.TrainingCount or 0,
                "training_hours": round((stats.TotalDuration or 0) / 60, 1),
                "total_steps": stats.TotalSteps or 0,
                "completion_rate": round(stats.CompletionRate or 0, 1)
            }
            
            # 计算计划进度
            plan_progress = 0
            current_plan_data = None
            
            if plan and plan.StartDate and plan.EndDate:
                try:
                    # 统一日期类型比较
                    start_date = plan.StartDate
                    end_date = plan.EndDate
                    current_date = datetime.now()
                    
                    # 如果数据库返回的是date，转换为datetime进行比较
                    if isinstance(start_date, datetime.date) and not isinstance(start_date, datetime.datetime):
                        start_date = datetime.datetime.combine(start_date, datetime.time.min)
                    if isinstance(end_date, datetime.date) and not isinstance(end_date, datetime.datetime):
                        end_date = datetime.datetime.combine(end_date, datetime.time.min)
                    
                    # 计算周数
                    if current_date > end_date:
                        weeks_completed = (end_date - start_date).days // 7
                    else:
                        weeks_completed = (current_date - start_date).days // 7
                    
                    total_weeks = (end_date - start_date).days // 7
                    plan_progress = min(100, int((weeks_completed / total_weeks) * 100)) if total_weeks > 0 else 0
                    
                except Exception as e:
                    print(f"计算计划进度错误: {e}")
                    plan_progress = 0
            
            # 构建返回数据
            response_data = {
                "training_records": training_records,
                "monthly_stats": monthly_stats,
                "current_month": f"{year}年{month}月"
            }
            
            # 如果有训练计划，添加计划信息
            if plan:
                current_plan_data = {
                    "plan_id": plan.PlanID,
                    "plan_name": plan.PlanName or "训练计划",
                    "start_date": plan.StartDate.strftime("%Y-%m-%d") if plan.StartDate else None,
                    "end_date": plan.EndDate.strftime("%Y-%m-%d") if plan.EndDate else None,
                    "weekly_sessions": plan.WeeklySessions or 0,
                    "session_duration": plan.SessionDuration or 0,
                    "training_content": plan.TrainingContent or "",
                    "training_goals": plan.TrainingGoals or "",
                    "training_intensity": plan.TrainingIntensity or "",
                    "stage_name": plan.StageName or "",
                    "progress": plan_progress
                }
            
            response_data["current_plan"] = current_plan_data
            
            return response_data
            
    except Exception as e:
        print(f"训练计划API错误: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取训练计划失败: {str(e)}"
        )
