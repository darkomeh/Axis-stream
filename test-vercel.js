const app = require('express')();
app.get('/api/test', (req, res) => res.json({ url: req.url }));
module.exports = app;
