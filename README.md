# 自习室精简版交付包

一个可离线运行的自习室项目交付包，包含：

- 后端可执行包 `backend/yudao-server.jar`
- 后台管理端静态资源 `frontend-admin/dist`
- 学员端 H5 静态资源 `frontend-app/dist`
- 初始化 SQL `sql/studyroom-init.sql`

当前包已按本地联调环境对齐，默认使用：

- 后端：`http://localhost:48080`
- 后台管理端：`http://localhost:9999`
- 学员端 H5：`http://localhost:9998`

## 目录结构

```text
release-studyroom/
├── backend/           # 后端 jar、配置文件、启动脚本
├── frontend-admin/    # 后台管理端静态文件和启动脚本
├── frontend-app/      # 学员端 H5 静态文件和启动脚本
├── sql/               # 初始化 SQL
├── README.txt         # 原始交付说明
└── README.md          # GitHub 展示说明
```

## 环境要求

- Java 17+
- MySQL 8+
- Redis
- Python 3

默认配置中：

- MySQL 地址：`127.0.0.1:3306`
- Redis 地址：`127.0.0.1:6379`
- Redis 库：`1`

后端配置文件位于 `backend/application-dev.yaml`。如果你的数据库、Redis、端口或账号密码不同，请先修改该文件。

## 快速开始

### 1. 初始化数据库

1. 创建数据库：`ruoyi_vue_pro_studyroom`
2. 字符集建议使用：`utf8mb4`
3. 导入 SQL：

```bash
mysql -u root -p ruoyi_vue_pro_studyroom < sql/studyroom-init.sql
```

如果你不使用 `root`，请换成自己的数据库账号。

### 2. 启动后端

```bash
cd backend
chmod +x run.sh
./run.sh
```

默认行为：

- 使用 `dev` 环境启动
- 默认端口 `48080`
- 默认 JVM 参数：`-Xms512m -Xmx512m`
- 配置文件：`backend/application-dev.yaml`

也可以通过环境变量覆盖端口或 JVM 参数：

```bash
SERVER_PORT=48081 JAVA_OPTS="-Xms1g -Xmx1g" ./run.sh
```

### 3. 启动后台管理端

```bash
cd frontend-admin
chmod +x run.sh
./run.sh
```

启动后访问：`http://localhost:9999`

如需更改端口：

```bash
PORT=10099 ./run.sh
```

### 4. 启动学员端 H5

```bash
cd frontend-app
chmod +x run.sh
./run.sh
```

启动后访问：`http://localhost:9998`

如需更改端口：

```bash
PORT=10098 ./run.sh
```

## 前后端对齐说明

当前前端静态包已经按 `http://localhost:48080/admin-api` 打包对齐。保持后端端口为 `48080` 时，可以直接使用。

如果你需要修改后端域名或端口：

1. 修改前端项目对应的环境变量配置
2. 重新执行前端构建
3. 再替换 `dist` 目录

仅修改静态文件服务端口 `9998`、`9999` 不会影响接口请求；修改后端端口则需要确保前端打包配置同步更新。

## 包内容说明

这个交付包是精简版，只保留了自习室相关能力，未包含完整平台中的额外模块，例如：

- MQ
- 监控
- Excel
- 非自习室业务模块

后端配置里也默认关闭了部分本地不需要的可选组件，便于直接启动。

## Git LFS 说明

仓库中的 `backend/yudao-server.jar` 体积超过 GitHub 普通文件限制，因此已使用 Git LFS 管理。

如果你要重新克隆或拉取这个仓库，建议本机已安装 Git LFS：

```bash
git lfs install
git clone <repo-url>
```

## 使用建议

- 这是交付包，不是完整源码仓库；当前目录主要用于部署、验收和本地演示。
- `backend/application-dev.yaml` 中包含本地示例连接信息，部署到新环境前应先替换数据库、Redis 和相关密钥配置。
- 如需接入 Nginx、域名或 HTTPS，可以把两个前端 `dist` 目录交给任意静态 Web 服务托管。
