import fetch from "node-fetch";
import {DEVICE_NAME, USER_AGENT} from "./constants.js";
import GQL_FIELDS from "./gql_operations.js";
import {Agent} from "https";
import {createDeviceId} from "./account_api.js";


// export const GQL_ENDPOINT = "https://gql.reddit.com/"; // old
export const GQL_ENDPOINT = "https://gql-fed.reddit.com/";


async function makeRequest({accessToken, clientVendorID = undefined, body, proxyAgent = undefined}: {
    accessToken: string,
    clientVendorID: string | undefined,
    body: object,
    proxyAgent: Agent | undefined,
}) {
    if (!clientVendorID) {
        clientVendorID = createDeviceId();
    }

    const resp = await fetch(GQL_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            // "x-reddit-retry": "algo=no-retries",
            // "x-reddit-compression": "1",
            // "x-reddit-qos": "down-rate-mbps=3.200",
            // "x-reddit-media-codecs": "available-codecs=",
            "authorization": `Bearer ${accessToken}`,
            "client-vendor-id": clientVendorID,
            "x-reddit-device-id": clientVendorID,
            "user-agent": USER_AGENT,
            "x-dev-ad-id": "",
            "device-name": DEVICE_NAME,
            "x-reddit-dpr": "2.0",
            "x-reddit-width": "720",
            // "x-reddit-loid": "",
            // "x-reddit-session": "",
            "accept-language": "en,en;q=0.9",
            "content-type": "application/json; charset=utf-8",
        },
        agent: proxyAgent,
    });

    return resp.json();
}

export async function comment({accessToken, clientVendorID, message, postId, proxyAgent = undefined}: {
    accessToken: string,
    clientVendorID: string,
    message: string,
    postId: string,
    proxyAgent: Agent | undefined
}) {
    return makeRequest({
        accessToken,
        clientVendorID,
        body: {
            id: GQL_FIELDS.CreateComment.id,
            variables: {
                includeAwards: false,
                input: {
                    content: {
                        markdown: message,
                    },
                    postId: postId,
                },
            },
        },
        proxyAgent,
    });
}