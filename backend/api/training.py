from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from .dependencies import get_db_connection, get_current_user
from .models import (
    TrainingPlanCreate, 
    TrainingPlanUpdate, 
    TrainingPlanResponse
)
import logging

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/training-plans", tags=["训练计划管理"])

@router.get("/{patient_id}", response_model=List[TrainingPlanResponse])
async def get_training_plans(patient_id: int, current_user: dict = Depends(get_current_user)):
    """获取患者的训练计划"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT tp.PlanID, tp.PatientID, tp.StageID, tp.PlanName,
                   tp.StartDate, tp.EndDate, tp.WeeklySessions, tp.SessionDuration,
                   tp.TrainingContent, tp.TrainingGoals, tp.TrainingIntensity,
                   tp.Precautions, tp.Status, tp.ActualCompletionDate, tp.CreatedAt,
                   p.Name as PatientName, rs.StageName
            FROM TrainingPlans tp
            JOIN Patients p ON tp.PatientID = p.PatientID
            LEFT JOIN RehabilitationStages rs ON tp.StageID = rs.StageID
            WHERE tp.PatientID = ? AND tp.Status != 'deleted'
            ORDER BY tp.CreatedAt DESC
        """, patient_id)
        
        training_plans = []
        intensity_display = {
            'low': '低强度',
            'medium': '中等强度',
            'high': '高强度'
        }
        status_display = {
            'pending': '待开始',
            'active': '进行中',
            'completed': '已完成',
            'paused': '已暂停'
        }
        
        for row in cursor.fetchall():
            training_plans.append({
                "id": row.PlanID,
                "patient_id": row.PatientID,
                "patient_name": row.PatientName,
                "stage_id": row.StageID,
                "stage_name": row.StageName,
                "name": row.PlanName,
                "start_date": row.StartDate,
                "end_date": row.EndDate,
                "weekly_sessions": row.WeeklySessions,
                "session_duration": row.SessionDuration,
                "training_content": row.TrainingContent,
                "training_goals": row.TrainingGoals,
                "training_intensity": row.TrainingIntensity,
                "training_intensity_display": intensity_display.get(row.TrainingIntensity, row.TrainingIntensity),
                "precautions": row.Precautions,
                "status": row.Status,
                "status_display": status_display.get(row.Status, row.Status),
                "actual_completion_date": row.ActualCompletionDate,
                "total_training_minutes_per_week": row.WeeklySessions * row.SessionDuration,
                "created_at": row.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if row.CreatedAt else None
            })
        
        return training_plans
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取训练计划失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/", response_model=TrainingPlanResponse)
async def create_training_plan(
    plan: TrainingPlanCreate, 
    current_user: dict = Depends(get_current_user)
):
    """创建新的训练计划"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        logger.info(f"收到创建训练计划请求: {plan.dict()}")
        logger.info(f"当前用户: {current_user}")
        
        # 检查患者是否存在
        cursor.execute("SELECT PatientID, Name FROM Patients WHERE PatientID = ? AND Status != 'deleted'", plan.patient_id)
        patient = cursor.fetchone()
        if not patient:
            logger.warning(f"患者不存在: {plan.patient_id}")
            raise HTTPException(status_code=404, detail="患者不存在")
        logger.info(f"找到患者: {patient.Name}")
        
        # 检查康复阶段是否存在
        if plan.stage_id:
            cursor.execute("SELECT StageID, StageName FROM RehabilitationStages WHERE StageID = ?", plan.stage_id)
            stage = cursor.fetchone()
            if not stage:
                logger.warning(f"康复阶段不存在: {plan.stage_id}")
                raise HTTPException(status_code=404, detail="康复阶段不存在")
            logger.info(f"找到康复阶段: {stage.StageName}")
        else:
            logger.warning("stage_id 为 None 或未提供")
            raise HTTPException(status_code=400, detail="康复阶段ID不能为空")
        
        # 插入训练计划并直接获取ID
        logger.info("开始插入训练计划到数据库...")
        
        # 方法1: 使用 OUTPUT 子句直接返回插入的ID
        cursor.execute("""
            INSERT INTO TrainingPlans (
                PatientID, StageID, PlanName, StartDate, EndDate, WeeklySessions,
                SessionDuration, TrainingContent, TrainingGoals, TrainingIntensity,
                Precautions, Status, CreatedBy
            ) 
            OUTPUT INSERTED.PlanID, INSERTED.PatientID, INSERTED.StageID, INSERTED.PlanName,
                   INSERTED.StartDate, INSERTED.EndDate, INSERTED.WeeklySessions, INSERTED.SessionDuration,
                   INSERTED.TrainingContent, INSERTED.TrainingGoals, INSERTED.TrainingIntensity,
                   INSERTED.Precautions, INSERTED.Status, INSERTED.ActualCompletionDate, INSERTED.CreatedAt
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, 
            plan.patient_id, plan.stage_id, plan.name, plan.start_date, plan.end_date,
            plan.weekly_sessions, plan.session_duration, plan.training_content,
            plan.training_goals, plan.training_intensity, plan.precautions,
            plan.status, current_user["user_id"]
        )
        
        new_plan = cursor.fetchone()
        conn.commit()
        
        if not new_plan:
            logger.error("插入成功但无法获取新记录")
            # 尝试通过其他方式获取最新记录
            cursor.execute("""
                SELECT TOP 1 PlanID, PatientID, StageID, PlanName,
                       StartDate, EndDate, WeeklySessions, SessionDuration,
                       TrainingContent, TrainingGoals, TrainingIntensity,
                       Precautions, Status, ActualCompletionDate, CreatedAt
                FROM TrainingPlans 
                WHERE PatientID = ? 
                ORDER BY PlanID DESC
            """, plan.patient_id)
            new_plan = cursor.fetchone()
            
            if not new_plan:
                raise HTTPException(status_code=500, detail="创建训练计划失败")
        
        logger.info(f"成功创建训练计划，ID: {new_plan.PlanID}")
        
        intensity_display = {
            'low': '低强度',
            'medium': '中等强度',
            'high': '高强度'
        }
        status_display = {
            'pending': '待开始',
            'active': '进行中',
            'completed': '已完成',
            'paused': '已暂停'
        }
        
        response_data = {
            "id": new_plan.PlanID,
            "patient_id": new_plan.PatientID,
            "patient_name": patient.Name,
            "stage_id": new_plan.StageID,
            "stage_name": stage.StageName if plan.stage_id else None,
            "name": new_plan.PlanName,
            "start_date": new_plan.StartDate,
            "end_date": new_plan.EndDate,
            "weekly_sessions": new_plan.WeeklySessions,
            "session_duration": new_plan.SessionDuration,
            "training_content": new_plan.TrainingContent,
            "training_goals": new_plan.TrainingGoals,
            "training_intensity": new_plan.TrainingIntensity,
            "training_intensity_display": intensity_display.get(new_plan.TrainingIntensity, new_plan.TrainingIntensity),
            "precautions": new_plan.Precautions,
            "status": new_plan.Status,
            "status_display": status_display.get(new_plan.Status, new_plan.Status),
            "actual_completion_date": new_plan.ActualCompletionDate,
            "total_training_minutes_per_week": new_plan.WeeklySessions * new_plan.SessionDuration,
            "created_at": new_plan.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if new_plan.CreatedAt else None
        }
        
        logger.info(f"返回响应数据: {response_data}")
        return response_data
        
    except HTTPException:
        # 重新抛出已知的HTTP异常
        raise
    except Exception as e:
        logger.error(f"创建训练计划时发生未知错误: {str(e)}", exc_info=True)
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"创建训练计划失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.put("/{plan_id}", response_model=TrainingPlanResponse)
async def update_training_plan(
    plan_id: int,
    plan: TrainingPlanUpdate,
    current_user: dict = Depends(get_current_user)
):
    """更新训练计划"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 检查计划是否存在
        cursor.execute("""
            SELECT tp.PlanID, p.Name as PatientName, rs.StageName
            FROM TrainingPlans tp
            JOIN Patients p ON tp.PatientID = p.PatientID
            LEFT JOIN RehabilitationStages rs ON tp.StageID = rs.StageID
            WHERE tp.PlanID = ?
        """, plan_id)
        existing_plan = cursor.fetchone()
        if not existing_plan:
            raise HTTPException(status_code=404, detail="训练计划不存在")
        
        # 如果更新了stage_id，检查新的阶段是否存在
        if plan.stage_id is not None:
            cursor.execute("SELECT StageID, StageName FROM RehabilitationStages WHERE StageID = ?", plan.stage_id)
            new_stage = cursor.fetchone()
            if not new_stage:
                raise HTTPException(status_code=404, detail="康复阶段不存在")
            stage_name = new_stage.StageName
        else:
            stage_name = existing_plan.StageName
        
        # 构建动态更新语句
        update_fields = []
        params = []
        
        if plan.name is not None:
            update_fields.append("PlanName = ?")
            params.append(plan.name)
        if plan.stage_id is not None:
            update_fields.append("StageID = ?")
            params.append(plan.stage_id)
        if plan.start_date is not None:
            update_fields.append("StartDate = ?")
            params.append(plan.start_date)
        if plan.end_date is not None:
            update_fields.append("EndDate = ?")
            params.append(plan.end_date)
        if plan.weekly_sessions is not None:
            update_fields.append("WeeklySessions = ?")
            params.append(plan.weekly_sessions)
        if plan.session_duration is not None:
            update_fields.append("SessionDuration = ?")
            params.append(plan.session_duration)
        if plan.training_content is not None:
            update_fields.append("TrainingContent = ?")
            params.append(plan.training_content)
        if plan.training_goals is not None:
            update_fields.append("TrainingGoals = ?")
            params.append(plan.training_goals)
        if plan.training_intensity is not None:
            update_fields.append("TrainingIntensity = ?")
            params.append(plan.training_intensity)
        if plan.precautions is not None:
            update_fields.append("Precautions = ?")
            params.append(plan.precautions)
        if plan.status is not None:
            update_fields.append("Status = ?")
            params.append(plan.status)
        if plan.actual_completion_date is not None:
            update_fields.append("ActualCompletionDate = ?")
            params.append(plan.actual_completion_date)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="没有提供更新字段")
        
        update_fields.append("UpdatedAt = GETDATE()")
        params.append(plan_id)
        
        query = f"UPDATE TrainingPlans SET {', '.join(update_fields)} WHERE PlanID = ?"
        cursor.execute(query, params)
        
        conn.commit()
        
        # 获取更新后的计划
        cursor.execute("""
            SELECT PlanID, PatientID, StageID, PlanName,
                   StartDate, EndDate, WeeklySessions, SessionDuration,
                   TrainingContent, TrainingGoals, TrainingIntensity,
                   Precautions, Status, ActualCompletionDate, CreatedAt
            FROM TrainingPlans 
            WHERE PlanID = ?
        """, plan_id)
        
        updated_plan = cursor.fetchone()
        
        intensity_display = {
            'low': '低强度',
            'medium': '中等强度',
            'high': '高强度'
        }
        status_display = {
            'pending': '待开始',
            'active': '进行中',
            'completed': '已完成',
            'paused': '已暂停'
        }
        
        return {
            "id": updated_plan.PlanID,
            "patient_id": updated_plan.PatientID,
            "patient_name": existing_plan.PatientName,
            "stage_id": updated_plan.StageID,
            "stage_name": stage_name,
            "name": updated_plan.PlanName,
            "start_date": updated_plan.StartDate,
            "end_date": updated_plan.EndDate,
            "weekly_sessions": updated_plan.WeeklySessions,
            "session_duration": updated_plan.SessionDuration,
            "training_content": updated_plan.TrainingContent,
            "training_goals": updated_plan.TrainingGoals,
            "training_intensity": updated_plan.TrainingIntensity,
            "training_intensity_display": intensity_display.get(updated_plan.TrainingIntensity, updated_plan.TrainingIntensity),
            "precautions": updated_plan.Precautions,
            "status": updated_plan.Status,
            "status_display": status_display.get(updated_plan.Status, updated_plan.Status),
            "actual_completion_date": updated_plan.ActualCompletionDate,
            "total_training_minutes_per_week": updated_plan.WeeklySessions * updated_plan.SessionDuration,
            "created_at": updated_plan.CreatedAt.strftime("%Y-%m-%d %H:%M:%S") if updated_plan.CreatedAt else None
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"更新训练计划失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.delete("/{plan_id}")
async def delete_training_plan(plan_id: int, current_user: dict = Depends(get_current_user)):
    """删除训练计划"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("UPDATE TrainingPlans SET Status = 'deleted', UpdatedAt = GETDATE() WHERE PlanID = ?", plan_id)
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="训练计划不存在")
        
        conn.commit()
        return {"message": "训练计划删除成功"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"删除训练计划失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/{patient_id}/statistics")
