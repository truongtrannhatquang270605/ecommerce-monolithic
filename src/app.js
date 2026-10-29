const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/health', require('./routes/health.routes'));
app.use('/auth', require('./routes/auth.routes'));
app.use('/products', require('./routes/product.routes'));
app.use('/orders', require('./routes/order.routes'));
app.use('/shipments', require('./routes/shipment.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;