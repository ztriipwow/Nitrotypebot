// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-very-secret-key', // CHANGE this to a strong secret
  resave: false,
  saveUninitialized: true
}));

// Serve static files if needed
app.use(express.static(path.join(__dirname, 'public')));

// ---- LOGIN PAGE ----
app.get('/login', (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="POST">
      <input type="password" name="password" placeholder="Enter password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

app.post('/login', (req, res) => {
  const PASSWORD = 'mypassword123'; // <-- Change this to your own password
  if (req.body.password === PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/private');
  } else {
    res.send('Incorrect password. <a href="/login">Try again</a>.');
  }
});

// ---- PRIVATE INPUT PAGE ----
app.get('/private', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login');

  res.send(`
    <h2>Private Input Page</h2>
    <form method="POST" action="/submit">
      <input name="secretInput" placeholder="Type something secret" required/>
      <button type="submit">Submit</button>
    </form>
    <p><a href="/logout">Logout</a></p>
  `);
});

// ---- SUBMIT INPUT ----
app.post('/submit', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login');

  const input = req.body.secretInput;

  // You can store this in memory, a file, or database
  console.log('Private input received:', input);

  res.send(`
    <p>Input received! Only you can see this.</p>
    <p><a href="/private">Go back</a></p>
  `);
});

// ---- LOGOUT ----
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));
