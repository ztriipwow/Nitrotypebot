// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-very-secret-key', // <-- CHANGE this
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// File to store inputs
const INPUT_FILE = path.join(__dirname, 'inputs.json');
if (!fs.existsSync(INPUT_FILE)) fs.writeFileSync(INPUT_FILE, JSON.stringify([]));

let clients = []; // connected SSE clients

// ---- PUBLIC INPUT FORM ----
app.get('/', (req, res) => {
  res.send(`
    <h2>Public Input Form</h2>
    <form method="POST" action="/submit">
      <input name="userInput" placeholder="Type something" required />
      <button type="submit">Submit</button>
    </form>
    <p>Anyone can submit here, but only the admin sees the results.</p>
  `);
});

app.post('/submit', (req, res) => {
  const input = req.body.userInput;
  if (!input) return res.send('No input received.');

  const currentInputs = JSON.parse(fs.readFileSync(INPUT_FILE));
  currentInputs.push({ input, date: new Date().toISOString() });
  fs.writeFileSync(INPUT_FILE, JSON.stringify(currentInputs, null, 2));

  // Notify all connected SSE clients
  const data = JSON.stringify({ input, date: new Date().toISOString() });
  clients.forEach(client => client.res.write(`data: ${data}\n\n`));

  res.send('Input submitted successfully! <a href="/">Go back</a>');
});

// ---- LOGIN PAGE ----
app.get('/login', (req, res) => {
  res.send(`
    <h2>Admin Login</h2>
    <form method="POST">
      <input type="password" name="password" placeholder="Enter password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

app.post('/login', (req, res) => {
  const PASSWORD = 'mypassword123'; // <-- Change this
  if (req.body.password === PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/private');
  } else {
    res.send('Incorrect password. <a href="/login">Try again</a>.');
  }
});

// ---- PRIVATE ADMIN PAGE ----
app.get('/private', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login');

  const inputs = JSON.parse(fs.readFileSync(INPUT_FILE));
  let inputHtml = '<ul id="input-list">';
  inputs.forEach(item => {
    inputHtml += `<li>${item.date}: ${item.input}</li>`;
  });
  inputHtml += '</ul>';

  res.send(`
    <h2>Private Inputs (Live Updates)</h2>
    ${inputHtml}
    <p><a href="/logout">Logout</a></p>

    <script>
      const evtSource = new EventSource('/stream');
      const list = document.getElementById('input-list');
      evtSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        const li = document.createElement('li');
        li.textContent = data.date + ': ' + data.input;
        list.appendChild(li);
      }
    </script>
  `);
});

// ---- SSE STREAM ----
app.get('/stream', (req, res) => {
  if (!req.session.loggedIn) return res.status(403).end();

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  // Add client
  clients.push({ res });

  // Remove client when disconnected
  req.on('close', () => {
    clients = clients.filter(c => c.res !== res);
  });
});

// ---- LOGOUT ----
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(3000, () => console.log('Server running on port 3000'));
