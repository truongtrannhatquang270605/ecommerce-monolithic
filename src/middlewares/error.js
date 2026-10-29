const { AppError } = require('../lib/errors');

function notFound(req, res) {
    res.status(404).json({ message: `Không tìm thấy ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.status).json({ message: err.message });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'JSON gửi lên không hợp lệ' });
    }
    if (err.code === 'P2025') {
        return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
    }
    if (err.code === 'P2003') {
        return res.status(409).json({ message: 'Bản ghi đang được tham chiếu, không thể xóa' });
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
}

module.exports = { notFound, errorHandler };