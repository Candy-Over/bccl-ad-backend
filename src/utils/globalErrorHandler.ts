import type { NextFunction, Request, Response } from "express";
import ApiError from "./ApiError.js";

const globalErrorHandler = (
    err: ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error({
        statusCode,
        message,
        stack: err.stack,
    });

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack,
        }),
    });
};

export default globalErrorHandler;