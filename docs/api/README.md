# 后端API接口文档

## 主要接口

### 1. /generate_training_plan
- 方法：POST
- 参数：patient_id, category, ability_level
- 返回：个性化训练计划（推荐动作、组数、难度等）

### 2. /check_achievements
- 方法：POST
- 参数：patient_id, category, ability_level, session_data
- 返回：解锁成就列表

### 3. /detailed_feedback
- 方法：POST
- 参数：features, exercise_type, category, ability_level, confidence
- 返回：技术反馈建议

### 4. 其他路由
- 详见 backend/routers/ 下各 py 文件

## 返回格式
所有接口均返回 JSON 格式，包含 status、data 或 error 字段。

## 示例
```
POST /generate_training_plan
{
  "patient_id": "user001",
  "category": "upper_limb",
  "ability_level": "intermediate"
}
```

## 错误码说明
- 422：参数缺失或格式错误
- 404：接口不存在
- 500：服务器内部错误

---
如需详细参数、示例、模型说明，请补充需求。