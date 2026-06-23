import fp from 'fastify-plugin';

export const errorHandler = fp(async (fastify) => {
  fastify.setErrorHandler(function (error, request, reply) {
    // If it's a validation error from Zod
    if (error.validation) {
      this.log.warn({ req: request, err: error }, 'Validation failed');
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.validation
      });
    }

    // Default fastify error formatting
    if (error.statusCode >= 400 && error.statusCode < 500) {
      this.log.info({ req: request, err: error }, 'Client error');
      return reply.status(error.statusCode).send(error);
    }

    // Unhandled 500 Server Errors
    this.log.error({ req: request, err: error }, 'Unhandled Internal Server Error');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.'
    });
  });
});
