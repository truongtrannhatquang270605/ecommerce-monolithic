# E-commerce Monolithic API (MVP)

RESTful API cho hệ thống thương mại điện tử, xây dựng bằng Node.js, Express, Prisma và PostgreSQL.

## Chức năng
- Xác thực JWT (đăng ký, đăng nhập, phân quyền admin/customer)
- Quản lý sản phẩm
- Đặt hàng (trừ tồn kho trong transaction) và quản lý vận chuyển
- Health check, chạy bằng Docker Compose

## Công nghệ
Node.js 22, Express 5, Prisma 6, PostgreSQL 16, JWT, bcrypt, Docker Compose

## Cấu trúc thư mục
```
prisma/         schema, migrations, seed
src/
  config/       đọc biến môi trường
  lib/          Prisma client, lớp lỗi
  middlewares/  xác thực JWT, xử lý lỗi
  routes/       auth, health, product, order, shipment
postman/        collection để test API
```

## Chạy bằng Docker Compose
1. Tạo file cấu hình từ mẫu rồi điền giá trị thật (đặc biệt `JWT_SECRET`):
   ```bash
   cp .env.example .env
   ```
2. Khởi động:
   ```bash
   docker compose up -d --build
   docker compose exec app npm run seed
   ```
3. Kiểm tra: `curl http://localhost:3000/health`

Tài khoản mẫu sau khi seed: `admin / admin123` (chỉ dùng để thử nghiệm).

## Biến môi trường
| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng ứng dụng |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Thông tin PostgreSQL |
| `DATABASE_URL` | Chuỗi kết nối khi chạy trên máy (trong Docker, Compose tự ghi đè) |
| `JWT_SECRET` | Khóa ký JWT |
| `JWT_EXPIRES_IN` | Thời hạn token, ví dụ `1d` |

## API
| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/health` | công khai |
| POST | `/auth/register`, `/auth/login` | công khai |
| GET | `/auth/me` | đã đăng nhập |
| GET | `/products`, `/products/:id` | công khai |
| POST, PUT, DELETE | `/products` | admin |
| POST, GET | `/orders`, `/orders/:id` | đã đăng nhập (customer chỉ thấy đơn của mình) |
| GET | `/shipments/order/:oid` | chủ đơn hoặc admin |
| POST, PUT | `/shipments` | admin |

Gửi token trong header: `Authorization: Bearer <token>`.

## Chạy trên máy (không dùng Docker cho app)
```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```
Cần một PostgreSQL đang chạy theo `DATABASE_URL`.

## Postman
Nhập file `postman/ecommerce-monolithic.postman_collection.json` vào Postman rồi chạy **Run collection**.