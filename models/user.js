const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");
const bcrypt = require("bcrypt");

let UserSchema = new Schema({
  name: String,
  email: String,
  password: {
    type: String,
    select: false,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});
UserSchema.plugin(passportLocalMongoose, { usernameField: "email" });

// generate password reset token
UserSchema.methods.getResetPasswordToken = function () {
  // generate token
  const resetToken = crypto.randomBytes(20).toString("hex");
  // hash and set to resetPasswordToken
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  // set token expires time
  this.resetPasswordExpires = Date.now() + 30 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
