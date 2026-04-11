import { model, models, Schema } from "mongoose";

const userSchema = new Schema({
  githubId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
});

const User = models.User || model("User", userSchema);

export default User;
