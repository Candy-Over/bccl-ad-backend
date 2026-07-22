import { Router } from "express";
import { listMasterFeedback, createMasterFeedback } from "../controller/master-feedback.controller.js";

const masterFeedbackRouter = Router();

masterFeedbackRouter.get("/", listMasterFeedback);
masterFeedbackRouter.post("/", createMasterFeedback);

export default masterFeedbackRouter;
