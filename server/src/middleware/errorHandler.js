/**
 * Global Express error handling middleware
 */
export function errorHandler(err, _req, res, _next) {
  console.error("[server] Error:", err);

  // Sequelize Unique Constraint Violation
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      error: "A record with this information already exists.",
      details: err.errors?.map((e) => e.message) || [],
    });
  }

  // Sequelize Validation Error
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      error: "Database validation failed.",
      details: err.errors?.map((e) => e.message) || [],
    });
  }

  // Generic internal server error
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "An internal server error occurred.",
  });
}
