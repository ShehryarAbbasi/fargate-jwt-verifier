const AWSXRay = require("aws-xray-sdk");
AWSXRay.captureHTTPsGlobal(require("https"));
AWSXRay.captureHTTPsGlobal(require("http"));
const XRayExpress = AWSXRay.express;
const express = require("express");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");

let jwkCached;
const app = express();
AWSXRay.config([AWSXRay.plugins.ECSPlugin]);

const appVersion = "1";

app.use(express.urlencoded()); // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json()); // Parse JSON bodies (as sent by API clients)

const GetJwk = async (issuer) => {
  let endpoint = `${issuer}/.well-known/jwks.json`;

  try {
    let response = await fetch(endpoint);
    return await response.json();
  } catch (err) {
    throw err;
  }
};

const VerifyJwt = async (localJwk, token) => {
  try {
    console.log("verifying jwk", localJwk);
    console.log("verifying token", token);

    let decodedJwt = jwt.decode(token, { complete: true });
    console.log("decodedJwt", JSON.stringify(decodedJwt));

    let key = localJwk.keys.find(({ kid }) => kid === decodedJwt.header.kid);
    console.log("key found: ", key);
    let pem = jwkToPem(key);
    console.log("pem", pem);
    return jwt.verify(token.toString(), pem, function (err, decoded) {
      if (err) {
        let verificationFailed = {};
        if (appVersion === "2") verificationFailed.token = "❌❌❌❌❌";
        else verificationFailed.token = "====FAILED!!====";
        console.log("verification error", err);
        return verificationFailed;
      }
      let verificationPassed = {};
      if (appVersion === "2") {
        verificationPassed.token = "✅✅✅✅✅";
      } else {
        verificationPassed.token = "====PASSED!!====";
        verificationPassed.decodedJwt = decodedJwt;
        verificationPassed.pem = pem;
      }
      console.log("verification done: success!");
      return verificationPassed;
    });
  } catch (err) {
    throw err;
  }
};

// wrap all segments with xray
app.use(XRayExpress.openSegment(`FargateJwtApp_v${appVersion}`));

//Define request response in root URL (/)
app.get("/status", function (req, res) {
  let timestamp = new Date(new Date().toUTCString());
  res
    .status(200)
    .send({ status: "verification service is healthy!", timestamp });
});

//Define request response in root URL (/)
app.post("/verify", async (req, res, next) => {
  console.log("processing POST request", req.body);
  try {
    const { issuer = "none" } = req.body.identity;
    const { authorization = "none" } = req.body.request.headers || null;

    if (!jwkCached) jwkCached = await GetJwk(issuer);
    const verify = await VerifyJwt(jwkCached, authorization);
    console.log("verify output: ", verify);
    res.status(200).send(verify);
  } catch (err) {
    res
      .status(401)
      .send({ result: "something went wrong in jwt verification", err });
  }
});

app.use(XRayExpress.closeSegment());

app.listen(8080, () => console.log("app v1.1.1 listening on port 8080!"));
