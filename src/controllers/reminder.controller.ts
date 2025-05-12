import { Request, Response } from "express";
import { successResponse, errorResponse } from "../utils/response";
import { sendReminderEmail } from "../services/email.service";

// Define a type for the user in the request
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    freeName?: string;
  };
}

// Define a type for Reminder since it's not in the Prisma client yet
interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  userId: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store for reminders (temporary solution until Prisma is updated)
const reminderStore: Map<string, Reminder> = new Map();

// Create a new reminder
const createReminder = async (req: RequestWithUser, res: Response) => {
  try {
    const { title, description, dueDate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    if (!title || !dueDate) {
      return res.status(400).json(errorResponse("Title and due date are required"));
    }

    // Create the reminder
    const reminderId = `reminder_${Date.now()}`;
    const reminder: Reminder = {
      id: reminderId,
      title,
      description,
      dueDate: new Date(dueDate),
      userId,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in our in-memory store
    reminderStore.set(reminderId, reminder);

    // Send a reminder email if the user has provided an email
    if (req.user?.email && req.user?.freeName) {
      try {
        await sendReminderEmail(req.user.email, req.user.freeName, title, description || 'No additional details provided.');
      } catch (emailError) {
        console.error("Failed to send reminder email:", emailError);
      }
    }

    return res.status(201).json(
      successResponse(reminder, "Reminder created successfully")
    );
  } catch (error) {
    console.error("Create reminder error:", error);
    return res.status(500).json(errorResponse("Failed to create reminder"));
  }
};

// Get all reminders for the current user
const getReminders = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    // Get reminders from our in-memory store
    const userReminders: Reminder[] = Array.from(reminderStore.values())
      .filter(reminder => reminder.userId === userId)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return res.json(
      successResponse(userReminders, "Reminders retrieved successfully")
    );
  } catch (error) {
    console.error("Get reminders error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve reminders"));
  }
};

// Get a specific reminder
const getReminder = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    // Get reminder from our in-memory store
    const reminder = reminderStore.get(id);

    if (!reminder || reminder.userId !== userId) {
      return res.status(404).json(errorResponse("Reminder not found"));
    }

    return res.json(
      successResponse(reminder, "Reminder retrieved successfully")
    );
  } catch (error) {
    console.error("Get reminder error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve reminder"));
  }
};

// Update a reminder
const updateReminder = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, completed } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    // Check if reminder exists and belongs to the user
    const existingReminder = reminderStore.get(id);

    if (!existingReminder || existingReminder.userId !== userId) {
      return res.status(404).json(errorResponse("Reminder not found"));
    }

    // Update the reminder
    const updatedReminder: Reminder = {
      ...existingReminder,
      title: title !== undefined ? title : existingReminder.title,
      description: description !== undefined ? description : existingReminder.description,
      dueDate: dueDate !== undefined ? new Date(dueDate) : existingReminder.dueDate,
      completed: completed !== undefined ? completed : existingReminder.completed,
      updatedAt: new Date()
    };

    // Store the updated reminder
    reminderStore.set(id, updatedReminder);

    return res.json(
      successResponse(updatedReminder, "Reminder updated successfully")
    );
  } catch (error) {
    console.error("Update reminder error:", error);
    return res.status(500).json(errorResponse("Failed to update reminder"));
  }
};

// Delete a reminder
const deleteReminder = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    // Check if reminder exists and belongs to the user
    const existingReminder = reminderStore.get(id);

    if (!existingReminder || existingReminder.userId !== userId) {
      return res.status(404).json(errorResponse("Reminder not found"));
    }

    // Delete the reminder
    reminderStore.delete(id);

    return res.json(
      successResponse(null, "Reminder deleted successfully")
    );
  } catch (error) {
    console.error("Delete reminder error:", error);
    return res.status(500).json(errorResponse("Failed to delete reminder"));
  }
};

export {
  createReminder,
  getReminders,
  getReminder,
  updateReminder,
  deleteReminder
};
