import mongoose, { Schema } from "mongoose";

const countrySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            trim: true
        },
        emoji: {
            type: String,
            trim: true
        },
        unicode: {
            type: String,
            trim: true
        },
        dial_code: {
            type: String,
            trim: true
        },
        image: {
            type: String,
            trim: true
        }
    }
)


export const Country = mongoose.model("Country", countrySchema)