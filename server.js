const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// File to store data
const DATA_FILE = "data.json";

// Load existing data or start empty
let allInputs = [];
if (fs.existsSync(DATA_FILE)) {
  allInputs = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

// Save function
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(allInputs, null, 2));
}

// API route to add input
app.post("/submit", (req, res) => {
  allInputs.push(req.body);
  saveData();
  res.json({ success: true, allInputs });
});

// API route to fetch inputs
app.get("/inputs", (req, res) => {
  res.json(allInputs);
});

// ✅ Serve frontend from "public" folder
app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
