from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from .dependencies import get_db_connection, get_current_user
from .models import (
    RehabilitationProgressCreate, 
    RehabilitationProgressUpdate, 
    RehabilitationProgressResponse
)
import logging

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rehabilitation-progress", tags=["康复进度管理"])

@router.get("/{patient_id}", response_model=List[RehabilitationProgressResponse])
async def get_rehabilitation_progress(patient_id: int, current_user: dict = Depends(get_current_user)):
    """获取患者的康复进度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT ProgressID, PatientID, RecordDate, WeekNumber, OverallProgress,
                   JointMobilityProgress, MuscleStrengthProgress, BalanceAbilityProgress,
                   TrainingDuration, TrainingSteps, PerformanceScore, Notes, CreatedAt
            FROM RehabilitationProgress 
            WHERE PatientID = ?
            ORDER BY WeekNumber DESC
        """, patient_id)
        
        progress_records = []
        for row in cursor.fetchall():
            progress_records.append({
                "id": row.ProgressID,
                "patient_id": row.PatientID,
                "record_date": row.RecordDate,
                "week_number": row.WeekNumber,
                "overall_progress": row.OverallProgress,
                "joint_mobility_progress": row.JointMobilityProgress,
                "muscle_strength_progress": row.MuscleStrengthProgress,
                "balance_ability_progress": row.BalanceAbilityProgress,
                "training_duration": row.TrainingDuration,
                "training_steps": row.TrainingSteps,
                "performance_score": row.PerformanceScore,
                "notes": row.Notes,
                "created_at": row.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if row.CreatedAt else None
            })
        
        return progress_records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取康复进度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/", response_model=RehabilitationProgressResponse)
async def create_rehabilitation_progress(
    progress: RehabilitationProgressCreate, 
    current_user: dict = Depends(get_current_user)
):
    """创建新的康复进度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        logger.info(f"收到创建康复进度记录请求: {progress.dict()}")
        logger.info(f"当前用户: {current_user}")
        
        # 检查患者是否存在
        cursor.execute("SELECT PatientID, Name FROM Patients WHERE PatientID = ? AND Status != 'deleted'", progress.patient_id)
        patient = cursor.fetchone()
        if not patient:
            logger.warning(f"患者不存在: {progress.patient_id}")
            raise HTTPException(status_code=404, detail="患者不存在")
        logger.info(f"找到患者: {patient.Name}")
        
        # 插入康复进度记录并直接获取ID
        logger.info("开始插入康复进度记录到数据库...")
        
        cursor.execute("""
            INSERT INTO RehabilitationProgress (
                PatientID, RecordDate, WeekNumber, OverallProgress,
                PerformanceScore, JointMobilityProgress, MuscleStrengthProgress,
                BalanceAbilityProgress, TrainingDuration, TrainingSteps,
                Notes, CreatedBy
            ) 
            OUTPUT INSERTED.ProgressID, INSERTED.PatientID, INSERTED.RecordDate,
                   INSERTED.WeekNumber, INSERTED.OverallProgress, INSERTED.PerformanceScore,
                   INSERTED.JointMobilityProgress, INSERTED.MuscleStrengthProgress,
                   INSERTED.BalanceAbilityProgress, INSERTED.TrainingDuration,
                   INSERTED.TrainingSteps, INSERTED.Notes, INSERTED.CreatedAt
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, 
            progress.patient_id, progress.record_date, progress.week_number, progress.overall_progress,
            progress.performance_score, progress.joint_mobility_progress, progress.muscle_strength_progress,
            progress.balance_ability_progress, progress.training_duration, progress.training_steps,
            progress.notes, current_user["user_id"]
        )
        
        new_progress = cursor.fetchone()
        conn.commit()
        
        if not new_progress:
            logger.error("插入成功但无法获取新记录")
            # 尝试通过其他方式获取最新记录
            cursor.execute("""
                SELECT TOP 1 ProgressID, PatientID, RecordDate, WeekNumber,
                       OverallProgress, PerformanceScore, JointMobilityProgress,
                       MuscleStrengthProgress, BalanceAbilityProgress, TrainingDuration,
                       TrainingSteps, Notes, CreatedAt
                FROM RehabilitationProgress 
                WHERE PatientID = ? 
                ORDER BY ProgressID DESC
            """, progress.patient_id)
            new_progress = cursor.fetchone()
            
            if not new_progress:
                raise HTTPException(status_code=500, detail="创建康复进度记录失败")
        
        logger.info(f"成功创建康复进度记录，ID: {new_progress.ProgressID}")
        
        response_data = {
            "id": new_progress.ProgressID,
            "patient_id": new_progress.PatientID,
            "patient_name": patient.Name,
            "record_date": new_progress.RecordDate,
            "week_number": new_progress.WeekNumber,
            "overall_progress": new_progress.OverallProgress,
            "performance_score": new_progress.PerformanceScore,
            "joint_mobility_progress": new_progress.JointMobilityProgress,
            "muscle_strength_progress": new_progress.MuscleStrengthProgress,
            "balance_ability_progress": new_progress.BalanceAbilityProgress,
            "training_duration": new_progress.TrainingDuration,
            "training_steps": new_progress.TrainingSteps,
            "notes": new_progress.Notes,
            "created_at": new_progress.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if new_progress.CreatedAt else None
        }
        
        logger.info(f"返回响应数据: {response_data}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建康复进度记录时发生未知错误: {str(e)}", exc_info=True)
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"创建康复进度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.put("/{progress_id}", response_model=RehabilitationProgressResponse)
async def update_rehabilitation_progress(
    progress_id: int,
    progress: RehabilitationProgressUpdate,
    current_user: dict = Depends(get_current_user)
):
    """更新康复进度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查记录是否存在
        cursor.execute("SELECT ProgressID FROM RehabilitationProgress WHERE ProgressID = ?", progress_id)
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="康复进度记录不存在")
        
        # 构建动态更新语句
        update_fields = []
        params = []
        
        if progress.record_date is not None:
            update_fields.append("RecordDate = ?")
            params.append(progress.record_date)
        if progress.week_number is not None:
            update_fields.append("WeekNumber = ?")
            params.append(progress.week_number)
        if progress.overall_progress is not None:
            update_fields.append("OverallProgress = ?")
            params.append(progress.overall_progress)
        if progress.joint_mobility_progress is not None:
            update_fields.append("JointMobilityProgress = ?")
            params.append(progress.joint_mobility_progress)
        if progress.muscle_strength_progress is not None:
            update_fields.append("MuscleStrengthProgress = ?")
            params.append(progress.muscle_strength_progress)
        if progress.balance_ability_progress is not None:
            update_fields.append("BalanceAbilityProgress = ?")
            params.append(progress.balance_ability_progress)
        if progress.training_duration is not None:
            update_fields.append("TrainingDuration = ?")
            params.append(progress.training_duration)
        if progress.training_steps is not None:
            update_fields.append("TrainingSteps = ?")
            params.append(progress.training_steps)
        if progress.performance_score is not None:
            update_fields.append("PerformanceScore = ?")
            params.append(progress.performance_score)
        if progress.notes is not None:
            update_fields.append("Notes = ?")
            params.append(progress.notes)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="没有提供更新字段")
        
        update_fields.append("UpdatedAt = GETDATE()")
        params.append(progress_id)
        
        query = f"UPDATE RehabilitationProgress SET {', '.join(update_fields)} WHERE ProgressID = ?"
        cursor.execute(query, params)
        
        conn.commit()
        
        # 获取更新后的记录
        cursor.execute("""
            SELECT ProgressID, PatientID, RecordDate, WeekNumber, OverallProgress,
                   JointMobilityProgress, MuscleStrengthProgress, BalanceAbilityProgress,
                   TrainingDuration, TrainingSteps, PerformanceScore, Notes, CreatedAt
            FROM RehabilitationProgress 
            WHERE ProgressID = ?
        """, progress_id)
        
        updated_progress = cursor.fetchone()
        
        return {
            "id": updated_progress.ProgressID,
            "patient_id": updated_progress.PatientID,
            "record_date": updated_progress.RecordDate,
            "week_number": updated_progress.WeekNumber,
            "overall_progress": updated_progress.OverallProgress,
            "joint_mobility_progress": updated_progress.JointMobilityProgress,
            "muscle_strength_progress": updated_progress.MuscleStrengthProgress,
            "balance_ability_progress": updated_progress.BalanceAbilityProgress,
            "training_duration": updated_progress.TrainingDuration,
            "training_steps": updated_progress.TrainingSteps,
            "performance_score": updated_progress.PerformanceScore,
            "notes": updated_progress.Notes,
            "created_at": updated_progress.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if updated_progress.CreatedAt else None
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"更新康复进度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.delete("/{progress_id}")
async def delete_rehabilitation_progress(progress_id: int, current_user: dict = Depends(get_current_user)):
    """删除康复进度记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM RehabilitationProgress WHERE ProgressID = ?", progress_id)
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="康复进度记录不存在")
        
        conn.commit()
        return {"message": "康复进度记录删除成功"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"删除康复进度记录失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/{patient_id}/statistics")
