import { Schema } from "effect";

export class InternalServerError extends Schema.ErrorClass<InternalServerError>(
  "InternalServerError"
)(
  {
    message: Schema.String,
    customErrorCode: Schema.optional(Schema.String)
  },
  {
    description: "InternalServerError",
    httpApiStatus: 500
  }
) {}

export class BadRequestError extends Schema.ErrorClass<BadRequestError>("BadRequestError")(
  {
    message: Schema.String,
    customErrorCode: Schema.optional(Schema.String)
  },
  {
    description: "BadRequestError",
    httpApiStatus: 400
  }
) {}
