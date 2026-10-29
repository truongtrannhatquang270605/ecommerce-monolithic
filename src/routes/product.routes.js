const router = require('express').Router();
const prisma = require('../lib/prisma');
const { AppError } = require('../lib/errors');
const { authenticate, requireRole } = require('../middlewares/auth');

const adminOnly = [authenticate, requireRole('admin')];

function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID không hợp lệ');
    return id;
}

// Kiểm tra dữ liệu gửi lên; requireAll = true khi tạo mới
function pickProductData(body, requireAll) {
    body = body || {};
    const data = {};

    if (body.pname !== undefined) {
        if (typeof body.pname !== 'string' || !body.pname.trim() || body.pname.length > 100) {
            throw new AppError(400, 'pname phải là chuỗi từ 1 đến 100 ký tự');
        }
        data.pname = body.pname.trim();
    }
    if (body.price !== undefined) {
        if (typeof body.price !== 'number' || body.price < 0 || body.price >= 100000000) {
            throw new AppError(400, 'price phải là số từ 0 đến dưới 100000000');
        }
        data.price = body.price;
    }
    if (body.quantity !== undefined) {
        if (!Number.isInteger(body.quantity) || body.quantity < 0) {
            throw new AppError(400, 'quantity phải là số nguyên không âm');
        }
        data.quantity = body.quantity;
    }

    if (requireAll && (data.pname === undefined || data.price === undefined)) {
        throw new AppError(400, 'Cần có pname và price');
    }
    if (Object.keys(data).length === 0) {
        throw new AppError(400, 'Không có dữ liệu để cập nhật');
    }
    return data;
}

// Xem danh sách (công khai)
router.get('/', async (req, res) => {
    const products = await prisma.product.findMany({ orderBy: { pid: 'asc' } });
    res.json(products);
});

// Xem một sản phẩm (công khai)
router.get('/:id', async (req, res) => {
    const product = await prisma.product.findUnique({ where: { pid: parseId(req.params.id) } });
    if (!product) throw new AppError(404, 'Không tìm thấy sản phẩm');
    res.json(product);
});

// Thêm (admin)
router.post('/', adminOnly, async (req, res) => {
    const product = await prisma.product.create({ data: pickProductData(req.body, true) });
    res.status(201).json(product);
});

// Sửa (admin)
router.put('/:id', adminOnly, async (req, res) => {
    const product = await prisma.product.update({
        where: { pid: parseId(req.params.id) },
        data: pickProductData(req.body, false),
    });
    res.json(product);
});

// Xóa (admin)
router.delete('/:id', adminOnly, async (req, res) => {
    await prisma.product.delete({ where: { pid: parseId(req.params.id) } });
    res.status(204).end();
});

module.exports = router;