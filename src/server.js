const { port } = require('./config/env');
const app = require('./app');
const prisma = require('./lib/prisma');

const server = app.listen(port, () => {
    console.log(`Server chạy tại http://localhost:${port}`);
});

async function shutdown() {
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);