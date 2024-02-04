const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/user.model");
const { TokenModel } = require("../models/revoketToken.model");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
require("dotenv").config();

// Refresh Token get request :
const refreshToken = (req, res) => {
  const token = jwt.sign({}, process.env.secret_refresh, { expiresIn: 60 * 5 });
  res.cookie("refreshToken", token);
  res.send({ msg: "token generated" });
};

// post request to register the user :
const createUser = async (req, res) => {
  const { firstName, lastName, email, password, birthday } = req.body;
  // console.log(req.body, req.headers);
  try {
    // hash the password
    const hashPass = bcrypt.hashSync(password, 9);
    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      password: hashPass,
      birthday,
    });
    res.send(new ApiResponse(200, user, "User created successfully"));
  } catch (error) {
    console.log(error);
    res.send({ message: error.message, error: [error] });
  }
};

// get request to retrieve a user :
const findUser = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await UserModel.findById(id);
    if (!user) throw new ApiError(400, "User not found");
    res.send(new ApiResponse(200, user, "User found"));
  } catch (error) {
    res.send({ message: error.message, error: [error] });
  }
};

// get request to retrieve all users :
const findAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find();
    if (!users) throw new ApiError(400, "Users not found");

    res.send(new ApiResponse(200, users, "Users retrieved successfully"));
  } catch (error) {
    res.send({ message: error.message, error: [error] });
  }
};

//put request to update a user :
const updateUser = async (req, res) => {
  console.log("req come", req.body, req.params.id)
  const id = req.params.id;
  try {
    const user = await UserModel.findByIdAndUpdate(id, req.body);
    if (!user) throw new ApiError(400, "User not found");
    res.send(new ApiResponse(200, user, "User updated successfully"));
  } catch (error) {
    res.send({ message: error.message, error: [error] });
  }
};

//get request to delete a user :
const deleteUser = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await UserModel.findByIdAndDelete(id);
    if (!user) throw new ApiError(400, "User not found");

    res.send(new ApiResponse(200, user, "User deleted successfully"));
  } catch (error) {
    res.send({ message: error.message, error: [error] });
  }
};

// post request for login :
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(400, "invalid email");

    const isPass = bcrypt.compareSync(password, user.password); // true
    if (!isPass) throw new ApiError(400, "invalid password");

    const refreshToken = jwt.sign({}, process.env.refrestSecret, {
      expiresIn: 60 * 5,
    });
    const accessToken = jwt.sign({}, process.env.accessSecret, {
      expiresIn: 60,
    });
    // console.log(accessToken, refreshToken);
    if (!refreshToken && !accessToken)
      throw new ApiError(400, "token are required");

    res.cookie("accessToken", accessToken);
    res.cookie("refreshToken", refreshToken);
    res.send(new ApiResponse(200, user, "User logged in successfully"));
  } catch (error) {
    res.send({ message: error.message, error: [error] });
  }
};

// get request for logout :
const logoutUser = async (req, res) => {
  const token = req.cookies.refreshToken;
  try {
    if (!token) throw new ApiError(400, "token is required");

    const revokedToken = await TokenModel.findOne({ token });
    if (revokedToken) {
      res
        .status(400)
        .send(
          new ApiResponse(400, null, [
            "User already logged out",
            { revokedAt: revokedToken.revokedAt },
          ])
        );
    }

    // blacklist the token
    await TokenModel.create({ token });
    res.send(new ApiResponse(200, null, "User logged out successfully"));
  } catch (error) {
    res.send({ message: error.message, error: [error] });
  }
};

module.exports = {
  createUser,
  loginUser,
  logoutUser,
  refreshToken,
  findUser,
  findAllUsers,
  updateUser,
  deleteUser,
};