import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Comapny is required"],
            ref: "Company",
            index: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowecase: true,
            unique: true,
            trim: true,
            index: true,
        },
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            default: null,
        },
        userType: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            enum: {
                values: ["owner", "employee", "client"],
                message:
                    "User type must be owner either: owner, employee, or client",
            },
        },
        avatar: {
            type: String,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
        },
        googleId: {
            type: String,
            index: true,
            default: null,
        },
        refreshToken: {
            type: String,
            index: true,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

/* userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
}) */

/* userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
} */

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = mongoose.model("User", userSchema);
