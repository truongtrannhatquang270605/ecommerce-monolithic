const router = require('express').Router();
const prisma = require('../lib/prisma');
const { AppError } = require('../lib/errors');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID không hợp lệ');
    return id;
}

const orderInclude = {
    details: { include: { product: { select: { pname: true } } } },
    shipments: true,
};

// Định dạng đơn trả về: thêm thành tiền từng dòng và tổng tiền
function formatOrder(order) {
    const items = order.details.map((d) => ({
        pid: d.pid,
        pname: d.product.pname,
        qty: d.qty,
        unit_price: d.unit_price,
        subtotal: Number(d.unit_price) * d.qty,
    }));
    return {
        oid: order.oid,
        uid: order.uid,
        createat: order.createat,
        items,
        total: items.reduce((sum, i) => sum + i.subtotal, 0),
        shipments: order.shipments,
    };
}

// Kiểm tra danh sách sản phẩm khách muốn mua
function validateItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError(400, 'items phải là mảng có ít nhất 1 phần tử');
    }
    const seen = new Set();
    for (const item of items) {
        if (!item || !Number.isInteger(item.pid) || item.pid <= 0) {
            throw new AppError(400, 'Mỗi phần tử cần có pid là số nguyên dương');
        }
        if (!Number.isInteger(item.qty) || item.qty <= 0) {
            throw new AppError(400, 'Mỗi phần tử cần có qty là số nguyên dương');
        }
        if (seen.has(item.pid)) {
            throw new AppError(400, `Sản phẩm pid=${item.pid} bị lặp, hãy gộp số lượng`);
        }
        seen.add(item.pid);
    }
}

// Tạo đơn
router.post('/', async (req, res) => {
    const items = (req.body || {}).items;
    validateItems(items);

    const order = await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
            where: { pid: { in: items.map((i) => i.pid) } },
        });
        const productMap = new Map(products.map((p) => [p.pid, p]));

        for (const item of items) {
            const product = productMap.get(item.pid);
            if (!product) throw new AppError(404, `Không tìm thấy sản phẩm pid=${item.pid}`);

            // Trừ kho chỉ khi còn đủ hàng; nếu không có dòng nào bị ảnh hưởng thì hết hàng
            const result = await tx.product.updateMany({
                where: { pid: item.pid, quantity: { gte: item.qty } },
                data: { quantity: { decrement: item.qty } },
            });
            if (result.count === 0) {
                throw new AppError(409, `Sản phẩm "${product.pname}" không đủ tồn kho`);
            }
        }

        return tx.order.create({
            data: {
                uid: req.user.uid,
                details: {
                    create: items.map((item) => ({
                        pid: item.pid,
                        qty: item.qty,
                        unit_price: productMap.get(item.pid).price,
                    })),
                },
                shipments: { create: { status: 'PENDING' } },
            },
            include: orderInclude,
        });
    });

    res.status(201).json(formatOrder(order));
});

// Danh sách đơn: admin thấy tất cả, customer chỉ thấy của mình
router.get('/', async (req, res) => {
    const where = req.user.role === 'admin' ? {} : { uid: req.user.uid };
    const orders = await prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { oid: 'desc' },
    });
    res.json(orders.map(formatOrder));
});

// Chi tiết một đơn
router.get('/:id', async (req, res) => {
    const order = await prisma.order.findUnique({
        where: { oid: parseId(req.params.id) },
        include: orderInclude,
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (req.user.role !== 'admin' && order.uid !== req.user.uid) {
        throw new AppError(403, 'Bạn không có quyền xem đơn này');
    }
    res.json(formatOrder(order));
});

module.exports = router;