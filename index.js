const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");
const { Schema } = mongoose;
mongoose.connect(process.env.DB_URL);

const UserSchema = new Schema({
  username: String,
});

const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No users");
  } else {
    res.json(users);
  }
});

app.post("/api/users", async (req, res) => {
  const userObj = new User({
    username: req.body.username,
  });

  try {
    const user = await userObj.save();
    res.json(user);
  } catch (err) {
    console.log(err);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.send("Could not find user");
    } else {
      const exercise = new Exercise({
        user_id: userId,
        description,
        duration,
        date: date ? new Date(date) : new Date(),
      });
      const exerciseObj = await exercise.save();
      res.json({
        _id: user._id,
        username: user.username,
        date: exerciseObj.date.toDateString(),
        duration: exerciseObj.duration,
        description: exerciseObj.description,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  const user = await User.findById(userId);

  if (!user) {
    res.send("Could not find user");
    return;
  }

  let dateObj = {};
  if (from) {
    dateObj["$gte"] = new Date(from);
  }
  if (to) {
    dateObj["$lte"] = new Date(to);
  }
  let filter = {
    user_id: userId,
  };

  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(+limit ?? 500);

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
