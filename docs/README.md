# AI康复平台项目文档

## 项目简介
本项目为多模块AI康复训练平台，集成了前端、后端、数据、模型、硬件接口等多种功能，支持多语言和多种康复场景。

## 目录结构说明
- `backend/`：后端API、模型、路由、国际化等
- `frontend/`：前端页面、脚本、样式、国际化等
- `data/`、`models/`、`saved_models/`：数据与模型相关
- `docs/`：项目文档
- `firmware/`：硬件/嵌入式相关代码
- `mobile_app/`：移动端源码
- `nginx/`：部署与配置
- `requirements.txt`、`docker-compose.yml`、`README.md`：依赖与说明

## 快速开始
1. 安装依赖：`pip install -r requirements.txt`
2. 启动后端：`uvicorn backend.main:app --reload`
3. 启动前端：直接用 VSCode Live Server 或部署到 nginx
4. 访问前端页面，体验智能康复训练

## 主要功能模块
- 智能训练计划生成
- 姿态识别与评估
- 语音助手与多语言支持
- 成就系统与训练统计
- 机器人/硬件接口（C++/嵌入式）

## API文档
详见 `docs/api/` 或后端 `main.py` 路由注释。

## 贡献与协作
- 建议使用 Pull Request 协作开发
- 代码分区清晰，建议按模块提交
- 详细说明见各模块 README

## 其他说明
- 大型模型、数据、日志、虚拟环境等请勿上传至GitHub
- 证书、隐私数据请妥善处理

---
如需详细API、部署、硬件接入等文档，请补充需求。