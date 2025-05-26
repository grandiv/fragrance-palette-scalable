export const errorHandler = (err, req, res, next) => {
  console.error("Error occurred:", err);

  // Default error
  let error = {
    message: err.message || "Internal Server Error",
    status: err.status || 500,
  };

  // Prisma errors
  if (err.code === "P2002") {
    error = {
      message: "Duplicate entry",
      status: 400,
    };
  }

  if (err.code === "P2025") {
    error = {
      message: "Record not found",
      status: 404,
    };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = {
      message: "Invalid token",
      status: 401,
    };
  }

  if (err.name === "TokenExpiredError") {
    error = {
      message: "Token expired",
      status: 401,
    };
  }

  // Validation errors
  if (err.name === "ValidationError") {
    error = {
      message: "Validation failed",
      status: 400,
    };
  }

  // MongoDB/Database connection errors
  if (err.name === "MongoNetworkError" || err.code === "ECONNREFUSED") {
    error = {
      message: "Database connection failed",
      status: 503,
    };
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err,
    }),
  });
};
