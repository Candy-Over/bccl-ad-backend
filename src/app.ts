// import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({
    path: `.env.${process.env.NODE_ENV || "development"}`,
});
import express, { type Request, type Response } from "express";
import csvRouter from "./routes/csv.route.js";
import globalErrorHandler from "./utils/globalErrorHandler.js";
import dumpList from "./routes/dum-list.route.js";
import editionMaster from "./routes/edition-master.route.js";

const app = express();
const PORT = process.env.PORT || 8000
// app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// csv upload
app.use('/csv', csvRouter)
// dump-list
app.use('/dump-list', dumpList)
// edition master
app.use("/edition-master", editionMaster);

// health check endpoint 
app.get("/", (req: Request, res: Response) => {
    return res.status(200).json({ msg: "Hello world" })
})

// Global error handler (last middleware)
app.use(globalErrorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});