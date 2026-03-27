自习室精简版交付包（离线可运行）
====================================

环境要求
- Java 17+、MySQL 8+、Redis（默认 127.0.0.1:6379 无密码）
- Python 3（用于本地静态文件服务；也可用任意 Web 服务器/Nginx）

初始化数据库
1) 创建数据库：ruoyi_vue_pro_studyroom（字符集 utf8mb4）
2) 导入 SQL：sql/studyroom-init.sql（只包含自习室相关表和演示数据）

启动后端
1) 进入 backend 目录：cd backend
2) 如需修改数据库/Redis 等，编辑 application-dev.yaml
3) 赋权并启动：chmod +x run.sh && ./run.sh
   - 默认端口 48080，配置了 dev 环境，已关闭 MQ/定时任务等可选组件
   - 日志直接输出到控制台；如需文件输出可在配置中调整

启动后台管理端（hash 路由，无需 Nginx 重写）
1) 进入 frontend-admin：cd frontend-admin
2) 赋权并启动：chmod +x run.sh && ./run.sh
3) 访问 http://localhost:9999

启动学员端 H5
1) 进入 frontend-app：cd frontend-app
2) 赋权并启动：chmod +x run.sh && ./run.sh
3) 访问 http://localhost:9998

说明
- 前后端已按 http://localhost:48080/admin-api 打包对齐，保持后端端口不变可直接使用。
- 若需要更改端口/域名，请在重新打包前修改对应前端 .env.* 后再执行 build。
- 只保留了自习室相关表和前后端功能，未包含 MQ/监控/Excel 等额外模块。
