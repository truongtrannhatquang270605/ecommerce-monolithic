const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { AppError } = require('../lib/errors');

function authenticate(req, res, next) {
    const [type, token] = (req.headers.authorization || '').split(' ');
    if (type !== 'Bearer' || !token) {
        throw new AppError(401, 'Thiếu token');
    }

    let payload;
    try {
        payload = jwt.verify(token, jwtSecret);
    } catch (err) {
        throw new AppError(401, 'Token không hợp lệ hoặc đã hết hạn');
    }

    req.user = { uid: Number(payload.sub), role: payload.role };
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new AppError(403, 'Không đủ quyền truy cập');
        }
        next();
    };
}

module.exports = { authenticate, requireRole };