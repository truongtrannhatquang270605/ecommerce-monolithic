const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.role.upsert({
        where: { rolename: 'admin' }, update: {}, create: { rolename: 'admin' },
    });
    await prisma.role.upsert({
        where: { rolename: 'customer' }, update: {}, create: { rolename: 'customer' },
    });

    const standard = await prisma.membership.upsert({
        where: { mname: 'Standard' }, update: {}, create: { mname: 'Standard', score: 0 },
    });
    await prisma.membership.upsert({
        where: { mname: 'Silver' }, update: {}, create: { mname: 'Silver', score: 100 },
    });
    await prisma.membership.upsert({
        where: { mname: 'Gold' }, update: {}, create: { mname: 'Gold', score: 500 },
    });

    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            fullname: 'Administrator',
            password: await bcrypt.hash('admin123', 10),
            roleid: admin.roleid,
            mid: standard.mid,
        },
    });

    if ((await prisma.product.count()) === 0) {
        await prisma.product.createMany({
            data: [
                { pname: 'Áo thun basic', price: 150000, quantity: 100 },
                { pname: 'Quần jeans', price: 350000, quantity: 50 },
                { pname: 'Giày sneaker', price: 800000, quantity: 30 },
            ],
        });
    }
}

main()
    .then(() => console.log('Seed xong'))
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());