async def get_progress_statistics(patient_id: int, current_user: dict = Depends(get_current_user)):
    """获取康复进度统计信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 获取整体进度统计
        cursor.execute("""
            SELECT 
                AVG(CAST(OverallProgress as FLOAT)) as AvgOverallProgress,
                AVG(CAST(JointMobilityProgress as FLOAT)) as AvgJointMobility,
                AVG(CAST(MuscleStrengthProgress as FLOAT)) as AvgMuscleStrength,
                AVG(CAST(BalanceAbilityProgress as FLOAT)) as AvgBalanceAbility,
                COUNT(*) as TotalRecords
            FROM RehabilitationProgress 
            WHERE PatientID = ?
        """, patient_id)
        
        stats = cursor.fetchone()
        
        # 获取最近4周的进度趋势
        cursor.execute("""
            SELECT TOP 4 
                WeekNumber,
                OverallProgress,
                JointMobilityProgress,
                MuscleStrengthProgress,
                BalanceAbilityProgress
            FROM RehabilitationProgress 
            WHERE PatientID = ?
            ORDER BY WeekNumber DESC
        """, patient_id)
        
        recent_progress = []
        for row in cursor.fetchall():
            recent_progress.append({
                "week_number": row.WeekNumber,
                "overall_progress": row.OverallProgress,
                "joint_mobility_progress": row.JointMobilityProgress,
                "muscle_strength_progress": row.MuscleStrengthProgress,
                "balance_ability_progress": row.BalanceAbilityProgress
            })
        
        return {
            "statistics": {
                "average_overall_progress": round(float(stats.AvgOverallProgress) if stats.AvgOverallProgress else 0, 1),
                "average_joint_mobility": round(float(stats.AvgJointMobility) if stats.AvgJointMobility else 0, 1),
                "average_muscle_strength": round(float(stats.AvgMuscleStrength) if stats.AvgMuscleStrength else 0, 1),
                "average_balance_ability": round(float(stats.AvgBalanceAbility) if stats.AvgBalanceAbility else 0, 1),
                "total_records": stats.TotalRecords
            },
            "recent_progress": recent_progress
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取康复进度统计失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()