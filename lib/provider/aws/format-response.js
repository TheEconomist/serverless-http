"use strict";

const isBinary = require("./is-binary");
const Response = require("../../response");
const sanitizeHeaders = require("./sanitize-headers");

module.exports = (event, response, options) => {
  const { statusCode } = response;
  const { headers, multiValueHeaders } = sanitizeHeaders(
    Response.headers(response)
  );

  let cookies = [];

  if (multiValueHeaders["set-cookie"]) {
    cookies = multiValueHeaders["set-cookie"];
  }

  const isBase64Encoded = isBinary(headers, options);
  const encoding = isBase64Encoded ? "base64" : "utf8";
  let body = Response.body(response).toString(encoding);

  if (headers["transfer-encoding"] === "chunked" || response.chunkedEncoding) {
    console.log("in chunked encoding land with a", headers["content-encoding"]);
    const raw = Response.body(response).toString().split("\r\n");
    const type = headers["content-encoding"];
    if (type === "gzip") {
      body = raw;
    } else {
      // console.log("this is the raw result", raw);
      const parsed = [];
      for (let i = 0; i < raw.length; i += 2) {
        const size = parseInt(raw[i], 16);
        const value = raw[i + 1];
        if (value) {
          parsed.push(value.substring(0, size));
        }
      }
      body = parsed.join("");
      // console.log("body", body);
    }
    console.log("we have a body of");
    console.log(body);
  }

  let formattedResponse = { statusCode, headers, isBase64Encoded, body };

  if (event.version === "2.0" && cookies.length) {
    formattedResponse["cookies"] = cookies;
  }

  if (
    (!event.version || event.version === "1.0") &&
    Object.keys(multiValueHeaders).length
  ) {
    formattedResponse["multiValueHeaders"] = multiValueHeaders;
  }

  return formattedResponse;
};
