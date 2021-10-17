const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const session = require("express-session");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const passport = require("passport");
const User = require("./models/user");
const methodOverride = require("method-override");

dotenv.config({ path: "./config.env" });
mongoose.connect(process.env.DATABASE, console.log("connectdb"));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "jjwekndjnejekme",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(methodOverride("_method"));
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});

app.use("/", userRoutes);
app.use("/", adminRoutes);
app.use("*", (req, res) => res.redirect("/"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server running at ${PORT}`));
