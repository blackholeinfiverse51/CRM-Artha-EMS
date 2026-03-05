const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const routes = require('./src/routes');

const PORT = process.env.INTEGRATION_PORT || 4300;

const app = express();
app.use(morgan('tiny'));
app.use(bodyParser.json({ limit: '1mb' }));

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// mount integration routes
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Integration service listening on :${PORT}`);
});
