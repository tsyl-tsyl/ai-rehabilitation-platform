from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from database import get_db
from models.user import User
from models.patient import Patient, Doctor
from models.training import TrainingRecord, JointMobilityRecord, RobotStatus, RehabilitationStage, DailyReminder
from models.analysis import AIAnalysisReport
from schemas.patient import Patient as PatientSchema, TrainingRecord as TrainingRecordSchema
from schemas.analysis import AIAnalysisReport as AIAnalysisReportSchema, DashboardData  # 修正导入
from routers.auth import get_current_user

router = APIRouter(prefix="/patients", tags=["患者管理"])

@router.get("/", response_model=List[PatientSchema])
async def get_patients(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="没有权限访问患者列表")
    
    # 获取当前医生负责的所有患者
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="医生信息未找到")
    
    patients = db.query(Patient).filter(Patient.doctor_id == doctor.id).offset(skip).limit(limit).all()
    return patients

@router.get("/{patient_id}", response_model=PatientSchema)
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者未找到")
    
    # 权限检查：医生只能查看自己负责的患者
    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or patient.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="没有权限访问该患者信息")
    
    return patient

@router.get("/{patient_id}/training-records", response_model=List[TrainingRecordSchema])
async def get_patient_training_records(
    patient_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 权限检查
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者未找到")
    
    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or patient.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="没有权限访问该患者信息")
    
    records = db.query(TrainingRecord).filter(
        TrainingRecord.patient_id == patient_id
    ).offset(skip).limit(limit).all()
    
    return records

@router.get("/{patient_id}/ai-analysis", response_model=AIAnalysisReportSchema)
async def get_patient_ai_analysis(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 权限检查
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者未找到")
    
    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or patient.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="没有权限访问该患者信息")
    
    # 获取最新的AI分析报告
    analysis = db.query(AIAnalysisReport).filter(
        AIAnalysisReport.patient_id == patient_id
    ).order_by(AIAnalysisReport.analysis_date.desc()).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="未找到AI分析报告")
    
    return analysis

@router.get("/doctor/dashboard", response_model=DashboardData)
async def get_doctor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="没有权限访问医生工作台")
    
    # 获取当前医生信息
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="医生信息未找到")
    
    # 获取医生负责的所有患者
    patients = db.query(Patient).filter(Patient.doctor_id == doctor.id).all()
    
    # 获取今日提醒
    from datetime import date, datetime
    today = date.today()
    reminders = db.query(DailyReminder).filter(
        DailyReminder.reminder_date == today,
        DailyReminder.is_completed == False
    ).all()
    
    # 计算统计数据
    total_patients = len(patients)
    
    # 计算今日完成的训练
    training_completed_today = db.query(TrainingRecord).filter(
        TrainingRecord.training_date == today
    ).count()
    
    # 计算需要关注的患者（康复进度低于50%或最近有高风险偏差）
    patients_need_attention = 0
    for patient in patients:
        latest_analysis = db.query(AIAnalysisReport).filter(
            AIAnalysisReport.patient_id == patient.id
        ).order_by(AIAnalysisReport.analysis_date.desc()).first()
        
        if patient.recovery_progress < 50 or (
            latest_analysis and (
                (latest_analysis.left_hip_deviation or 0) > 7 or 
                (latest_analysis.right_hip_deviation or 0) > 7
            )
        ):
            patients_need_attention += 1
    
    today_appointments = len(reminders)
    
    # 获取所有患者的进度数据用于图表
    patient_progress_data = [
        {
            "name": patient.user.name,
            "progress": patient.recovery_progress,
            "status": patient.status
        }
        for patient in patients
    ]
    
    # 获取动作偏差数据
    deviation_data = []
    for patient in patients:
        latest_analysis = db.query(AIAnalysisReport).filter(
            AIAnalysisReport.patient_id == patient.id
        ).order_by(AIAnalysisReport.analysis_date.desc()).first()
        
        if latest_analysis:
            max_deviation = max(
                latest_analysis.left_knee_deviation or 0,
                latest_analysis.right_knee_deviation or 0,
                latest_analysis.left_hip_deviation or 0,
                latest_analysis.right_hip_deviation or 0
            )
            deviation_data.append({
                "name": patient.user.name,
                "progress": patient.recovery_progress,
                "deviation": max_deviation
            })
        else:
            # 如果没有分析数据，使用默认值
            deviation_data.append({
                "name": patient.user.name,
                "progress": patient.recovery_progress,
                "deviation": 5.0  # 默认偏差值
            })
    
    # 获取机器人状态
    robot_status_data = []
    for patient in patients:
        latest_status = db.query(RobotStatus).filter(
            RobotStatus.patient_id == patient.id
        ).order_by(RobotStatus.check_time.desc()).first()
        
        if latest_status:
            status = "正常运行"
            if latest_status.main_controller != "运行正常" or latest_status.motor_status != "运行正常":
                status = "需要维护"
            elif latest_status.self_test_result != "正常运行":
                status = "离线"
            
            robot_status_data.append(status)
        else:
            robot_status_data.append("正常运行")  # 默认状态
    
    # 统计机器人状态
    robot_status_count = {
        "正常运行": len([status for status in robot_status_data if status == "正常运行"]),
        "需要维护": len([status for status in robot_status_data if status == "需要维护"]),
        "离线": len([status for status in robot_status_data if status == "离线"])
    }
    
    return {
        "doctor": {
            "name": current_user.name,
            "department": doctor.department or "康复科",
            "position": doctor.position or "医生"
        },
        "statistics": {
            "total_patients": total_patients,
            "training_completed_today": training_completed_today,
            "patients_need_attention": patients_need_attention,
            "today_appointments": today_appointments
        },
        "patient_progress_data": patient_progress_data,
        "deviation_data": deviation_data,
        "robot_status": robot_status_count,
        "reminders": [
            {
                "title": reminder.title,
                "description": reminder.description,
                "patient_name": reminder.patient.user.name
            }
            for reminder in reminders
        ]
    }