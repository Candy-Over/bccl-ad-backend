import { Router } from "express";
import { getDetails, getEditionDumTotal, getPageDiffSummery } from "../controller/dump-list.controller.js";

const dumpList = Router();

// Route to get paginated CSV data
dumpList.get("/", getPageDiffSummery);
dumpList.get("/edition-dum-total", getEditionDumTotal)
dumpList.get("/details/:id", getDetails);

export default dumpList;