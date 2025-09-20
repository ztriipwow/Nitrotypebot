const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = "data.json";

// Load data from file, or start empty
let allInputs = [];
if (fs.existsSync(DATA_FILE)) {
  allInputs = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(allInputs, null, 2));
}

// Add new input
app.post("/submit", (req, res) => {
  allInputs.push(req.body);
  saveData();
  res.json({ success: true, allInputs });
});

// Get all inputs
app.get("/inputs", (req, res) => {
  res.json(allInputs);
});

app.listen(3000, () => console.log("✅ Server running at http://localhost:3000"));
