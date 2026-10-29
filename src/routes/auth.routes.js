const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { AppError } = require('../lib/errors');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { authenticate } = require('../middlewares/auth');

// Đăng ký
router.post('/register', async (req, res) => {
    const { username, fullname, password } = req.body || {};
    if (!username || !fullname || !password) {
        throw new AppError(400, 'Cần có username, fullname và password');
    }
    if (password.length < 6) {
        throw new AppError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) throw new AppError(409, 'Username đã tồn tại');

    const role = await prisma.role.findUnique({ where: { rolename: 'customer' } });
    const membership = await prisma.membership.findUnique({ where: { mname: 'Standard' } });
    if (!role || !membership) {
        throw new AppError(500, 'Chưa có dữ liệu mẫu, hãy chạy npm run seed');
    }

    const user = await prisma.user.create({
        data: {
            username,
            fullname,
            password: await bcrypt.hash(password, 10),
            roleid: role.roleid,
            mid: membership.mid,
        },
        select: { uid: true, username: true, fullname: true },
    });

    res.status(201).json(user);
});

// Đăng nhập
router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        throw new AppError(400, 'Cần có username và password');
    }

    const user = await prisma.user.findUnique({
        where: { username },
        include: { role: true },
    });
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) throw new AppError(401, 'Sai username hoặc mật khẩu');

    const token = jwt.sign({ role: user.role.rolename }, jwtSecret, {
        subject: String(user.uid),
        expiresIn: jwtExpiresIn,
    });

    res.json({ token, tokenType: 'Bearer' });
});

// Xem thông tin của chính mình (cần token)
router.get('/me', authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { uid: req.user.uid },
        select: {
            uid: true,
            username: true,
            fullname: true,
            role: { select: { rolename: true } },
            membership: { select: { mname: true, score: true } },
        },
    });
    if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
    res.json(user);
});

module.exports = router;