import "dotenv/config";
import {HttpsProxyAgent} from "https-proxy-agent";
import {faker} from "@faker-js/faker";
import * as account from "./account_api.js";
import {getProfile} from "./oauth_api.js";


process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
const proxyAgent = new HttpsProxyAgent(process.env["TESTING_PROXY"] as string);


const username = `${faker.person.firstName()}_${faker.person.lastName()}${faker.string.numeric(5)}`.substring(0, 20);
// const email = username + "@example.com";
const password = faker.internet.password() + "1!";
const clientVendorID = account.createDeviceId();

console.log("user:", {
    // email,
    username,
    password,
    redditDeviceId: clientVendorID,
});

const registerContent = await account.registerAccount({
    // email,
    username,
    password,
    clientVendorID,
    proxyAgent,
});
const cookie = registerContent.cookie;
console.log("registerContent:", registerContent);

const auth = await account.getAccessToken({
    cookie,
    clientVendorID,
    proxyAgent,
});
const accessToken = auth.access_token;
console.log("auth:", auth);

const profileContent = await getProfile({
    accessToken,
    clientVendorID,
    proxyAgent,
});
console.log("profileContent:", profileContent);

// const loginResp = await account.loginAccount({
//     username,
//     password,
//     clientVendorID,
//     proxyAgent,
// });
// console.log(loginResp);