async def get_training_plan_statistics(patient_id: int, current_user: dict = Depends(get_current_user)):
    """获取训练计划统计信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 获取训练计划统计
        cursor.execute("""
            SELECT 
                COUNT(*) as TotalPlans,
                SUM(CASE WHEN Status = 'active' THEN 1 ELSE 0 END) as ActivePlans,
                SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as CompletedPlans,
                SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as PendingPlans,
                AVG(WeeklySessions * SessionDuration) as AvgWeeklyMinutes
            FROM TrainingPlans 
            WHERE PatientID = ? AND Status != 'deleted'
        """, patient_id)
        
        stats = cursor.fetchone()
        
        # 计算依从率（完成计划数 / 总计划数）
        compliance_rate = 0
        if stats.TotalPlans > 0:
            compliance_rate = (stats.CompletedPlans / stats.TotalPlans) * 100
        
        return {
            "total_plans": stats.TotalPlans,
            "active_plans": stats.ActivePlans,
            "completed_plans": stats.CompletedPlans,
            "pending_plans": stats.PendingPlans,
            "compliance_rate": round(compliance_rate, 1),
            "average_weekly_minutes": round(float(stats.AvgWeeklyMinutes) if stats.AvgWeeklyMinutes else 0, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取训练计划统计失败: {str(e)}")
    finally:
        cursor.close()
        conn.close()