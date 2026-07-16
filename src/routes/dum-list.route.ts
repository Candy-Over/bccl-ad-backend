import { Router } from "express";
import { getDetails, getPageDiffSummery } from "../controller/dump-list.controller.js";

const dumpList = Router();

// Route to get paginated CSV data
dumpList.get("/", getPageDiffSummery);
dumpList.get("/details/:id", getDetails);

export default dumpList;