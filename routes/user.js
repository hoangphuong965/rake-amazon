const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmails");
const crypto = require("crypto");

//=============check authenticated-----------
function isAuthen(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error_msg", "Please login");
  res.redirect("/login");
}

// =============logout==============
router.get("/logout", (req, res) => {
  req.logOut();
  req.flash("success_msg", "You have been logout");
  res.redirect("/login");
});

// =============login================
router.get("/login", (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("./users/login");
});
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: "Invalid email or password. Try again",
  })
);

// ==============signup===============
router.get("/register", isAuthen, (req, res, next) => {
  res.render("./users/register");
});
router.post("/register", (req, res) => {
  let { name, email, password } = req.body;
  let userData = {
    name,
    email,
  };
  User.register(userData, password, (err, user) => {
    if (err) {
      req.flash("error_msg", `${err}`);
      res.redirect("/register");
    }
    req.flash("success_msg", "Acount created successfully");
    res.redirect("/register");
  });
});

//====================forgot=================
router.get("/forgot", (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("./users/forgot");
});
router.post("/forgot", async (req, res, next) => {
  let recoveryPassword = "";
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error_msg", "Not found email 📬");
    return res.redirect("/forgot");
  }
  const token = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${req.protocol}://${req.get("host")}/reset/${token}`;
  const message = `Your password reset :\n\n${resetUrl}\n\nIf you have not requested this email, then ignore it.`;
  try {
    await sendEmail({
      email: user.email,
      subject: "myWalmart Password Recovery",
      message,
    });
    req.flash("success_msg", "Please check email 📬");
    res.redirect("/forgot");
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler(error.message, 500));
  }
});

// ============== reset password ============
router.get("/reset/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const resetToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      req.flash(
        "error_msg",
        "Password reset token invalid or has been expired"
      );
      return res.redirect("./users/forgot");
    }
    res.render("./users/newPassword", { token: resetToken });
  } catch (error) {
    req.flash("error_msg", `Error: ${error}`);
    res.redirect("./users/forgot");
  }
});
router.post("/reset/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      req.flash(
        "error_msg",
        "Password reset token invalid or has been expired"
      );
      return res.redirect("./users/forgot");
    }
    await user.setPassword(req.body.password, (err) => {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.save();
    });
    const resetUrl = `${req.protocol}://${req.get("host")}/login`;
    const message = `Hello ${user.name} your password changed successfully:\n\n${resetUrl}\n\n.`;
    await sendEmail({
      email: user.email,
      subject: "myWalmart Password Your Changed",
      message,
    });
    req.flash("success_msg", "Your password changed successfully");
    res.redirect("./users/login");
  } catch (error) {
    req.flash("error_msg", `Error: ${error}`);
    res.redirect("./users/forgot");
  }
});

// ================== all users ===============
router.get("/users/all", isAuthen, async (req, res, next) => {
  const users = await User.find({});
  res.render("./users/alluser", { users });
});

//====================get single user===================
router.get("/edit/:id", async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  res.render("./users/editUser", { user });
});
router.put("/edit/:id", async (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  await User.findByIdAndUpdate(req.params.id, { name, email });
  const users = await User.find({});
  res.render("./users/alluser", { users });
  req.flash("success_msg", "You have been updated");
});

// ==================== delete user ================
router.delete("/delete/user/:id", async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);
  const users = await User.find({});
  res.render("./users/alluser", { users });
});
module.exports = router;
