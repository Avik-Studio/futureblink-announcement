import mongoose from "mongoose";

// Every save inserts a new document, building an audit history of announcements.
// `createdAt` (added by timestamps) is the audit timestamp required by the task.
const announcementSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    text: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);
