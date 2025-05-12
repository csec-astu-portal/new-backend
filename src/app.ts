import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import memberRoutes from "./routes/member.routes";
import divisionRoutes from "./routes/division.routes";
import authRoutes from "./routes/auth.routes";
import roleRoutes from "./routes/role.routes";
import reminderRoutes from "./routes/reminder.routes";
import groupRoutes from "./routes/group.routes";
import divisionHeadRoutes from "./routes/division-head.routes";
import groupMemberRoutes from "./routes/group-member.routes";
import articleRoutes from "./routes/article.routes";
import simpleArticleRoutes from "./routes/simple-article.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files from the public directory
app.use(express.static('public'));

// Register your routes
app.use("/api/members", memberRoutes);
app.use("/api/divisions", divisionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/simple-articles", simpleArticleRoutes);
app.use("/api/division-heads", divisionHeadRoutes);
app.use("/api/group-members", groupMemberRoutes);

export default app;