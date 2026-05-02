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
