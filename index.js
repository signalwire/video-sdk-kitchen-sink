const express = require('express');
require('dotenv').config()

const PORT = process.env.PORT || 5000
const app = express();
const http = require('http').createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
var expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);

app.get('/', async (req, res) => {
  res.render('index');
});

app.get('/room', async (req, res) => {
  var room = req.query.room;
  var user = req.query.user;
  var mod = req.query.mod;
  console.log({room, user, mod})
  res.render('room');
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening to ${PORT}`);
});