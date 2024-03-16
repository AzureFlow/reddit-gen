import * as constants from "./constants.js";
import fetch, {HeadersInit} from "node-fetch";
import {createHmac, randomUUID} from "crypto";
import {Agent} from "https";


const ACCOUNT_API_ROOT = "https://accounts.reddit.com/api";


export async function makeRequest({uri, body, clientVendorID, proxyAgent = undefined}: {
    uri: string,
    body: object,
    clientVendorID: string,
    proxyAgent: Agent | undefined,
}) {
    const encodedBody = JSON.stringify(body);
    const now = Date.now() / 1000 | 0;

    const signedBody = getSignedBody(now, encodedBody);
    const signedResult = getSignedResult(now, clientVendorID);

    const accountResp = await fetch(ACCOUNT_API_ROOT + uri, {
        method: "POST",
        body: encodedBody,
        headers: {
            "x-hmac-signed-body": signedBody,
            "x-hmac-signed-result": signedResult,
            "x-reddit-retry": "algo=no-retries",
            "user-agent": constants.USER_AGENT,
            "x-reddit-compression": "1",
            "x-reddit-qos": "down-rate-mbps=3.200",
            "x-reddit-media-codecs": "available-codecs=",
            "content-type": "application/json; charset=UTF-8",
            "client-vendor-id": clientVendorID,
        },
        agent: proxyAgent,
    });

    if (!accountResp.ok) {
        throw new Error("API Error: " + await accountResp.text());
    }

    const content = (await accountResp.json()) as LoginRegisterResponse;
    if (!content.success) {
        throw new Error(`Account error!: ${content.error?.reason} ("${content.error?.explanation}")`);
    }

    return {
        response: accountResp,
        content,
    };
}

export async function loginAccount({username, password, clientVendorID, proxyAgent = undefined}: {
    username: string,
    password: string,
    clientVendorID: string,
    proxyAgent: Agent | undefined,
}) {
    const {response, content} = await makeRequest({
        uri: "/login",
        body: {
            password,
            username,
        },
        clientVendorID,
        proxyAgent
    });
    content.cookie = decodeURIComponent(response.headers.get("set-cookie")!.split("; ")[0].split("=")[1]);

    return content as LoginRegisterResponse;
}

export async function registerAccount({username, password, clientVendorID, proxyAgent = undefined}: {
    username: string,
    password: string,
    clientVendorID: string,
    proxyAgent: Agent | undefined,
}) {
    const {content} = await makeRequest({
        uri: "/register",
        body: {
            password,
            username,
        },
        clientVendorID,
        proxyAgent
    });

    return content as LoginRegisterResponse;
}

export async function getAccessToken({cookie = "", clientVendorID, proxyAgent = undefined}: {
    cookie: string,
    clientVendorID: string,
    proxyAgent: Agent | undefined,
}) {
    const headers: HeadersInit = {
        "authorization": `Basic ${constants.API_AUTH}`,
        "x-reddit-retry": "algo=no-retries",
        "user-agent": constants.USER_AGENT,
        "x-reddit-compression": "1",
        "x-reddit-qos": "down-rate-mbps=3.200",
        "x-reddit-media-codecs": "available-codecs=",
        "content-type": "application/json; charset=UTF-8",
        "client-vendor-id": clientVendorID,
    };

    // Empty cookie = guest token
    if (cookie) {
        headers["cookie"] = "reddit_session=" + encodeURIComponent(cookie);
    }

    const tokenResp = await fetch(ACCOUNT_API_ROOT + "/access_token", {
        method: "POST",
        body: JSON.stringify({
            scopes: [
                "*",
                "email",
                "pii",
            ],
        }),
        headers: headers,
        agent: proxyAgent,
    });

    if (!tokenResp.ok) {
        throw new Error(await tokenResp.text());
    }

    return (await tokenResp.json()) as AuthResponse;
}

function getSignedBody(now: number, body: string) {
    const signedBody = createHmac("sha256", constants.SECRET_KEY)
        .update(`Epoch:${now}|Body:${body}`)
        .digest("hex");
    return `1:android:2:${now}:${signedBody}`;
}

function getSignedResult(now: number, clientVendorID: string) {
    const signedResult = createHmac("sha256", constants.SECRET_KEY)
        .update(`Epoch:${now}|User-Agent:${constants.USER_AGENT}|Client-Vendor-ID:${clientVendorID}`)
        .digest("hex");
    return `1:android:2:${now}:${signedResult}`;
}

export function createDeviceId() {
    return randomUUID();
}


interface APIError {
    reason: string;
    explanation: string;
}

interface LoginRegisterResponse {
    success: boolean;
    cookie: string;
    modhash: string;
    userId: string;
    error?: APIError;
}

interface AuthResponse {
    access_token: string;
    expiry_ts: number;
    expires_in: number;
    scope: keyof typeof Scopes[];
    token_type: string;
    error?: APIError;
}

enum Scopes {
    "*",
    "email",
    "pii",
}