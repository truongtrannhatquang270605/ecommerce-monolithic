const router = require('express').Router();
const prisma = require('../lib/prisma');
const { AppError } = require('../lib/errors');
const { authenticate, requireRole } = require('../middlewares/auth');

router.use(authenticate);

const STATUSES = ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID không hợp lệ');
    return id;
}

// Xem vận chuyển của một đơn (chủ đơn hoặc admin)
router.get('/order/:oid', async (req, res) => {
    const order = await prisma.order.findUnique({ where: { oid: parseId(req.params.oid) } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (req.user.role !== 'admin' && order.uid !== req.user.uid) {
        throw new AppError(403, 'Bạn không có quyền xem đơn này');
    }
    const shipments = await prisma.shipment.findMany({
        where: { oid: order.oid },
        orderBy: { shipid: 'asc' },
    });
    res.json(shipments);
});

// Tạo vận chuyển cho một đơn (admin)
router.post('/', requireRole('admin'), async (req, res) => {
    const { oid } = req.body || {};
    if (!Number.isInteger(oid) || oid <= 0) throw new AppError(400, 'Cần có oid là số nguyên dương');

    const order = await prisma.order.findUnique({ where: { oid } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');

    const shipment = await prisma.shipment.create({ data: { oid, status: 'PENDING' } });
    res.status(201).json(shipment);
});

// Cập nhật trạng thái (admin)
router.put('/:id', requireRole('admin'), async (req, res) => {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
        throw new AppError(400, `status phải là một trong: ${STATUSES.join(', ')}`);
    }
    const shipment = await prisma.shipment.update({
        where: { shipid: parseId(req.params.id) },
        data: { status },
    });
    res.json(shipment);
});

// Danh sách vận chuyển: admin thấy tất cả, customer chỉ thấy của đơn mình
router.get('/', async (req, res) => {
    const where = req.user.role === 'admin' ? {} : { order: { uid: req.user.uid } };
    const shipments = await prisma.shipment.findMany({
        where,
        orderBy: { shipid: 'asc' },
    });
    res.json(shipments);
});
module.exports = router;