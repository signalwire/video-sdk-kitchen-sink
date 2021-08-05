const express = require('express');
require('dotenv').config()

const fetch = require('node-fetch');
const base64 = require('base-64');

const PORT = process.env.PORT || 5000
const app = express();
const http = require('http').createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
var expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);
app.use(express.static('public'))

async function apiRequest(endpoint, payload = {}, method = 'POST') {
  var url = `https://${process.env.SIGNALWIRE_SPACE}${endpoint}`

  var request = {
    method: method, // *GET, POST, PUT, DELETE, etc.
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    headers: {
      'Content-Type': 'application/json',
      "Authorization": `Basic ${base64.encode(`${process.env.SIGNALWIRE_PROJECT_KEY}:${process.env.SIGNALWIRE_TOKEN}`)}`
    }
  }

  if (method != 'GET') {
    request.body = JSON.stringify(payload)
  }  
  const response = await fetch(url, request);
  return await response.json();
}

async function getToken(room, user, mod) {
  var payload = {
    room_name: room,
    user_name: user,
    auto_create_room: true
  }

  var permissions = [
    'room.self.audio_mute',
    'room.self.audio_unmute',
    'room.self.video_mute',
    'room.self.video_unmute',
    'room.self.deaf',
    'room.self.undeaf',
    'room.self.set_input_volume',
    'room.self.set_output_volume',
    'room.self.set_input_sensitivity',
    'room.list_available_layouts',
    'room.set_layout',
    'room.member.video_mute',
    'room.member.audio_mute',
    'room.member.remove'
  ]

  payload.permissions = permissions;
  var response = await apiRequest('/api/video/room_tokens', payload)
  return response.token
}

app.get('/', async (req, res) => {
  res.render('index');
});

app.get('/room', async (req, res) => {
  var token = await getToken(req.query.room, req.query.user, req.query.mod);
  res.render('room', { token });
});

app.get('/sfu', async (req, res) => {
  var token = await getToken(req.query.room, req.query.user, req.query.mod);
  res.render('sfu', { token });
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening to ${PORT}`);
});