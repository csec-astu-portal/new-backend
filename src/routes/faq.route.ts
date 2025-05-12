import { Router } from "express";
import { createFaq, deleteFaq, listFaqs } from "../controllers/faq.controller";

const faqRouter = Router();

faqRouter.get("/", listFaqs);
faqRouter.post("/", createFaq);
faqRouter.delete("/:id", deleteFaq);

export default faqRouter;
